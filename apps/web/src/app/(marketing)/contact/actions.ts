"use server";

import { z } from "zod";
import { audit, requestContext } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { checkHuman } from "@/lib/bot-defense";
import { sanitizeLine, sanitizeUserText } from "@/lib/sanitize";
import { contactEmail, securityReportEmail, send } from "@/lib/mail";
import { inboxFor } from "@/lib/org-email";

/*
 * The contact and responsible-disclosure forms (Phase 10, Task 11).
 *
 * WHAT WAS HERE BEFORE: nothing. /contact was two `mailto:` links and the
 * sentence "an in-platform contact form arrives with our next release", and the
 * security policy page offered only an address. The brief requires that contact
 * and security-report emails deliver, so the forms had to exist first.
 *
 * ⚠ NO DATABASE WRITE, AND THAT IS DELIBERATE. The brief freezes the Prisma
 * schema, so these submissions are delivered as email and recorded in MailLog
 * (which `send` writes for every attempt) rather than stored in a new table. The
 * consequence is worth stating plainly: if delivery fails, the message is not
 * retained anywhere else — the failure is recorded and surfaces in Access
 * Control, but the text is gone. Adding a `ContactMessage` model would fix that
 * and is the obvious follow-up once a schema change is allowed.
 *
 * Everything else follows the Phase 4 rules for public input exactly as the
 * collaboration form does: per-IP rate limit, honeypot + signed timing token
 * (no third-party CAPTCHA, because that is a tracker), zod validation, and
 * sanitisation on the way out so nothing user-supplied can carry markup or a
 * protocol into the message body.
 */

export type SubmitState = { error?: string; ok?: boolean };

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").toLowerCase(),
  org: z.string().trim().max(120).optional(),
  subject: z.string().trim().min(3, "Please give your message a subject").max(150),
  message: z
    .string()
    .trim()
    .min(20, "Please tell us a little more (at least 20 characters)")
    .max(4000),
});

export async function submitContactAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const { ip, userAgent } = await requestContext();

  // 3 submissions / 10 min / IP — the same budget the collaboration form uses.
  if (!rateLimit(`contact:${ip ?? "unknown"}`, 3, 10 * 60_000)) {
    return { error: "Too many messages. Please try again later." };
  }

  const human = checkHuman(formData);
  if (!human.ok) {
    await audit("contact.bot_blocked", { detail: human.reason, ip, userAgent });
    // Deliberately identical to success: never tell a bot why it failed.
    return { ok: true };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    org: formData.get("org") || undefined,
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const clean = {
    name: sanitizeLine(parsed.data.name, 100),
    email: sanitizeLine(parsed.data.email, 200),
    org: parsed.data.org ? sanitizeLine(parsed.data.org, 120) : null,
    subject: sanitizeLine(parsed.data.subject, 150),
    message: sanitizeUserText(parsed.data.message, 4000),
  };

  const mail = contactEmail(clean);
  const result = await send(
    inboxFor("contact"),
    mail.subject,
    mail.body,
    "contact",
    clean.email, // Reply-To — replying in the inbox reaches the sender
  );

  await audit("contact.submitted", {
    // The message body is NOT audited. `audit.read` is a wider circle than the
    // inbox, and the audit log is not the place to duplicate someone's message.
    detail: `from ${clean.email}${result.ok ? "" : " (delivery failed)"}`,
    ip,
    userAgent,
  });

  if (!result.ok) {
    // With no database row behind it, a failed send means the message is gone —
    // so unlike the collaboration form, this one must not claim success.
    return {
      error:
        "We could not deliver your message. Please email us directly at " +
        `${inboxFor("contact")} and we will pick it up there.`,
    };
  }

  return { ok: true };
}

/* ---------- responsible disclosure ---------- */

const SEVERITIES = ["critical", "high", "medium", "low", "unsure"] as const;

const securitySchema = z.object({
  // Anonymous disclosure is permitted: a researcher who does not want to
  // identify themselves must still be able to tell us about a vulnerability.
  reporter: z.string().trim().max(100).optional(),
  email: z
    .union([z.string().trim().email("Please enter a valid email").toLowerCase(), z.literal("")])
    .optional(),
  affected: z
    .string()
    .trim()
    .min(3, "Which product, page or endpoint is affected?")
    .max(200),
  severity: z.enum(SEVERITIES),
  message: z
    .string()
    .trim()
    .min(40, "Please include enough detail to reproduce the issue (at least 40 characters)")
    .max(8000),
});

export async function submitSecurityReportAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const { ip, userAgent } = await requestContext();

  /*
   * A more generous limit than the other public forms: 5 in 10 minutes. Someone
   * working through a genuine finding may legitimately send a correction or a
   * second report straight after the first, and the cost of turning away a real
   * vulnerability report is far higher than the cost of a few extra emails.
   */
  if (!rateLimit(`security-report:${ip ?? "unknown"}`, 5, 10 * 60_000)) {
    return { error: "Too many reports. Please try again shortly." };
  }

  const human = checkHuman(formData);
  if (!human.ok) {
    await audit("security_report.bot_blocked", { detail: human.reason, ip, userAgent });
    return { ok: true };
  }

  const parsed = securitySchema.safeParse({
    reporter: formData.get("reporter") || undefined,
    email: formData.get("email") || undefined,
    affected: formData.get("affected"),
    severity: formData.get("severity"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const clean = {
    reporter: parsed.data.reporter ? sanitizeLine(parsed.data.reporter, 100) : null,
    email: parsed.data.email ? sanitizeLine(parsed.data.email, 200) : null,
    affected: sanitizeLine(parsed.data.affected, 200),
    severity: parsed.data.severity,
    message: sanitizeUserText(parsed.data.message, 8000),
  };

  const mail = securityReportEmail(clean);
  const result = await send(
    inboxFor("security"),
    mail.subject,
    mail.body,
    "security-report",
    clean.email ?? undefined,
  );

  await audit("security_report.submitted", {
    // Severity and target only. The report body describes an unfixed
    // vulnerability in our own product; it belongs in the security inbox, not
    // in a log that more people can read than can act on it.
    detail: `${clean.severity} · ${clean.affected}${result.ok ? "" : " (delivery failed)"}`,
    ip,
    userAgent,
  });

  if (!result.ok) {
    return {
      error:
        "We could not deliver your report, and we do not want to lose it. Please " +
        `email ${inboxFor("security")} directly — it reaches the same people.`,
    };
  }

  return { ok: true };
}

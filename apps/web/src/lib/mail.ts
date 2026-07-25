import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "./db";
import { appUrl } from "./mailer";
import { mailFrom } from "./org-email";

/*
 * Transactional email (Phase 7.2).
 *
 * One interface for every message the platform sends — invitations, verification,
 * password resets, incident notices. It wraps the Phase 2.1 sender and adds the
 * three things that were missing: a real dev outbox, a delivery record, and a rate
 * limit.
 *
 * PRIVACY, AND WHY THERE IS NO HTML EMAIL HERE:
 *
 *   A tracking pixel is a tracker. A click-tracking redirect is a tracker. A
 *   remote image in an email is a tracker — it reports that you opened it, when,
 *   and from roughly where, and it does so before you have agreed to anything.
 *   `npm run check:trackers` enforces that promise in the browser; the promise
 *   does not stop at the browser. These emails are plain text, contain no images,
 *   and link directly to the destination — never through a redirector that counts
 *   the click.
 *
 * WHAT IS NOT STORED: the body. An invitation or reset email contains a live
 * credential; writing it into MailLog would put credentials in a table that is not
 * treated as one. We record who it went to, what it was, and whether it left.
 */

const OUTBOX = path.join(process.cwd(), "storage", "outbox");

export type MailKind =
  | "invitation"
  | "verify-email"
  | "reset-password"
  | "alert"
  | "notice"
  /* Phase 10, Task 11: public submissions that must actually reach a person. */
  | "contact"
  | "security-report"
  | "collaboration"
  | "abuse-report";

/* Rate limit: per-recipient, in-process. Not a substitute for the provider's own
 * limits — it exists so a loop in our code cannot mail-bomb someone, which is a
 * thing we would be doing TO a person, not something being done to us. */
const recent = new Map<string, number[]>();
const WINDOW_MS = 60 * 60_000;
const MAX_PER_HOUR = 10;

function rateLimited(to: string): boolean {
  const now = Date.now();
  const hits = (recent.get(to) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_HOUR) {
    recent.set(to, hits);
    return true;
  }
  hits.push(now);
  recent.set(to, hits);
  return false;
}

export type SendResult = { ok: boolean; status: string; error?: string };

/**
 * Send, and RECORD THE OUTCOME. A failed invitation that vanishes into a log file
 * is an invitation the Founder believes they sent — so every attempt lands in
 * MailLog and failures surface in the workspace.
 *
 * Never throws: mail must not break the action that triggered it. The caller finds
 * out by reading the result, and the Founder finds out by reading the page.
 */
export async function send(
  to: string,
  subject: string,
  body: string,
  kind: MailKind,
  /*
   * Optional Reply-To (Phase 10, Task 11).
   *
   * Public form submissions are delivered FROM our own no-reply address — that
   * is what the sending domain is verified for, and forging the visitor's
   * address as the sender is what SPF and DMARC exist to reject. Reply-To is the
   * correct header for "the human who wrote this", and it means hitting reply in
   * the shared inbox actually reaches them.
   *
   * It is passed as JSON to the provider's API, not concatenated into a raw SMTP
   * header, so newline-based header injection is not reachable here. It is
   * nonetheless validated at every call site (zod `.email()`) before arriving.
   */
  replyTo?: string,
): Promise<SendResult> {
  const recipient = to.trim().toLowerCase();

  if (rateLimited(recipient)) {
    await record(recipient, subject, kind, "FAILED", "Rate limit: too many emails to this address.");
    return { ok: false, status: "FAILED", error: "Too many emails to this address — try again later." };
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    /*
     * PRODUCTION WITHOUT A MAIL PROVIDER IS A FAILURE, AND MUST SAY SO
     * (Phase 10, Task 11).
     *
     * This used to fall through to the dev outbox unconditionally and return
     * `{ ok: true }`. In production that meant: the Founder invites an employee,
     * the UI says the invitation was sent, MailLog records a cheerful
     * "DEV_OUTBOX", and the invitation is written to a file on an ephemeral
     * serverless filesystem that nobody will ever read. Nothing anywhere reports
     * a problem. The employee simply never hears from us, and the only person
     * who could notice has been told it worked.
     *
     * A missing provider in production is now a hard, recorded failure. The
     * outbox remains exactly what it always was — a local development
     * convenience — and nothing else.
     */
    if (process.env.NODE_ENV === "production") {
      const error =
        "No mail provider configured: RESEND_API_KEY is not set in this environment.";
      await record(recipient, subject, kind, "FAILED", error);
      return {
        ok: false,
        status: "FAILED",
        error: "Email could not be sent — the mail provider is not configured.",
      };
    }

    // Local dev: write the message to a real outbox file so the whole flow —
    // including the link in it — is testable without sending mail.
    try {
      await mkdir(OUTBOX, { recursive: true });
      const name = `${Date.now()}-${kind}-${recipient.replace(/[^a-z0-9]+/g, "-")}.txt`;
      await writeFile(
        path.join(OUTBOX, name),
        `To: ${recipient}\nSubject: ${subject}\nKind: ${kind}\nDate: ${new Date().toISOString()}\n\n${body}\n`,
      );
      await record(recipient, subject, kind, "DEV_OUTBOX");
      return { ok: true, status: "DEV_OUTBOX" };
    } catch (err) {
      const error = err instanceof Error ? err.message : "outbox write failed";
      await record(recipient, subject, kind, "FAILED", error);
      return { ok: false, status: "FAILED", error };
    }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // The From: address comes from lib/org-email.ts — one place, not a
        // default buried in a `??` in two different modules (Task 12).
        from: mailFrom(),
        to: recipient,
        subject,
        text: body, // plain text only — see the note at the top of this file
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const error = `${res.status} ${await res.text()}`.slice(0, 300);
      await record(recipient, subject, kind, "FAILED", error);
      return { ok: false, status: "FAILED", error };
    }
    await record(recipient, subject, kind, "SENT");
    return { ok: true, status: "SENT" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "send failed";
    await record(recipient, subject, kind, "FAILED", error);
    return { ok: false, status: "FAILED", error };
  }
}

async function record(
  to: string,
  subject: string,
  kind: MailKind,
  status: string,
  error?: string,
) {
  await db.mailLog
    .create({ data: { to, subject, kind, status, error: error?.slice(0, 500) } })
    .catch(() => null); // recording a send must not break the send
}

/** Deliveries that did not happen. Surfaced in Access Control, not buried in a log. */
export async function failedMail(take = 10) {
  return db.mailLog.findMany({
    where: { status: "FAILED" },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/* ---------- templates ---------- */

/*
 * Public-submission notifications (Phase 10, Task 11).
 *
 * These close a real gap rather than adding a feature. Collaboration requests and
 * abuse reports were written to the database and the audit log and then TOLD
 * NOBODY — there was no send() call anywhere in either action. A report of abuse
 * sat in a table until somebody happened to open the right page. The contact page
 * had no form at all; it listed two mailto: links and a promise that a form was
 * coming in a future release.
 *
 * The bodies below are plain text, carry no links back through a redirector, and
 * embed no images — the same rules as every other message this platform sends.
 * The submitter's own words are included because that IS the message; they are
 * sanitised on the way in (lib/sanitize.ts) at every call site.
 */

function submissionBody(
  intro: string,
  fields: [string, string | null | undefined][],
  message: string,
): string {
  return [
    intro,
    "",
    ...fields.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    "---",
    message,
    "---",
    "",
    "Reply directly to this email to answer the sender.",
  ].join("\n");
}

export function contactEmail(opts: {
  name: string;
  email: string;
  org?: string | null;
  subject: string;
  message: string;
}): { subject: string; body: string } {
  return {
    subject: `[Contact] ${opts.subject}`,
    body: submissionBody(
      "A message was submitted through the contact form on edusentinel.ai.",
      [
        ["From", opts.name],
        ["Email", opts.email],
        ["Organisation", opts.org],
      ],
      opts.message,
    ),
  };
}

export function securityReportEmail(opts: {
  reporter?: string | null;
  email?: string | null;
  affected: string;
  severity: string;
  message: string;
}): { subject: string; body: string } {
  return {
    // The severity is in the subject so triage can happen in the inbox list,
    // before anyone opens anything.
    subject: `[Security report — ${opts.severity}] ${opts.affected}`,
    body: submissionBody(
      "A vulnerability was reported through the responsible-disclosure form on\n" +
        "edusentinel.ai. The 90-day coordinated window starts from this message.",
      [
        ["Reporter", opts.reporter || "anonymous"],
        ["Email", opts.email || "not provided — no reply is possible"],
        ["Affected", opts.affected],
        ["Reported severity", opts.severity],
      ],
      opts.message,
    ),
  };
}

export function collaborationEmail(opts: {
  name: string;
  email: string;
  org?: string | null;
  kind: string;
  message: string;
}): { subject: string; body: string } {
  return {
    subject: `[Collaboration — ${opts.kind}] ${opts.name}`,
    body: submissionBody(
      "A collaboration request was submitted on edusentinel.ai.",
      [
        ["From", opts.name],
        ["Email", opts.email],
        ["Organisation", opts.org],
        ["Type", opts.kind],
      ],
      opts.message,
    ),
  };
}

export function abuseReportEmail(opts: {
  targetType: string;
  targetRef?: string | null;
  reporter?: string | null;
  reason: string;
}): { subject: string; body: string } {
  return {
    subject: `[Abuse report] ${opts.targetType}`,
    body: submissionBody(
      "An abuse report was submitted on edusentinel.ai.",
      [
        ["Target type", opts.targetType],
        ["Reference", opts.targetRef],
        ["Reporter", opts.reporter || "anonymous"],
      ],
      opts.reason,
    ),
  };
}

export function invitationEmail(opts: {
  token: string;
  roleLabel: string;
  inviter: string;
  company: string;
  message?: string | null;
  expiresAt: Date;
}): { subject: string; body: string } {
  const link = appUrl(`/accept-invite?token=${opts.token}`);
  return {
    subject: `You've been invited to ${opts.company}`,
    body: [
      `${opts.inviter} has invited you to join ${opts.company} as ${opts.roleLabel}.`,
      opts.message ? `\n"${opts.message}"\n` : "",
      `Accept the invitation and set your password:`,
      link,
      ``,
      `This link works once and expires on ${opts.expiresAt.toUTCString()}.`,
      `If you were not expecting this, you can ignore it — no account is created`,
      `until the link is used.`,
      ``,
      `— ${opts.company}`,
    ]
      .filter((l) => l !== "")
      .join("\n"),
  };
}

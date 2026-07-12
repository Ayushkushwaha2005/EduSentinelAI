"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { checkHuman } from "@/lib/bot-defense";
import { sanitizeLine, sanitizeUserText } from "@/lib/sanitize";

export type SubmitState = { error?: string; ok?: boolean };

const KINDS = ["partnership", "contributor", "research", "other"] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").toLowerCase(),
  org: z.string().trim().max(120).optional(),
  kind: z.enum(KINDS),
  message: z
    .string()
    .trim()
    .min(20, "Please tell us a little more (at least 20 characters)")
    .max(4000),
});

export async function submitCollaborationAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const { ip, userAgent } = await requestContext();

  // Rate limit: 3 submissions / 10 min / IP.
  if (!rateLimit(`collab:${ip ?? "unknown"}`, 3, 10 * 60_000)) {
    return { error: "Too many submissions. Please try again later." };
  }

  // Bot defense gate (honeypot + signed timing token).
  const human = checkHuman(formData);
  if (!human.ok) {
    await audit("collaboration.bot_blocked", { detail: human.reason, ip, userAgent });
    // Deliberately identical to success: never tell a bot why it failed.
    return { ok: true };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    org: formData.get("org") || undefined,
    kind: formData.get("kind"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Sanitize on write: stored text can never carry markup or protocols.
  const request = await db.collaborationRequest.create({
    data: {
      name: sanitizeLine(parsed.data.name, 100),
      email: sanitizeLine(parsed.data.email, 200),
      org: parsed.data.org ? sanitizeLine(parsed.data.org, 120) : null,
      kind: parsed.data.kind,
      message: sanitizeUserText(parsed.data.message, 4000),
      ip,
    },
  });

  await audit("collaboration.submitted", {
    detail: `${request.kind} from ${request.email}`,
    ip,
    userAgent,
  });
  return { ok: true };
}

const reportSchema = z.object({
  targetType: z.enum(["collaboration", "release", "other"]),
  targetRef: z.string().trim().max(300).optional(),
  reason: z.string().trim().min(10, "Please describe the problem").max(2000),
  reporter: z.string().trim().max(200).optional(),
});

/** Public abuse-report path (Phase 4 gate). */
export async function submitAbuseReportAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const { ip, userAgent } = await requestContext();
  if (!rateLimit(`abuse:${ip ?? "unknown"}`, 5, 10 * 60_000)) {
    return { error: "Too many reports. Please try again later." };
  }
  const human = checkHuman(formData);
  if (!human.ok) {
    await audit("abuse.bot_blocked", { detail: human.reason, ip, userAgent });
    return { ok: true };
  }

  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetRef: formData.get("targetRef") || undefined,
    reason: formData.get("reason"),
    reporter: formData.get("reporter") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.abuseReport.create({
    data: {
      targetType: parsed.data.targetType,
      targetRef: parsed.data.targetRef ? sanitizeLine(parsed.data.targetRef, 300) : null,
      reason: sanitizeUserText(parsed.data.reason, 2000),
      reporter: parsed.data.reporter ? sanitizeLine(parsed.data.reporter, 200) : null,
      ip,
    },
  });
  await audit("abuse.reported", {
    detail: `${parsed.data.targetType}`,
    ip,
    userAgent,
  });
  return { ok: true };
}

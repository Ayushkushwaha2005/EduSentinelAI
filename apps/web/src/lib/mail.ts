import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "./db";
import { appUrl } from "./mailer";

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
  | "notice";

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
): Promise<SendResult> {
  const recipient = to.trim().toLowerCase();

  if (rateLimited(recipient)) {
    await record(recipient, subject, kind, "FAILED", "Rate limit: too many emails to this address.");
    return { ok: false, status: "FAILED", error: "Too many emails to this address — try again later." };
  }

  const apiKey = process.env.RESEND_API_KEY;

  // No provider configured (local dev): write the message to a real outbox file so
  // the whole flow — including the link in it — is testable without sending mail.
  if (!apiKey) {
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
        from: process.env.MAIL_FROM ?? "EduSentinel AI <no-reply@edusentinel.ai>",
        to: recipient,
        subject,
        text: body, // plain text only — see the note at the top of this file
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

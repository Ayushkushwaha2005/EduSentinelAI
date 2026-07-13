import { headers } from "next/headers";
import { db } from "./db";
import { sha256 } from "./crypto";
import { sendMail } from "./mailer";

export type AuditContext = { ip?: string; userAgent?: string };

/** Extract client IP + user agent from the current request headers. */
export async function requestContext(): Promise<AuditContext> {
  try {
    const h = await headers();
    return {
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      userAgent: h.get("user-agent") ?? undefined,
    };
  } catch {
    return {};
  }
}

/* R7b: privileged events that fire a second-channel alert to the founder. */
const ALERT_ACTIONS = new Set([
  "admin.role_change",
  "admin.role_change_denied",
  "release.published",
  "release.revoked",
  "release.rejected",
  "user.sessions_revoked",
]);

/**
 * Append-only, tamper-evident audit trail (Phase 2 + hardened in 2.1/3).
 * Each row's hash commits to the previous row's hash (R7b) — deleting or
 * editing any row breaks the chain, detectable via scripts/verify-audit.
 * Never throws: an audit failure must not break the user action.
 */
export async function audit(
  action: string,
  opts: { actorId?: string; detail?: string } & AuditContext = {},
) {
  try {
    // Snapshot the actor's email as it is right now. The audit log holds no
    // foreign key to User (see schema): it must outlive the account and must
    // never be rewritten when that account is deleted, because the hash commits
    // to actorId and any such rewrite would break the chain and read as tampering.
    const actorEmail = opts.actorId
      ? (
          await db.user.findUnique({
            where: { id: opts.actorId },
            select: { email: true },
          })
        )?.email
      : undefined;

    await db.$transaction(async (tx) => {
      const prev = await tx.auditLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: { hash: true },
      });
      const createdAt = new Date();
      const prevHash = prev?.hash ?? "genesis";
      const hash = sha256(
        [
          prevHash,
          action,
          opts.actorId ?? "",
          opts.detail ?? "",
          opts.ip ?? "",
          opts.userAgent ?? "",
          createdAt.toISOString(),
        ].join("|"),
      );
      await tx.auditLog.create({
        data: {
          action,
          actorId: opts.actorId,
          // Display-only snapshot. Deliberately NOT part of the hash: the chain
          // already commits to actorId, and adding a field would invalidate
          // every hash written before this change.
          actorEmail,
          detail: opts.detail,
          ip: opts.ip,
          userAgent: opts.userAgent,
          createdAt,
          prevHash,
          hash,
        },
      });
    });
  } catch (err) {
    console.error(`[audit] FAILED to record "${action}":`, err);
  }

  if (ALERT_ACTIONS.has(action)) {
    const to = process.env.ALERT_EMAIL;
    if (to) {
      // Fire-and-forget; alerts must never block or fail the action.
      void sendMail(
        to,
        `[EduSentinel alert] ${action}`,
        `Privileged event: ${action}\nActor: ${opts.actorId ?? "-"}\nDetail: ${opts.detail ?? "-"}\nIP: ${opts.ip ?? "-"}\nTime: ${new Date().toISOString()}`,
      ).catch(() => {});
    }
  }
}

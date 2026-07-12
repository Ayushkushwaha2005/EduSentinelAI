import { headers } from "next/headers";
import { db } from "./db";

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

/**
 * Append-only audit trail for privileged/security-relevant actions
 * (Phase 2 requirement, enriched in Phase 2.1 with IP/UA). Never throws —
 * an audit failure must not break the user action, but it is logged loudly.
 */
export async function audit(
  action: string,
  opts: { actorId?: string; detail?: string } & AuditContext = {},
) {
  try {
    await db.auditLog.create({
      data: {
        action,
        actorId: opts.actorId,
        detail: opts.detail,
        ip: opts.ip,
        userAgent: opts.userAgent,
      },
    });
  } catch (err) {
    console.error(`[audit] FAILED to record "${action}":`, err);
  }
}

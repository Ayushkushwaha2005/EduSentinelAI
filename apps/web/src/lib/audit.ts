import { db } from "./db";

/**
 * Append-only audit trail for privileged/security-relevant actions
 * (Phase 2 requirement: audit log from day one). Never throws — an audit
 * failure must not break the user action, but it is logged loudly.
 */
export async function audit(
  action: string,
  opts: { actorId?: string; detail?: string } = {},
) {
  try {
    await db.auditLog.create({
      data: { action, actorId: opts.actorId, detail: opts.detail },
    });
  } catch (err) {
    console.error(`[audit] FAILED to record "${action}":`, err);
  }
}

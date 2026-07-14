import { db } from "./db";
import { sanitizeLine } from "./sanitize";

/*
 * Notifications (Phase 9).
 *
 * One event bus, and one rule that everything else follows from:
 *
 *   A NOTIFICATION MUST NOT CARRY WHAT ITS RECIPIENT COULD NOT ALREADY OPEN.
 *
 * That sounds obvious and is routinely broken, because a notification is written
 * at the moment an event happens — when the *actor's* data is in hand, not the
 * recipient's. So "Priya requested leave: hospital appointment" writes a medical
 * fact into a row that a manager, an HR lead and a digest email will all read.
 * Phase 8 spent its whole budget keeping that string inside the approver chain;
 * a careless notification would hand it out anyway.
 *
 * Therefore, by construction:
 *   - The payload is a TITLE, a line of CONTEXT, and a LINK. Nothing else.
 *   - The link is an internal /app path, and the page behind it RE-CHECKS
 *     server-side (lib/guard.ts). The notification is a doorbell, not a door.
 *   - `notify()` refuses to write a body longer than a sentence, because the
 *     temptation to paste the record in is exactly what we are guarding against.
 *   - Nothing in `notifyEvent()` below ever passes a leave reason, a support
 *     body, an attendance note, or an email address. Read them: they pass a name
 *     and a count.
 *
 * The R7b second-channel alerts for privileged events stay SEPARATE and
 * unmuteable (lib/audit.ts). This system is for ordinary work; that one is for
 * "someone signed a release at 3am", and you do not get to turn it off.
 */

export const NOTIFICATION_KINDS = [
  "leave.pending",
  "leave.decided",
  "attendance.correction_pending",
  "attendance.correction_decided",
  "support.raised",
  "support.replied",
  "support.assigned",
  "support.resolved",
  "invite.accepted",
  "release.quarantined",
  "broadcast",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Internal /app paths only. A notification can never be a way out of the site. */
export function safeNotificationHref(input: unknown): string | null {
  if (typeof input !== "string") return null;
  if (!/^\/app(\/[\w\-/?=&.]*)?$/.test(input)) return null;
  if (input.startsWith("//")) return null;
  return input;
}

/**
 * Write one notification. Never throws: a notification failing must not roll back
 * the action that earned it — nobody's leave request should fail because a bell
 * did not ring.
 */
export async function notify(opts: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
}): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: opts.userId,
        kind: opts.kind,
        title: sanitizeLine(opts.title, 120),
        // A sentence, not a record. The cap is the guardrail: if a caller is
        // trying to fit the contents of a leave request in here, it will not fit.
        body: opts.body ? sanitizeLine(opts.body, 160) : null,
        href: safeNotificationHref(opts.href),
      },
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

/** Notify several people at once (an approver pool, the staff). */
export async function notifyMany(
  userIds: string[],
  opts: Omit<Parameters<typeof notify>[0], "userId">,
): Promise<void> {
  const unique = [...new Set(userIds)];
  await Promise.all(unique.map((userId) => notify({ ...opts, userId })));
}

/**
 * Everyone who holds a capability — the audience for "a leave request is waiting"
 * or "a support request came in".
 *
 * It resolves the capability the same way authorization does (role defaults ±
 * live grants, reserved stripped), so the people who are *told* about work are
 * exactly the people who can *do* it. A separate list would drift.
 */
export async function holdersOf(capability: string): Promise<string[]> {
  const { effectiveCapabilities } = await import("./permissions");
  const users = await db.user.findMany({
    where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
    select: { id: true },
  });

  const holders: string[] = [];
  for (const u of users) {
    const caps = await effectiveCapabilities(u.id);
    if (caps.has(capability as never)) holders.push(u.id);
  }
  return holders;
}

/* ---------- reads ---------- */

export async function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function recentNotifications(userId: string, take = 20) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/*
 * Marking read is scoped to the viewer — `where: { userId }`, always. It looks
 * trivial, and it is exactly the kind of endpoint that ends up taking an id from
 * the request and marking someone else's notifications read.
 */
export async function markRead(userId: string, id?: string): Promise<void> {
  await db.notification.updateMany({
    where: id ? { id, userId, readAt: null } : { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

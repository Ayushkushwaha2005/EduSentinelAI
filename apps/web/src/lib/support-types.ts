/*
 * Support constants — deliberately DATABASE-FREE.
 *
 * The client forms need the category, priority and status lists. If they imported
 * them from lib/support.ts, they would drag `db` — and therefore Prisma — into the
 * browser bundle. That broke the site once already (Phase 6.5), and the lesson
 * stuck: a client component has no business being able to reach the database, so
 * the pure lists live here and everything that queries stays server-side.
 */

export const CATEGORIES = ["access", "bug", "billing", "security", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SUPPORT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}
export function isPriority(v: unknown): v is Priority {
  return typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);
}
export function isSupportStatus(v: unknown): v is SupportStatus {
  return typeof v === "string" && (SUPPORT_STATUSES as readonly string[]).includes(v);
}

/** SLA targets, in hours to first response. Measured, never merely promised. */
export const SLA_HOURS: Record<Priority, number> = {
  URGENT: 4,
  HIGH: 12,
  NORMAL: 48,
  LOW: 96,
};

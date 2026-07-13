/*
 * Role ladder. Order matters: index = rank. Never compare roles with string
 * equality outside this file — use rankOf/outranks so a future role inserted
 * into the ladder cannot silently widen someone's access.
 *
 * SQLite has no enums, so the DB stores these as strings; isRole() is the
 * only trusted way in.
 */
export const ROLES = [
  "USER",
  "COLLABORATOR",
  "EMPLOYEE",
  "ADMIN",
  "CO_FOUNDER",
  "FOUNDER",
] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function rankOf(role: string | undefined): number {
  return isRole(role) ? ROLES.indexOf(role) : -1;
}

/** Strictly above — peers never manage peers (Founder Trust Model). */
export function outranks(actor: string | undefined, target: string | undefined): boolean {
  return rankOf(actor) > rankOf(target) && rankOf(target) >= 0;
}

/** Leadership tier: the operational surfaces (products, releases, moderation). */
export function isAdminRole(role: string | undefined): boolean {
  return rankOf(role) >= rankOf("ADMIN");
}

/** Internal staff — anyone who works at EduSentinel. Excludes USER/COLLABORATOR. */
export function isStaffRole(role: string | undefined): boolean {
  return rankOf(role) >= rankOf("EMPLOYEE");
}

export const ROLE_LABELS: Record<Role, string> = {
  USER: "Member",
  COLLABORATOR: "Collaborator",
  EMPLOYEE: "Employee",
  ADMIN: "Admin",
  CO_FOUNDER: "Co-Founder",
  FOUNDER: "Founder",
};

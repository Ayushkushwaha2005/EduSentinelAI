export const ROLES = ["USER", "EMPLOYEE", "ADMIN", "FOUNDER"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Roles allowed into the admin portal. */
export function isAdminRole(role: string | undefined): boolean {
  return role === "ADMIN" || role === "FOUNDER";
}

import { isRole, type Role } from "./roles";

/*
 * Founder Trust Model — role-change rules (permanent architectural
 * principle, see SECURITY-ROADMAP.md §4):
 *  - FOUNDER is never grantable and never demotable via any endpoint.
 *  - Role granting is one-directional and capped below the grantor:
 *      FOUNDER manages USER/EMPLOYEE/ADMIN; ADMIN manages USER/EMPLOYEE.
 *  - Nobody manages peers or superiors; nobody changes their own role.
 */
const GRANTABLE: Record<string, Role[]> = {
  FOUNDER: ["USER", "EMPLOYEE", "ADMIN"],
  ADMIN: ["USER", "EMPLOYEE"],
};

export function roleChangeError(opts: {
  actorId: string;
  actorRole: string;
  targetId: string;
  targetRole: string;
  newRole: string;
}): string | null {
  const { actorId, actorRole, targetId, targetRole, newRole } = opts;
  if (!isRole(newRole)) return "Invalid role.";
  if (newRole === "FOUNDER") return "The FOUNDER role cannot be granted.";
  if (targetRole === "FOUNDER") return "The FOUNDER account cannot be modified.";
  if (actorId === targetId) return "You cannot change your own role.";
  const grantable = GRANTABLE[actorRole];
  if (!grantable) return "You are not permitted to manage roles.";
  if (!grantable.includes(newRole as Role))
    return "You are not permitted to grant this role.";
  // Actor must also outrank the target's CURRENT role (no managing peers).
  if (!grantable.includes(targetRole as Role))
    return "You are not permitted to manage this account.";
  return null;
}

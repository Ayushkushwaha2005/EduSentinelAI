import { db } from "./db";
import { isRole, rankOf, type Role } from "./roles";

/*
 * Capability layer (Phase 5).
 *
 * Roles decide which dashboard you land on. Capabilities decide what you can
 * actually DO. Effective set = role defaults ± explicit per-person grants made
 * by the Founder.
 *
 * Founder Trust Model (permanent, SECURITY-ROADMAP.md §4): the capabilities in
 * FOUNDER_RESERVED are non-delegable. No grant, no role, no endpoint hands them
 * to anyone but the FOUNDER — enforced here, in the authorization layer, and
 * never merely in the UI.
 */

export const CAPABILITIES = [
  "dashboard.view", // reach /app at all
  "products.view",
  "products.manage", // create/edit products
  "releases.upload", // upload into quarantine
  "releases.review", // scan results, approve/reject
  "releases.publish", // sign + publish  (founder-reserved)
  "releases.revoke", // pull a published artifact  (founder-reserved)
  "collab.view",
  "collab.moderate", // approve/reject collaboration requests, abuse reports
  "team.view",
  "team.manage", // teams, projects, assignments
  "users.view", // account directory
  "users.manage_roles", // change someone's role  (founder-reserved)
  "permissions.grant", // grant/revoke capabilities  (founder-reserved)
  "audit.read",
  "messages.use",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export function isCapability(value: unknown): value is Capability {
  return typeof value === "string" && (CAPABILITIES as readonly string[]).includes(value);
}

/**
 * Non-delegable. These stay with the FOUNDER no matter what any table says —
 * a compromised admin account, a bad migration, or a bug in the grant UI still
 * cannot produce them. This constant is the single point of truth for the
 * Founder Trust Model in the capability system.
 */
export const FOUNDER_RESERVED: readonly Capability[] = [
  "releases.publish",
  "releases.revoke",
  "users.manage_roles",
  "permissions.grant",
];

export function isFounderReserved(cap: Capability): boolean {
  return FOUNDER_RESERVED.includes(cap);
}

/** Default capability set per role. Additive up the ladder, but not implicitly:
 *  each role spells out its own set so a new role cannot inherit by accident. */
const BASE_USER: Capability[] = ["dashboard.view"];

const BASE_COLLABORATOR: Capability[] = [
  ...BASE_USER,
  "collab.view",
  "messages.use",
];

const BASE_EMPLOYEE: Capability[] = [
  ...BASE_USER,
  "messages.use",
  "products.view",
  "team.view",
];

const BASE_ADMIN: Capability[] = [
  ...BASE_EMPLOYEE,
  "products.manage",
  "releases.upload",
  "releases.review",
  "collab.view",
  "collab.moderate",
  "users.view",
  "audit.read",
];

const BASE_CO_FOUNDER: Capability[] = [...BASE_ADMIN, "team.manage"];

// The Founder holds every capability, including the reserved ones.
const BASE_FOUNDER: Capability[] = [...CAPABILITIES];

const ROLE_DEFAULTS: Record<Role, Capability[]> = {
  USER: BASE_USER,
  COLLABORATOR: BASE_COLLABORATOR,
  EMPLOYEE: BASE_EMPLOYEE,
  ADMIN: BASE_ADMIN,
  CO_FOUNDER: BASE_CO_FOUNDER,
  FOUNDER: BASE_FOUNDER,
};

export function defaultCapabilities(role: string | undefined): Capability[] {
  return isRole(role) ? [...ROLE_DEFAULTS[role]] : [];
}

/**
 * The one function that answers "what can this person do?".
 * Reads role defaults, then applies the Founder's explicit grants/revokes,
 * then re-imposes the reserved set. Reserved capabilities are stripped from
 * every non-founder *after* grants are applied, so no row in PermissionGrant
 * can ever escalate.
 */
export async function effectiveCapabilities(userId: string): Promise<Set<Capability>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return new Set();

  const effective = new Set<Capability>(defaultCapabilities(user.role));

  const grants = await db.permissionGrant.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { capability: true, allow: true },
  });

  for (const g of grants) {
    if (!isCapability(g.capability)) continue; // unknown key = ignored, never granted
    if (g.allow) effective.add(g.capability);
    else effective.delete(g.capability);
  }

  // Founder Trust Model backstop — applied last, unconditionally.
  if (user.role !== "FOUNDER") {
    for (const cap of FOUNDER_RESERVED) effective.delete(cap);
  } else {
    // and the Founder can never be stripped of them by a revoke row
    for (const cap of FOUNDER_RESERVED) effective.add(cap);
  }

  return effective;
}

export async function can(userId: string, cap: Capability): Promise<boolean> {
  return (await effectiveCapabilities(userId)).has(cap);
}

/**
 * Validates a Founder-issued grant/revoke before it is written.
 * Returns an error string, or null when the change is permitted.
 */
export function grantError(opts: {
  actorId: string;
  actorRole: string;
  targetId: string;
  targetRole: string;
  capability: string;
}): string | null {
  const { actorId, actorRole, targetId, targetRole, capability } = opts;
  if (!isCapability(capability)) return "Unknown capability.";
  if (actorRole !== "FOUNDER") return "Only the Founder may manage permissions.";
  if (actorId === targetId) return "You cannot change your own permissions.";
  if (targetRole === "FOUNDER") return "The Founder's permissions cannot be modified.";
  if (isFounderReserved(capability as Capability))
    return "This capability is reserved to the Founder and cannot be delegated.";
  if (rankOf(targetRole) < 0) return "Invalid target account.";
  return null;
}

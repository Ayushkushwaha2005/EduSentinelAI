import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { isCapability, isFounderReserved, type Capability } from "./permissions";
import { ROLES, rankOf, type Role } from "./roles";

/*
 * Invitations (Phase 7.1) — how a person joins EduSentinel.
 *
 * The offer IS the access decision. The role, and any starting capabilities, are
 * chosen when the invitation is written: made once, audited once, and true from
 * the moment the person first signs in. The alternative — sign up, then chase
 * someone to promote you — is how accounts end up with the wrong access for a
 * week and nobody remembers who asked.
 *
 * FOUNDER TRUST MODEL, enforced here rather than in the form:
 *
 *   - FOUNDER is never invitable. Neither is CO_FOUNDER: an invitation is a link
 *     in an email, and a link in an email must not be able to mint the company's
 *     leadership.
 *   - An inviter can never invite AT OR ABOVE their own rank. Privilege flows one
 *     way (R3), and an invitation is not an exception to that.
 *   - Starting capabilities may only be attached by the FOUNDER, because attaching
 *     them IS `permissions.grant`, which is founder-reserved. Reserved capabilities
 *     are refused outright — as they are everywhere else.
 *
 * The token is stored only as a SHA-256 hash. The plaintext lives in the email and
 * nowhere else.
 */

export const INVITE_TTL_MS = 7 * 24 * 60 * 60_000; // 7 days

/** Roles an invitation may ever confer, regardless of who is asking. */
export const INVITABLE_ROLES: Role[] = ["USER", "COLLABORATOR", "EMPLOYEE", "ADMIN"];

export function isInvitableRole(role: unknown): role is Role {
  return typeof role === "string" && INVITABLE_ROLES.includes(role as Role);
}

/** Roles this inviter may confer: invitable, and strictly below their own rank. */
export function invitableBy(actorRole: string): Role[] {
  return INVITABLE_ROLES.filter((r) => rankOf(actorRole) > rankOf(r));
}

export type InviteInput = {
  actorId: string;
  actorRole: string;
  email: string;
  role: string;
  capabilities: string[];
};

/**
 * The gate. Returns an error string, or null when the invitation is permitted.
 * Called by the action AND by the tests — the rules are the function, not the UI.
 */
export function inviteError(input: InviteInput): string | null {
  const { actorRole, email, role, capabilities } = input;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";

  if (!ROLES.includes(role as Role)) return "Invalid role.";
  if (role === "FOUNDER") return "The FOUNDER role can never be invited.";
  if (role === "CO_FOUNDER") {
    return "A Co-Founder cannot be created by invitation — promote an existing account in Access Control.";
  }
  if (!isInvitableRole(role)) return "That role cannot be granted by invitation.";

  // One-directional: nobody invites a peer or a superior.
  if (rankOf(actorRole) <= rankOf(role)) {
    return "You cannot invite someone at or above your own role.";
  }

  for (const cap of capabilities) {
    if (!isCapability(cap)) return "Unknown capability.";
    if (isFounderReserved(cap as Capability)) {
      return "That capability is reserved to the Founder and cannot be granted.";
    }
  }
  // Attaching capabilities IS permissions.grant, and that is founder-reserved.
  if (capabilities.length > 0 && actorRole !== "FOUNDER") {
    return "Only the Founder may attach capabilities to an invitation.";
  }

  return null;
}

/** Create the invitation. Returns the PLAINTEXT token — it is never stored. */
export async function createInvitation(input: InviteInput & { actorEmail: string; message?: string }) {
  const email = input.email.trim().toLowerCase();

  // Supersede any outstanding invitation for this address, so a re-invite cannot
  // leave two live links to the same account with different roles attached.
  await db.invitation.updateMany({
    where: { email, status: "PENDING" },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  const token = randomToken();
  const invitation = await db.invitation.create({
    data: {
      email,
      tokenHash: sha256(token),
      role: input.role,
      capabilities: JSON.stringify(input.capabilities),
      invitedById: input.actorId,
      invitedByEmail: input.actorEmail,
      message: input.message ?? null,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  return { invitation, token };
}

export type LiveInvitation = {
  id: string;
  email: string;
  role: Role;
  capabilities: Capability[];
  expiresAt: Date;
};

/** Look up a pending, unexpired invitation by its plaintext token. */
export async function findInvitation(token: string): Promise<LiveInvitation | null> {
  const row = await db.invitation.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.status !== "PENDING" || row.expiresAt < new Date()) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role as Role,
    capabilities: parseCapabilities(row.capabilities),
    expiresAt: row.expiresAt,
  };
}

export function parseCapabilities(raw: string): Capability[] {
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // Re-validated on READ as well as on write. A row that somehow contains a
    // reserved capability — a bad migration, a forged insert — grants nothing.
    return list.filter(
      (c): c is Capability => isCapability(c) && !isFounderReserved(c),
    );
  } catch {
    return [];
  }
}

/**
 * Claim an invitation exactly once, atomically. Returns the invitation, or null
 * if it was already used, revoked or expired — including when two people race
 * the same link.
 */
export async function claimInvitation(
  token: string,
  userId: string,
): Promise<LiveInvitation | null> {
  const live = await findInvitation(token);
  if (!live) return null;

  const claimed = await db.invitation.updateMany({
    where: { id: live.id, status: "PENDING" },
    data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedById: userId },
  });
  return claimed.count === 1 ? live : null;
}

export async function pendingInvitations() {
  const rows = await db.invitation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role as Role,
    capabilities: parseCapabilities(r.capabilities),
    status: r.status,
    // Expiry is computed, not stored as a status: a cron job that forgets to run
    // must not be able to leave an expired invitation looking live.
    expired: r.status === "PENDING" && r.expiresAt < now,
    invitedByEmail: r.invitedByEmail,
    expiresAt: r.expiresAt,
    acceptedAt: r.acceptedAt,
    createdAt: r.createdAt,
  }));
}

/** Invitation acceptance rate — the metric Phase 6.3 could not measure yet. */
export async function invitationStats() {
  const [sent, accepted] = await Promise.all([
    db.invitation.count(),
    db.invitation.count({ where: { status: "ACCEPTED" } }),
  ]);
  return { sent, accepted };
}

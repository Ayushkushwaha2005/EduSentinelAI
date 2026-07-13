import { db } from "./db";
import { ROLE_LABELS, isStaffRole, type Role } from "./roles";

/*
 * Profiles (Phase 6.2) — one identity record per person, self-service for every
 * role from USER to FOUNDER through the same /app/profile page. There is no
 * "admin edits your profile" variant, and there must never be one: the moment a
 * second surface can write to a person's record, it becomes a second, weaker path
 * to the things that hang off it.
 *
 * The authorization line this file draws:
 *
 *   - A person edits their OWN profile (name, title, bio, avatar, preferences).
 *   - Nothing here touches `role`, `PermissionGrant`, `mfaEnabled` or
 *     `sessionVersion`. Privilege is changed in Access Control (founder-reserved)
 *     and nowhere else. `updatableProfileFields` is the exhaustive allowlist, so a
 *     forged form field cannot smuggle `role: "FOUNDER"` into an update.
 *
 * Visibility is not symmetric. `publicProfile` is what OTHER people may see, and
 * it is a deliberate subset — a collaborator is external, so they never receive a
 * staff member's phone number, location or internal title, whatever the requester
 * asks for.
 */

/** The exhaustive set of columns a profile update may write. */
export const PROFILE_FIELDS = [
  "name",
  "title",
  "bio",
  "pronouns",
  "timezone",
  "location",
  "phone",
  "notifyDigest",
  "notifyMentions",
  "notifyProduct",
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export type OwnProfile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  roleLabel: string;
  title: string | null;
  bio: string | null;
  pronouns: string | null;
  timezone: string | null;
  location: string | null;
  phone: string | null;
  avatarUrl: string | null;
  team: string | null;
  joined: Date;
  emailVerified: boolean;
  mfaEnabled: boolean;
  notifyDigest: boolean;
  notifyMentions: boolean;
  notifyProduct: boolean;
};

/**
 * The avatar URL carries the upload time, so a replaced photo is not served from
 * a stale cache. It is a route, not a storage path — the file itself lives outside
 * the web root and is only ever streamed by an authenticated handler.
 */
export function avatarUrlFor(user: {
  id: string;
  avatarName: string | null;
  avatarAt: Date | null;
}): string | null {
  if (!user.avatarName) return null;
  return `/api/avatar/${user.id}?v=${user.avatarAt?.getTime() ?? 0}`;
}

export async function ownProfile(userId: string): Promise<OwnProfile | null> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      title: true,
      bio: true,
      pronouns: true,
      timezone: true,
      location: true,
      phone: true,
      avatarName: true,
      avatarAt: true,
      createdAt: true,
      emailVerified: true,
      mfaEnabled: true,
      notifyDigest: true,
      notifyMentions: true,
      notifyProduct: true,
      memberships: { take: 1, select: { team: { select: { name: true } } } },
    },
  });
  if (!u) return null;

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as Role,
    roleLabel: ROLE_LABELS[u.role as Role] ?? u.role,
    title: u.title,
    bio: u.bio,
    pronouns: u.pronouns,
    timezone: u.timezone,
    location: u.location,
    phone: u.phone,
    avatarUrl: avatarUrlFor(u),
    team: u.memberships[0]?.team.name ?? null,
    joined: u.createdAt,
    emailVerified: !!u.emailVerified,
    mfaEnabled: u.mfaEnabled,
    notifyDigest: u.notifyDigest,
    notifyMentions: u.notifyMentions,
    notifyProduct: u.notifyProduct,
  };
}

/**
 * What one person may see of another. `viewerRole` decides the width: internal
 * staff see the working details they need to do their job; anyone else (a
 * collaborator, a member) gets name, role and avatar and nothing more.
 */
export async function visibleProfile(targetId: string, viewerRole: string) {
  const u = await db.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      bio: true,
      pronouns: true,
      timezone: true,
      location: true,
      phone: true,
      email: true,
      avatarName: true,
      avatarAt: true,
      lastSeenAt: true,
    },
  });
  if (!u) return null;

  const internal = isStaffRole(viewerRole);
  return {
    id: u.id,
    name: u.name,
    role: u.role as Role,
    roleLabel: ROLE_LABELS[u.role as Role] ?? u.role,
    pronouns: u.pronouns,
    bio: u.bio,
    avatarUrl: avatarUrlFor(u),
    online: isOnline(u.lastSeenAt),
    // Internal-only. A collaborator asking for a staff profile gets nulls, not a
    // 403 — there is nothing to argue with.
    title: internal ? u.title : null,
    email: internal ? u.email : null,
    location: internal ? u.location : null,
    timezone: internal ? u.timezone : null,
    phone: internal ? u.phone : null,
  };
}

/* ---------- presence ---------- */

/** Online = seen in the last five minutes. Nothing else counts as presence. */
export const PRESENCE_WINDOW_MS = 5 * 60_000;
const PRESENCE_STAMP_MS = 2 * 60_000; // don't write on every request

export function isOnline(lastSeenAt: Date | null | undefined): boolean {
  return !!lastSeenAt && Date.now() - lastSeenAt.getTime() < PRESENCE_WINDOW_MS;
}

/**
 * Stamp presence from the workspace shell. Throttled: a write on every page view
 * would turn every navigation into a database write for a value nobody reads at
 * that resolution.
 */
export async function touchPresence(userId: string, lastSeenAt: Date | null): Promise<void> {
  if (lastSeenAt && Date.now() - lastSeenAt.getTime() < PRESENCE_STAMP_MS) return;
  await db.user
    .update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
    .catch(() => null); // presence is not worth failing a page render over
}

/** Staff who are actually online right now. Internal only — never sent outward. */
export async function onlineStaff(take = 5) {
  const since = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const rows = await db.user.findMany({
    where: {
      role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] },
      lastSeenAt: { gte: since },
    },
    orderBy: { lastSeenAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      title: true,
      avatarName: true,
      avatarAt: true,
      memberships: { take: 1, select: { title: true } },
    },
  });

  // `online` is carried as a value rather than assumed by the caller: the rail is
  // filtered by presence today, but a component that hard-codes `online` is how
  // this rail started lying in the first place.
  return rows.map((p) => ({
    name: p.name,
    title: p.title ?? p.memberships[0]?.title ?? null,
    avatarUrl: avatarUrlFor(p),
    online: true as const,
  }));
}

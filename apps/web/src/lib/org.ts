import { db } from "./db";
import { avatarUrlFor, isOnline } from "./profile";
import { sanitizeLine, sanitizeUserText } from "./sanitize";
import { safeHref } from "./catalog";
import { ROLE_LABELS, type Role } from "./roles";
import type { OrgLink, ResolvedMember, Visibility } from "./org-types";

// The pure, database-free pieces (constants, types, link formatting) live in
// lib/org-types.ts so CLIENT components can import them without dragging Prisma
// into the browser bundle. Re-exported here so server code has one import.
export * from "./org-types";

/*
 * The organization (Phase 6.5).
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: a person's name, email and photo are
 * stored in exactly ONE place. If an org member is linked to a user account, those
 * fields resolve from that account's Phase 6.2 profile and the org row's own
 * columns are ignored — not merged, not preferred, ignored. Two copies of a name
 * is one name that will be wrong, and the wrong one will be the one on the public
 * site.
 *
 * An OrgMember is NOT a User and must not be confused with one:
 *   User      = who can sign in, and what they may do.
 *   OrgMember = who they are on the org chart.
 * An advisor has an org row and no account. An engineer has both. The link is
 * optional in both directions, and that is the point.
 *
 * The roster renders on the PUBLIC marketing site, so it is treated as untrusted
 * exactly like the product catalogue (Phase 5.5): text is sanitized on write and
 * rendered as plain text, and social links go through `safeHref` — https or an
 * internal path, never javascript: or data:.
 */



/** Links are author-supplied and end up in an <a href> on a public page. */
export function parseLinks(raw: string | null | undefined): OrgLink[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l): l is OrgLink => !!l && typeof l.label === "string" && typeof l.href === "string")
      .map((l) => ({
        label: sanitizeLine(l.label, 40),
        href: safeHref(l.href, "/company"),
      }))
      .filter((l) => l.label.length > 0)
      .slice(0, 6);
  } catch {
    return [];
  }
}

/** Accepts "Label|https://…" per line — the form's shape — and stores JSON. */
export function serializeLinks(input: unknown): string {
  if (typeof input !== "string") return "[]";
  const links = input
    .split(/[\r\n]+/)
    .map((line) => {
      const [label, ...rest] = line.split("|");
      const href = rest.join("|").trim();
      if (!label?.trim() || !href) return null;
      return { label: sanitizeLine(label, 40), href: safeHref(href, "/company") };
    })
    .filter((l): l is OrgLink => !!l)
    .slice(0, 6);
  return JSON.stringify(links);
}

const MEMBER_INCLUDE = {
  department: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      bio: true,
      avatarName: true,
      avatarAt: true,
      lastSeenAt: true,
    },
  },
} as const;

type RawMember = Awaited<
  ReturnType<typeof db.orgMember.findMany<{ include: typeof MEMBER_INCLUDE }>>
>[number];

/**
 * The one place identity is assembled. Everything — dashboard, org directory,
 * public company page, home rail — goes through this, so they cannot disagree.
 */
export function resolveMember(m: RawMember): ResolvedMember {
  const u = m.user;
  return {
    id: m.id,
    userId: m.userId,
    linked: !!u,
    // Linked → the account IS the identity. The org row's copies are not consulted.
    name: u?.name ?? m.name,
    email: u?.email ?? m.email,
    phone: u?.phone ?? m.phone,
    bio: u?.bio ?? m.bio,
    // Precedence, and it matters: a linked account's own avatar wins (they keep it
    // current), then a photo the Founder uploaded, then the portrait that shipped
    // in public/ with the site. Never two of them stored as one person's "photo".
    photoUrl: u
      ? (avatarUrlFor(u) ?? m.photoPath)
      : m.photoName
        ? `/api/photo/member/${m.id}?v=${m.photoAt?.getTime() ?? 0}`
        : m.photoPath,
    designation: m.designation,
    department: m.department,
    team: m.team,
    links: parseLinks(m.links),
    sortOrder: m.sortOrder,
    visibility: m.visibility as Visibility,
    accountRole: (u?.role as Role) ?? null,
    online: isOnline(u?.lastSeenAt),
  };
}

/** The full roster — internal. Requires org.manage or team.view upstream. */
export async function roster(): Promise<ResolvedMember[]> {
  const rows = await db.orgMember.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: MEMBER_INCLUDE,
  });
  return rows.map(resolveMember);
}

/** What the PUBLIC site may see: PUBLIC visibility only, never INTERNAL/HIDDEN. */
export async function publicRoster(): Promise<ResolvedMember[]> {
  const rows = await db.orgMember.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: MEMBER_INCLUDE,
  });
  // Phone is an internal contact detail and never leaves the building, whatever
  // the member row says.
  return rows.map(resolveMember).map((m) => ({ ...m, phone: null }));
}

export async function memberById(id: string): Promise<ResolvedMember | null> {
  const row = await db.orgMember.findUnique({ where: { id }, include: MEMBER_INCLUDE });
  return row ? resolveMember(row) : null;
}

/** The org chart: departments, their teams, and the people in each. */
export async function orgDirectory() {
  const [departments, members, teams] = await Promise.all([
    db.department.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    roster(),
    db.team.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { members: true } } },
    }),
  ]);

  return {
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      description: d.description,
      sortOrder: d.sortOrder,
      teams: teams.filter((t) => t.departmentId === d.id),
      members: members.filter((m) => m.department?.id === d.id),
    })),
    // People the Founder has added to the org but not filed under a department —
    // shown, not hidden, so nobody quietly falls off the chart.
    unassigned: members.filter((m) => !m.department),
    teamsWithoutDepartment: teams.filter((t) => !t.departmentId),
    members,
  };
}

/** Accounts that are not yet on the org chart — offered for linking, never auto-added. */
export async function unlinkedAccounts() {
  const linked = await db.orgMember.findMany({
    where: { userId: { not: null } },
    select: { userId: true },
  });
  const taken = new Set(linked.map((l) => l.userId as string));

  const users = await db.user.findMany({
    where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  return users
    .filter((u) => !taken.has(u.id))
    .map((u) => ({ ...u, roleLabel: ROLE_LABELS[u.role as Role] ?? u.role }));
}

/** Sanitize on write — the roster renders publicly. */
export function cleanMemberInput(input: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  designation?: unknown;
  bio?: unknown;
}) {
  return {
    name: sanitizeLine(input.name, 80),
    email: sanitizeLine(input.email, 120) || null,
    phone: sanitizeLine(input.phone, 40) || null,
    designation: sanitizeLine(input.designation, 60),
    bio: sanitizeUserText(input.bio, 600) || null,
  };
}

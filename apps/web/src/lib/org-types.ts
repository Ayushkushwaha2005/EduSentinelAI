import type { Role } from "./roles";

/*
 * Org types and constants — deliberately DATABASE-FREE.
 *
 * The client forms (org, company, collaboration) need the designation
 * suggestions, the visibility list and the link formatter. If they imported those
 * from lib/org.ts, they would drag `db` — and therefore Prisma — into the browser
 * bundle, which does not work and should not be attempted: a client component has
 * no business being able to reach the database at all.
 *
 * So the shared, pure pieces live here, and everything that touches the database
 * (queries, sanitization on write, safeHref) stays in lib/org.ts, server-side.
 */

export const VISIBILITIES = ["PUBLIC", "INTERNAL", "HIDDEN"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export function isVisibility(v: unknown): v is Visibility {
  return typeof v === "string" && (VISIBILITIES as readonly string[]).includes(v);
}

/*
 * Suggestions, not an enum. The Founder can type any designation — a fixed list of
 * job titles is a guess about a company that does not exist yet, and the first
 * hire who did not fit it would have to be mislabelled to be added at all.
 */
export const DESIGNATION_SUGGESTIONS = [
  "Founder",
  "Co-Founder",
  "CEO",
  "CTO",
  "COO",
  "CISO",
  "HR Lead",
  "Product Manager",
  "Engineering Lead",
  "Designer",
  "Marketing Lead",
  "Advisor",
  "Investor",
  "Core Team",
  "Collaborative Partner",
] as const;

/*
 * A designation is stored as a " · "-separated stack: the first segment is the
 * primary title (the teal label), the rest are specialty roles rendered as pills.
 * Splitting lives here so the company page, home rail and org forms all read it
 * the same way and can never disagree about which part is the title.
 */
export function splitDesignation(designation: string): {
  title: string;
  specialties: string[];
} {
  const parts = designation
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  return { title: parts[0] ?? designation.trim(), specialties: parts.slice(1) };
}

export type OrgLink = { label: string; href: string };

/** The form's shape: one "Label|https://…" per line. Pure formatting, no I/O. */
export function linksToText(links: OrgLink[]): string {
  return links.map((l) => `${l.label}|${l.href}`).join("\n");
}

export type ResolvedMember = {
  id: string;
  userId: string | null;
  /** True when identity comes from a linked account rather than the org row. */
  linked: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string;
  bio: string | null;
  department: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  links: OrgLink[];
  photoUrl: string | null;
  sortOrder: number;
  visibility: Visibility;
  accountRole: Role | null;
  online: boolean;
};

/* ---- collaborations ---- */

export const COLLAB_STATUSES = ["ACTIVE", "PAUSED", "ENDED"] as const;
export type CollabStatus = (typeof COLLAB_STATUSES)[number];

export const COLLAB_KINDS = ["partnership", "contributor", "research", "other"] as const;
export type CollabKind = (typeof COLLAB_KINDS)[number];

export function isCollabStatus(v: unknown): v is CollabStatus {
  return typeof v === "string" && (COLLAB_STATUSES as readonly string[]).includes(v);
}
export function isCollabKind(v: unknown): v is CollabKind {
  return typeof v === "string" && (COLLAB_KINDS as readonly string[]).includes(v);
}

export type ResolvedCollaboration = {
  id: string;
  userId: string | null;
  requestId: string | null;
  name: string;
  email: string | null;
  org: string | null;
  kind: string;
  status: CollabStatus;
  summary: string | null;
  startedAt: Date;
  endedAt: Date | null;
  photoUrl: string | null;
  hasAccount: boolean;
};

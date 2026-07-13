import { db } from "./db";
import { avatarUrlFor } from "./profile";
import type { CollabStatus, ResolvedCollaboration } from "./org-types";

// Statuses, kinds and the resolved type are database-free and live in
// lib/org-types.ts, so the client forms can import them without pulling Prisma
// into the browser. Re-exported for server callers.
export * from "./org-types";

/*
 * Collaborations (Phase 6.5) — the model that was missing, and the reason the
 * Collaboration page could sit empty while the People page listed collaborators.
 *
 * There were two tables and no relationship between them:
 *
 *   User(role: COLLABORATOR)  = an ACCOUNT. Appears in People.
 *   CollaborationRequest      = a public SUBMISSION. Appeared in the inbox.
 *
 * Neither of those is *the collaboration*. A partnership that started over a call
 * has no request; a request from someone who never got an account has no user. The
 * Founder wanted to manage the relationship, and the relationship had no home — so
 * the two pages showed different populations and neither was wrong, exactly. They
 * were answering different questions while appearing to answer the same one.
 *
 * `Collaboration` is that home. It may link to an account, to a request, to both,
 * or to neither. `collaborationBoard()` below is the join the UI always needed: it
 * returns every collaboration AND every collaborator account that does not have
 * one yet, so a person in People can never be silently absent from Collaboration
 * again.
 */

const INCLUDE = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarName: true,
      avatarAt: true,
    },
  },
} as const;



type Raw = Awaited<
  ReturnType<typeof db.collaboration.findMany<{ include: typeof INCLUDE }>>
>[number];

function resolve(c: Raw): ResolvedCollaboration {
  return {
    id: c.id,
    userId: c.userId,
    requestId: c.requestId,
    name: c.user?.name ?? c.name,
    email: c.user?.email ?? c.email,
    org: c.org,
    kind: c.kind,
    status: c.status as CollabStatus,
    summary: c.summary,
    startedAt: c.startedAt,
    endedAt: c.endedAt,
    photoUrl: c.user ? avatarUrlFor(c.user) : null,
    hasAccount: !!c.userId,
  };
}

export async function collaborations(): Promise<ResolvedCollaboration[]> {
  const rows = await db.collaboration.findMany({
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    include: INCLUDE,
  });
  return rows.map(resolve);
}

/**
 * The synchronization the page was missing. Returns the collaborations *and* the
 * collaborator accounts that have no collaboration record — surfaced, not
 * silently dropped, so the two pages can be reconciled in one click instead of
 * quietly disagreeing forever.
 */
export async function collaborationBoard() {
  const [list, collaboratorAccounts, requests] = await Promise.all([
    collaborations(),
    db.user.findMany({
      where: { role: "COLLABORATOR" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    db.collaborationRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const linked = new Set(list.map((c) => c.userId).filter(Boolean) as string[]);
  const unlinkedAccounts = collaboratorAccounts.filter((u) => !linked.has(u.id));

  return {
    collaborations: list,
    /** In People, absent from Collaboration — the bug, made visible and fixable. */
    unlinkedAccounts,
    requests,
    active: list.filter((c) => c.status === "ACTIVE").length,
  };
}

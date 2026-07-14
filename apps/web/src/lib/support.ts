import { db } from "./db";
import type { Viewer } from "./guard";
import { avatarUrlFor } from "./profile";
import { SLA_HOURS, type Priority, type SupportStatus } from "./support-types";

// The pure lists and types live in lib/support-types.ts so the client forms can
// import them without pulling Prisma into the browser bundle. Re-exported here so
// server code has a single import.
export * from "./support-types";

/*
 * Support Center (Phase 9).
 *
 * The access rule is the Phase 5.3 message-center rule, applied to a new object:
 *
 *   You may see a request if you RAISED it, or if you hold `support.respond`.
 *
 * There is deliberately NO unscoped "get by id" in this module. `openRequest()`
 * takes a viewer, and returns null for a request they may not see — the same
 * answer a non-existent id gets, so a tampered URL learns nothing about what
 * exists.
 *
 * A COLLABORATOR may raise a request and reach staff. They never see another
 * collaborator's request: we do not become a channel between external parties.
 *
 * INTERNAL NOTES are staff-only and are filtered out HERE, in the query layer,
 * not in a component. Staff need somewhere to say "this is the third time this
 * week" without the requester reading it; a note that leaks is worse than no
 * note, because everyone assumed it was private.
 */

export function canRespond(viewer: Viewer): boolean {
  return viewer.can("support.respond");
}

export function canSee(viewer: Viewer, requesterId: string): boolean {
  return viewer.id === requesterId || canRespond(viewer);
}

const INCLUDE = {
  requester: { select: { id: true, name: true, avatarName: true, avatarAt: true } },
  assignee: { select: { id: true, name: true } },
  _count: { select: { messages: true, attachments: true } },
} as const;

/** Requests raised by this person. Always allowed — they are their own. */
export async function myRequests(viewer: Viewer) {
  const rows = await db.supportRequest.findMany({
    where: { requesterId: viewer.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: INCLUDE,
  });
  return rows.map(summarize);
}

/** The staff queue. Empty for anyone without `support.respond` — never partial. */
export async function queue(viewer: Viewer) {
  if (!canRespond(viewer)) return [];
  const rows = await db.supportRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: INCLUDE,
  });
  return rows.map(summarize);
}

type Raw = Awaited<
  ReturnType<typeof db.supportRequest.findMany<{ include: typeof INCLUDE }>>
>[number];

function summarize(r: Raw) {
  const target = SLA_HOURS[(r.priority as Priority) ?? "NORMAL"] ?? 48;
  const dueBy = new Date(r.createdAt.getTime() + target * 3_600_000);

  return {
    id: r.id,
    subject: r.subject,
    category: r.category,
    priority: r.priority as Priority,
    status: r.status as SupportStatus,
    requesterId: r.requesterId,
    requesterName: r.requester.name,
    requesterAvatar: avatarUrlFor(r.requester),
    assigneeId: r.assigneeId,
    assigneeName: r.assignee?.name ?? null,
    messages: r._count.messages,
    attachments: r._count.attachments,
    createdAt: r.createdAt,
    firstResponseAt: r.firstResponseAt,
    resolvedAt: r.resolvedAt,
    dueBy,
    // Breached only while it is still WAITING for a first response. A request
    // answered late is not permanently "breaching" — it breached once, and the
    // timestamp records it.
    overdue:
      !r.firstResponseAt &&
      r.status !== "RESOLVED" &&
      r.status !== "CLOSED" &&
      dueBy < new Date(),
  };
}

/**
 * One request with its thread. Returns null when the viewer may not see it —
 * indistinguishable from a request that does not exist.
 */
export async function openRequest(viewer: Viewer, id: string) {
  const row = await db.supportRequest.findUnique({
    where: { id },
    include: {
      ...INCLUDE,
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatarName: true, avatarAt: true } },
        },
      },
      attachments: true,
    },
  });
  if (!row) return null;
  if (!canSee(viewer, row.requesterId)) return null;

  const staff = canRespond(viewer);

  return {
    ...summarize(row),
    // Internal notes are dropped for the requester HERE. The page never receives
    // them, so it cannot render them by accident.
    messages: row.messages
      .filter((m) => staff || !m.internal)
      .map((m) => ({
        id: m.id,
        body: m.body,
        internal: m.internal,
        createdAt: m.createdAt,
        authorId: m.authorId,
        authorName: m.author.name,
        authorAvatar: avatarUrlFor(m.author),
        mine: m.authorId === viewer.id,
      })),
    attachments: row.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      size: a.size,
      mime: a.mime,
    })),
  };
}

/** Staff who can be assigned a request — the people who actually hold the power. */
export async function responders() {
  const { effectiveCapabilities } = await import("./permissions");
  const users = await db.user.findMany({
    where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const out: { id: string; name: string }[] = [];
  for (const u of users) {
    if ((await effectiveCapabilities(u.id)).has("support.respond")) out.push(u);
  }
  return out;
}

export async function supportSummary(viewer: Viewer) {
  if (!canRespond(viewer)) return null;
  const [open, unassigned, mine, breached] = await Promise.all([
    db.supportRequest.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.supportRequest.count({ where: { status: "OPEN", assigneeId: null } }),
    db.supportRequest.count({
      where: { assigneeId: viewer.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    db.supportRequest.count({
      where: { firstResponseAt: null, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);
  return { open, unassigned, mine, awaitingFirstReply: breached };
}

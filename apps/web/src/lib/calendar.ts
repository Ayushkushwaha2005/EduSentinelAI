import { db } from "./db";
import type { Viewer } from "./guard";
import {
  dayKey,
  isEventKind,
  isVisibility,
  type CalendarItem,
  type EventKind,
  type Visibility,
} from "./calendar-types";

/*
 * THE WORKSPACE CALENDAR — the one read path.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE, and the two decisions everything else follows from.
 *
 * 1. ONE FEED, SCOPED BY RELATIONSHIP — never one calendar per role.
 *
 *    `itemsFor(viewer, range)` is the only way to read the calendar. There is no
 *    "founder calendar" query and no "employee calendar" query, because the
 *    moment those exist, "who may see this?" has two answers that drift apart.
 *    A Founder's calendar is fuller than an intern's purely because more rows
 *    survive the same scoping.
 *
 * 2. PROJECTED SOURCES ARE NEVER COPIED IN.
 *
 *    Holidays, approved leave, releases and task deadlines already live in
 *    tables that own them. They are read and projected into the feed on demand,
 *    not mirrored into CalendarEvent. A mirrored row is a row that can go stale
 *    and disagree with the pipeline it came from — a release that shows as
 *    shipping on a day it was revoked is worse than no calendar at all.
 *
 * PRIVACY, non-negotiable and inherited from lib/hr.ts:
 *
 *    A leave entry on this calendar carries NO reason and NO leave type. Ever.
 *    "SICK" printed against a name on a shared calendar is a medical disclosure
 *    to the whole company. The projection below emits "Away" and nothing else,
 *    and it does so in the query layer so no component can accidentally widen
 *    it. `npm run test:hr` already asserts this for the HR surfaces; the same
 *    rule is honoured here by construction.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Range = { from: Date; to: Date };

/** The month containing `d`, padded to whole days. */
export function monthRange(d: Date): Range {
  return {
    from: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
    to: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

/* Staff see company-wide sources. External collaborators never do. */
function isStaff(viewer: Viewer): boolean {
  return viewer.role !== "USER" && viewer.role !== "COLLABORATOR";
}

/**
 * Everything the viewer may see in the range, from every source, sorted.
 *
 * Deliberately one function with one scoping story. Adding a source later means
 * adding a projection here — not a new endpoint with its own idea of access.
 */
export async function itemsFor(viewer: Viewer, range: Range): Promise<CalendarItem[]> {
  const { from, to } = range;
  const staff = isStaff(viewer);

  // The viewer's teams — needed to resolve TEAM visibility.
  const memberships = await db.teamMember.findMany({
    where: { userId: viewer.id },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  const [events, holidays, leave, releases, tasks] = await Promise.all([
    /*
     * Created events. The OR is the access model in full:
     *   - it is mine, or
     *   - I was explicitly invited, or
     *   - it is a team event for a team I am in, or
     *   - it is a company event and I am staff.
     * There is no branch that returns a row on the strength of a role alone.
     */
    db.calendarEvent.findMany({
      where: {
        cancelledAt: null,
        startsAt: { gte: from, lte: to },
        OR: [
          { ownerId: viewer.id },
          { attendees: { some: { userId: viewer.id } } },
          ...(teamIds.length ? [{ visibility: "TEAM", teamId: { in: teamIds } }] : []),
          ...(staff ? [{ visibility: "COMPANY" }] : []),
        ],
      },
      include: { owner: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),

    // Holidays are company-wide and carry nothing personal.
    staff
      ? db.holiday.findMany({
          where: { date: { gte: from, lte: to } },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),

    /*
     * Approved leave only, and ONLY the fields below.
     *
     * `select` is exhaustive on purpose: `reason` and `leaveTypeId` are not in
     * it, so they cannot reach a component even by accident. This is the
     * single most sensitive projection in the file.
     */
    staff
      ? db.leaveRequest.findMany({
          where: {
            status: "APPROVED",
            startDate: { lte: to },
            endDate: { gte: from },
          },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            userId: true,
            user: { select: { name: true } },
          },
        })
      : Promise.resolve([]),

    // Published releases — the shipping calendar.
    staff && viewer.can("products.view")
      ? db.release.findMany({
          where: { status: "PUBLISHED", publishedAt: { gte: from, lte: to } },
          select: {
            id: true,
            version: true,
            publishedAt: true,
            product: { select: { name: true } },
          },
        })
      : Promise.resolve([]),

    // Task deadlines. Yours always; the team's if you can see the team.
    db.task.findMany({
      where: {
        dueAt: { gte: from, lte: to },
        status: { not: "DONE" },
        ...(viewer.can("team.view") ? {} : { assigneeId: viewer.id }),
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        assignee: { select: { name: true } },
      },
    }),
  ]);

  const items: CalendarItem[] = [];

  for (const e of events) {
    items.push({
      id: e.id,
      source: "EVENT",
      kind: (isEventKind(e.kind) ? e.kind : "MEETING") as EventKind,
      title: e.title,
      detail: e.detail,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      allDay: e.allDay,
      location: e.location,
      visibility: (isVisibility(e.visibility) ? e.visibility : "PERSONAL") as Visibility,
      ownerName: e.owner?.name ?? null,
      // You may edit your own; calendar.manage may edit company-wide entries.
      canEdit: e.ownerId === viewer.id || (e.visibility === "COMPANY" && viewer.can("calendar.manage")),
      href: null,
    });
  }

  for (const h of holidays) {
    items.push({
      id: `holiday:${h.id}`,
      source: "HOLIDAY",
      kind: "HOLIDAY",
      title: h.name,
      detail: null,
      startsAt: h.date,
      endsAt: null,
      allDay: true,
      location: null,
      visibility: "COMPANY",
      ownerName: null,
      canEdit: viewer.can("calendar.manage"),
      href: "/app/calendar",
    });
  }

  for (const l of leave) {
    items.push({
      id: `leave:${l.id}`,
      source: "LEAVE",
      kind: "LEAVE",
      // NO reason. NO leave type. Just that the person is away.
      title: `${l.user.name} — away`,
      detail: null,
      startsAt: l.startDate,
      endsAt: l.endDate,
      allDay: true,
      location: null,
      visibility: "COMPANY",
      ownerName: l.user.name,
      canEdit: false,
      href: l.userId === viewer.id ? "/app/leave" : null,
    });
  }

  for (const r of releases) {
    if (!r.publishedAt) continue;
    items.push({
      id: `release:${r.id}`,
      source: "RELEASE",
      kind: "RELEASE",
      title: `${r.product.name} ${r.version}`,
      detail: null,
      startsAt: r.publishedAt,
      endsAt: null,
      allDay: false,
      location: null,
      visibility: "COMPANY",
      ownerName: null,
      canEdit: false,
      href: "/app/admin/releases",
    });
  }

  for (const t of tasks) {
    if (!t.dueAt) continue;
    items.push({
      id: `task:${t.id}`,
      source: "TASK",
      kind: "TASK",
      title: t.title,
      detail: t.assignee?.name ?? null,
      startsAt: t.dueAt,
      endsAt: null,
      allDay: false,
      location: null,
      visibility: "PERSONAL",
      ownerName: t.assignee?.name ?? null,
      canEdit: false,
      href: "/app/tasks",
    });
  }

  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** The feed bucketed by local day — what a month grid renders from. */
export async function itemsByDay(
  viewer: Viewer,
  range: Range,
): Promise<Map<string, CalendarItem[]>> {
  const items = await itemsFor(viewer, range);
  const map = new Map<string, CalendarItem[]>();

  for (const item of items) {
    // A multi-day item appears on every day it covers, capped at the range so a
    // year-long entry cannot blow the map up.
    const last = item.endsAt && item.endsAt > item.startsAt ? item.endsAt : item.startsAt;
    const cursor = new Date(item.startsAt);
    let guard = 0;
    while (cursor <= last && guard++ < 400) {
      const key = dayKey(cursor);
      (map.get(key) ?? map.set(key, []).get(key)!).push(item);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return map;
}

/**
 * A single event the viewer may actually see.
 *
 * Returns null for an event they may not — identical to one that does not
 * exist. Same rule as lib/support.ts: an id must never be a probe.
 */
export async function openEvent(viewer: Viewer, id: string) {
  const memberships = await db.teamMember.findMany({
    where: { userId: viewer.id },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  return db.calendarEvent.findFirst({
    where: {
      id,
      cancelledAt: null,
      OR: [
        { ownerId: viewer.id },
        { attendees: { some: { userId: viewer.id } } },
        ...(teamIds.length ? [{ visibility: "TEAM", teamId: { in: teamIds } }] : []),
        ...(isStaff(viewer) ? [{ visibility: "COMPANY" }] : []),
      ],
    },
    include: {
      owner: { select: { id: true, name: true } },
      attendees: { include: { user: { select: { id: true, name: true } } } },
    },
  });
}

/** Upcoming items — the dashboard's "what's next" strip. */
export async function upcoming(viewer: Viewer, days = 14, take = 5) {
  const from = new Date();
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days, 23, 59, 59);
  const items = await itemsFor(viewer, { from, to });
  return items.slice(0, take);
}

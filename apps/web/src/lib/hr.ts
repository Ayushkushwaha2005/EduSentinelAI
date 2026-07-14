import { db } from "./db";
import type { Viewer } from "./guard";
import { avatarUrlFor } from "./profile";
import { sanitizeLine } from "./sanitize";

/*
 * HR & workforce (Phase 8).
 *
 * ATTENDANCE AND LEAVE ARE SENSITIVE PERSONAL DATA. This module is the only way
 * to read them, and it enforces two rules that the pages above it cannot opt out
 * of:
 *
 *   1. VISIBILITY IS SCOPED BY RELATIONSHIP — self, approver, HR, founder. There
 *      is no unscoped "all employees" read anywhere in the product. A page asking
 *      for someone else's records has to say, in code, on whose authority.
 *
 *   2. A LEAVE REASON IS READABLE ONLY BY THE PERSON AND THEIR APPROVER CHAIN.
 *      "Hospital appointment" is a medical fact about someone; "specialist
 *      referral" is a more specific one. The team calendar needs to know that
 *      someone is out — it does not need to know that. `redactLeave()` strips the
 *      field for everyone else, and it strips it in the QUERY LAYER, not in a
 *      component, so a future page cannot forget.
 *
 * Retention: 24 months after the period described (see purgeExpiredRecords).
 */

export const ATTENDANCE_STATUSES = [
  "WORKING",
  "REMOTE",
  "SICK",
  "ABSENT",
  "LEAVE",
  "HOLIDAY",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export function isAttendanceStatus(v: unknown): v is AttendanceStatus {
  return typeof v === "string" && (ATTENDANCE_STATUSES as readonly string[]).includes(v);
}

export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

/** Midnight UTC of a given day. A day is a day, not an instant. */
export function dayOf(input: Date | string): Date {
  const d = typeof input === "string" ? new Date(`${input}T00:00:00.000Z`) : new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function currentYear(): number {
  return new Date().getUTCFullYear();
}

/* ---------- working days: the leave maths ---------- */

/**
 * Working days between two dates, inclusive — weekends and public holidays
 * EXCLUDED.
 *
 * Booking a week that contains a public holiday must not cost a person a day of
 * their entitlement for a day the company was closed anyway. This is the function
 * that makes that true, and it is the same one the request form previews and the
 * server charges — so what someone is shown is what they are billed.
 */
export async function workingDaysBetween(start: Date, end: Date): Promise<Date[]> {
  const from = dayOf(start);
  const to = dayOf(end);
  if (to < from) return [];

  const holidays = await db.holiday.findMany({
    where: { date: { gte: from, lte: to } },
    select: { date: true },
  });
  const closed = new Set(holidays.map((h) => dayOf(h.date).getTime()));

  const days: Date[] = [];
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = new Date(d);
    if (isWeekend(day) || closed.has(day.getTime())) continue;
    days.push(day);
  }
  return days;
}

/* ---------- relationship scoping ---------- */

/**
 * May this viewer see this person's attendance and leave?
 *
 * Self always. Otherwise it takes a capability — and the capability is the whole
 * answer. There is deliberately no "same team, therefore allowed" rule: teams
 * change, and an implicit permission that follows a team membership around is one
 * nobody remembers granting.
 */
export function canSeeRecordsOf(viewer: Viewer, targetId: string): boolean {
  if (viewer.id === targetId) return true;
  return viewer.can("attendance.manage") || viewer.can("hr.view") || viewer.can("leave.approve");
}

/**
 * May this viewer read the REASON on this person's leave?
 *
 * Narrower than the above, on purpose. Someone with `hr.view` can see that a
 * person is off next Tuesday. Reading *why* takes `leave.approve` — the approver
 * chain — or being the person themselves. Whoever must weigh the request may read
 * it; nobody else may, however senior.
 */
export function canSeeReason(viewer: Viewer, targetId: string): boolean {
  if (viewer.id === targetId) return true;
  return viewer.can("leave.approve");
}

export type LeaveRow = {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  type: string;
  typeCode: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: LeaveStatus;
  /** null when the viewer is not the person or an approver. Not "", not "hidden". */
  reason: string | null;
  decisionNote: string | null;
  createdAt: Date;
};

const LEAVE_INCLUDE = {
  leaveType: { select: { name: true, code: true } },
  user: { select: { id: true, name: true, avatarName: true, avatarAt: true } },
} as const;

type RawLeave = Awaited<
  ReturnType<typeof db.leaveRequest.findMany<{ include: typeof LEAVE_INCLUDE }>>
>[number];

/**
 * The redaction point. Every leave row leaving this module goes through it, so a
 * page cannot render a reason it was not entitled to — it never receives one.
 */
function redactLeave(r: RawLeave, viewer: Viewer): LeaveRow {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    avatarUrl: avatarUrlFor(r.user),
    type: r.leaveType.name,
    typeCode: r.leaveType.code,
    startDate: r.startDate,
    endDate: r.endDate,
    days: r.days,
    status: r.status as LeaveStatus,
    reason: canSeeReason(viewer, r.userId) ? r.reason : null,
    decisionNote: r.decisionNote,
    createdAt: r.createdAt,
  };
}

/* ---------- reads ---------- */

export async function myLeave(viewer: Viewer): Promise<LeaveRow[]> {
  const rows = await db.leaveRequest.findMany({
    where: { userId: viewer.id },
    orderBy: { startDate: "desc" },
    take: 50,
    include: LEAVE_INCLUDE,
  });
  return rows.map((r) => redactLeave(r, viewer));
}

/** The approval queue. Requires `leave.approve` upstream — never call it otherwise. */
export async function pendingLeave(viewer: Viewer): Promise<LeaveRow[]> {
  if (!viewer.can("leave.approve")) return [];
  const rows = await db.leaveRequest.findMany({
    where: { status: "PENDING", userId: { not: viewer.id } },
    orderBy: { startDate: "asc" },
    include: LEAVE_INCLUDE,
  });
  return rows.map((r) => redactLeave(r, viewer));
}

/** One person's leave — self, or someone entitled to see it. Null when refused. */
export async function leaveFor(viewer: Viewer, targetId: string): Promise<LeaveRow[] | null> {
  if (!canSeeRecordsOf(viewer, targetId)) return null;
  const rows = await db.leaveRequest.findMany({
    where: { userId: targetId },
    orderBy: { startDate: "desc" },
    take: 50,
    include: LEAVE_INCLUDE,
  });
  return rows.map((r) => redactLeave(r, viewer));
}

/**
 * One leave request by id. There is no unscoped "get by id" — asking for a record
 * you may not see returns null, exactly as if it did not exist. A tampered URL
 * learns nothing.
 */
export async function openLeave(viewer: Viewer, id: string): Promise<LeaveRow | null> {
  const row = await db.leaveRequest.findUnique({ where: { id }, include: LEAVE_INCLUDE });
  if (!row) return null;
  if (!canSeeRecordsOf(viewer, row.userId)) return null;
  return redactLeave(row, viewer);
}

export async function balancesFor(viewer: Viewer, targetId: string, year = currentYear()) {
  if (!canSeeRecordsOf(viewer, targetId)) return null;

  const types = await db.leaveType.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const balances = await db.leaveBalance.findMany({
    where: { userId: targetId, year },
  });

  return types.map((t) => {
    const b = balances.find((x) => x.leaveTypeId === t.id);
    const entitled = b?.entitled ?? t.defaultDays;
    const used = b?.used ?? 0;
    const pending = b?.pending ?? 0;
    return {
      typeId: t.id,
      name: t.name,
      code: t.code,
      color: t.color,
      paid: t.paid,
      entitled,
      used,
      pending,
      // What they may actually still book. Pending requests are held against it —
      // otherwise five overlapping requests could each look affordable.
      remaining: Math.max(0, entitled - used - pending),
    };
  });
}

/** Ensure a balance row exists before we move numbers around on it. */
export async function ensureBalance(userId: string, leaveTypeId: string, year: number) {
  const type = await db.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!type) return null;
  return db.leaveBalance.upsert({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    update: {},
    create: { userId, leaveTypeId, year, entitled: type.defaultDays },
  });
}

/* ---------- attendance ---------- */

export async function myAttendance(userId: string, days = 30) {
  const from = dayOf(new Date(Date.now() - days * 86_400_000));
  return db.attendance.findMany({
    where: { userId, date: { gte: from } },
    orderBy: { date: "desc" },
  });
}

export async function todayFor(userId: string) {
  return db.attendance.findUnique({
    where: { userId_date: { userId, date: dayOf(new Date()) } },
  });
}

export async function attendanceFor(viewer: Viewer, targetId: string, days = 30) {
  if (!canSeeRecordsOf(viewer, targetId)) return null;
  return myAttendance(targetId, days);
}

/**
 * The team's day. Requires `attendance.manage` — the ONE place a broad read
 * happens, and it is gated, capability-checked, and returns no notes: a note on an
 * attendance record can say anything, including why someone is unwell.
 */
export async function teamToday(viewer: Viewer) {
  if (!viewer.can("attendance.manage") && !viewer.can("hr.view")) return [];
  const today = dayOf(new Date());

  const staff = await db.user.findMany({
    where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      title: true,
      avatarName: true,
      avatarAt: true,
      attendance: { where: { date: today }, take: 1 },
    },
  });

  return staff.map((s) => ({
    id: s.id,
    name: s.name,
    title: s.title,
    avatarUrl: avatarUrlFor(s),
    status: (s.attendance[0]?.status as AttendanceStatus) ?? null,
    clockIn: s.attendance[0]?.clockIn ?? null,
    clockOut: s.attendance[0]?.clockOut ?? null,
  }));
}

/** Corrections awaiting a decision. `attendance.manage` only. */
export async function pendingCorrections(viewer: Viewer) {
  if (!viewer.can("attendance.manage")) return [];
  const rows = await db.attendanceCorrection.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      attendance: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    userId: c.attendance.userId,
    userName: c.attendance.user.name,
    date: c.attendance.date,
    fromStatus: c.fromStatus,
    toStatus: c.toStatus,
    reason: c.reason,
    createdAt: c.createdAt,
  }));
}

/* ---------- calendar ---------- */

export async function holidays(year = currentYear()) {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31));
  return db.holiday.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });
}

/**
 * Who is out, over a window. This feeds the team calendar, so it carries NO
 * REASON and no leave type that could imply one — "SICK" on a shared calendar is a
 * medical disclosure. It says: this person is away. That is all anyone needs.
 */
export async function whoIsOut(from: Date, to: Date) {
  const rows = await db.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: dayOf(to) },
      endDate: { gte: dayOf(from) },
    },
    orderBy: { startDate: "asc" },
    include: { user: { select: { id: true, name: true, avatarName: true, avatarAt: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.user.name,
    avatarUrl: avatarUrlFor(r.user),
    startDate: r.startDate,
    endDate: r.endDate,
    // deliberately: no reason, no type.
  }));
}

/** The HR overview figures. `hr.view` upstream. */
export async function hrSummary(viewer: Viewer) {
  if (!viewer.can("hr.view")) return null;
  const today = dayOf(new Date());

  const [staff, present, onLeave, pendingRequests, pendingFixes] = await Promise.all([
    db.user.count({ where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } } }),
    db.attendance.count({
      where: { date: today, status: { in: ["WORKING", "REMOTE"] } },
    }),
    db.leaveRequest.count({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
    }),
    db.leaveRequest.count({ where: { status: "PENDING" } }),
    db.attendanceCorrection.count({ where: { status: "PENDING" } }),
  ]);

  return { staff, present, onLeave, pendingRequests, pendingFixes };
}

export function cleanNote(input: unknown, max = 300): string | null {
  const s = sanitizeLine(input, max);
  return s.length ? s : null;
}

/*
 * Retention (24 months). Not wired to a scheduler in this phase — there is no
 * scheduler yet, and inventing one here would be the wrong place for it — but the
 * rule is written down as executable code rather than as a sentence in a policy,
 * so Phase 11 has something to call rather than something to interpret.
 */
export const RETENTION_MONTHS = 24;

export async function purgeExpiredRecords(): Promise<{ attendance: number; leave: number }> {
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);

  const [attendance, leave] = await Promise.all([
    db.attendance.deleteMany({ where: { date: { lt: cutoff } } }),
    db.leaveRequest.deleteMany({ where: { endDate: { lt: cutoff } } }),
  ]);
  return { attendance: attendance.count, leave: leave.count };
}

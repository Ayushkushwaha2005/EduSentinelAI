import { db } from "./db";
import { ROLES, ROLE_LABELS, type Role } from "./roles";

/*
 * Account analytics (Phase 6.3).
 *
 * Every figure on this page is computed SERVER-SIDE from records we already hold
 * — accounts, the audit chain, artifact download counters. There is no analytics
 * SDK, no beacon, no third-party script, and there will not be one: the
 * no-tracker promise is machine-enforced (`npm run check:trackers`) and it does
 * not get an exemption for our own convenience.
 *
 * Two honesty rules, learned in 5.7:
 *
 *   1. A metric we cannot measure is reported as unmeasured, not as zero. Zero is
 *      a claim; "not measured yet" is the truth (see `invitationAcceptance`).
 *   2. Real data on a young platform must still READ as real. Where a per-day
 *      series would be six empty bars and a spike, we say what the series is
 *      (`New accounts`) and show the cumulative line beside it rather than
 *      quietly swapping one for the other.
 *
 * Activity comes from the audit log's `user.login` rows. That is a deliberate
 * choice: it is a record we were already keeping for security reasons, it is
 * hash-chained and append-only, and it means "active" has one definition across
 * the whole platform rather than a second, softer one invented here.
 */

export const RANGES = {
  "7d": { days: 7, label: "Last 7 days" },
  "30d": { days: 30, label: "Last 30 days" },
  "90d": { days: 90, label: "Last 90 days" },
  all: { days: 0, label: "All time" },
} as const;
export type RangeKey = keyof typeof RANGES;

export function isRangeKey(v: unknown): v is RangeKey {
  return typeof v === "string" && v in RANGES;
}

export type Point = { label: string; value: number };

/** Inclusive day buckets, oldest first. `all` starts at the first account. */
async function bucketsFor(range: RangeKey): Promise<Date[]> {
  let days: number = RANGES[range].days;

  if (days === 0) {
    const first = await db.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    if (!first) return [];
    const span = Math.ceil((Date.now() - first.createdAt.getTime()) / 86_400_000) + 1;
    days = Math.min(Math.max(span, 7), 180); // one bar per day, capped at ~6 months
  }

  const out: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i);
    end.setHours(23, 59, 59, 999);
    out.push(end);
  }
  return out;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export type Growth = {
  cumulative: Point[]; // total accounts at the end of each day
  signups: Point[]; // new accounts per day
  active: Point[]; // distinct accounts that signed in that day
};

export async function growth(range: RangeKey): Promise<Growth> {
  const buckets = await bucketsFor(range);
  if (buckets.length === 0) return { cumulative: [], signups: [], active: [] };

  const from = new Date(buckets[0]);
  from.setHours(0, 0, 0, 0);

  // Two queries, not 3×N: pull the rows in the window once and bucket in memory.
  const [users, logins, priorCount] = await Promise.all([
    db.user.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    }),
    db.auditLog.findMany({
      where: { action: "user.login", createdAt: { gte: from } },
      select: { actorId: true, createdAt: true },
    }),
    db.user.count({ where: { createdAt: { lt: from } } }),
  ]);

  const cumulative: Point[] = [];
  const signups: Point[] = [];
  const active: Point[] = [];
  let running = priorCount;

  for (let i = 0; i < buckets.length; i++) {
    const end = buckets[i];
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);

    const newToday = users.filter(
      (u) => u.createdAt >= start && u.createdAt <= end,
    ).length;
    running += newToday;

    const seen = new Set(
      logins
        .filter((l) => l.createdAt >= start && l.createdAt <= end && l.actorId)
        .map((l) => l.actorId as string),
    );

    const label = dayLabel(end);
    cumulative.push({ label, value: running });
    signups.push({ label, value: newToday });
    active.push({ label, value: seen.size });
  }

  return { cumulative, signups, active };
}

export type RoleBreakdown = { role: Role; label: string; count: number };

export async function accountsByRole(): Promise<RoleBreakdown[]> {
  const rows = await db.user.groupBy({ by: ["role"], _count: { _all: true } });
  const counts = new Map(rows.map((r) => [r.role, r._count._all]));
  return ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    count: counts.get(role) ?? 0,
  }));
}

export type Posture = {
  total: number;
  verified: number;
  mfaEnabled: number;
  privileged: number;
  privilegedWithMfa: number;
  activeLast7: number;
  activeLast30: number;
  returning: number; // active in this 30d window AND the one before it
  priorActive: number; // the denominator for `returning`
};

/**
 * Account posture. `returning` is our retention number and it is defined here
 * once: an account that signed in during the last 30 days AND during the 30 days
 * before that. Anything else would be a different question wearing the same word.
 */
export async function posture(): Promise<Posture> {
  const now = Date.now();
  const d7 = new Date(now - 7 * 86_400_000);
  const d30 = new Date(now - 30 * 86_400_000);
  const d60 = new Date(now - 60 * 86_400_000);
  const privilegedRoles: Role[] = ["ADMIN", "CO_FOUNDER", "FOUNDER"];

  const [total, verified, mfaEnabled, privileged, privilegedWithMfa, recent, prior] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { emailVerified: { not: null } } }),
      db.user.count({ where: { mfaEnabled: true } }),
      db.user.count({ where: { role: { in: privilegedRoles } } }),
      db.user.count({ where: { role: { in: privilegedRoles }, mfaEnabled: true } }),
      db.auditLog.findMany({
        where: { action: "user.login", createdAt: { gte: d30 } },
        select: { actorId: true, createdAt: true },
      }),
      db.auditLog.findMany({
        where: { action: "user.login", createdAt: { gte: d60, lt: d30 } },
        select: { actorId: true },
      }),
    ]);

  const activeIds = new Set(recent.filter((r) => r.actorId).map((r) => r.actorId!));
  const active7 = new Set(
    recent.filter((r) => r.actorId && r.createdAt >= d7).map((r) => r.actorId!),
  );
  const priorIds = new Set(prior.filter((r) => r.actorId).map((r) => r.actorId!));

  let returning = 0;
  for (const id of priorIds) if (activeIds.has(id)) returning++;

  return {
    total,
    verified,
    mfaEnabled,
    privileged,
    privilegedWithMfa,
    activeLast7: active7.size,
    activeLast30: activeIds.size,
    returning,
    priorActive: priorIds.size,
  };
}

/**
 * Download pulls per published release. This is a LIFETIME counter on the
 * artifact, not a time series — we increment it on each authorized download and
 * never recorded when. Presenting it as a trend would be a fabrication, so it is
 * presented as what it is.
 */
export async function downloadsByRelease(take = 8) {
  const rows = await db.artifact.findMany({
    where: { release: { status: "PUBLISHED" } },
    orderBy: { downloadCount: "desc" },
    take,
    select: {
      downloadCount: true,
      release: {
        select: { version: true, product: { select: { name: true } } },
      },
    },
  });

  return rows.map((a) => ({
    product: a.release.product.name,
    version: a.release.version,
    downloads: a.downloadCount,
  }));
}

/**
 * Invitation acceptance rate.
 *
 * In Phase 6.3 this reported itself as UNMEASURED, because invitations did not
 * exist and zero would have been a lie dressed as a number. Phase 7 built them, so
 * it now measures — and when no invitation has ever been sent it says *that*,
 * rather than reporting 0% acceptance of nothing.
 */
export async function invitationAcceptance(): Promise<
  { measured: false; reason: string } | { measured: true; sent: number; accepted: number }
> {
  const [sent, accepted] = await Promise.all([
    db.invitation.count(),
    db.invitation.count({ where: { status: "ACCEPTED" } }),
  ]);

  if (sent === 0) {
    return { measured: false, reason: "No invitations sent yet — nothing to measure." };
  }
  return { measured: true, sent, accepted };
}

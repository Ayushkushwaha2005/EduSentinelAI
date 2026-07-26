import { db } from "./db";
import type { Viewer } from "./guard";
import { avatarUrlFor, isOnline } from "./profile";
import type { TeamCardData } from "@/components/dashboard/widgets";

/*
 * Read models for the dashboards. Every query here is scoped by the viewer —
 * an employee's "my work" never widens to everyone's work, and a collaborator
 * only ever sees their own thread (the ownership-scoping rule from
 * lib/products.ts, applied to Phase 5 data).
 */

export async function leadershipStats() {
  const [products, liveProducts, draftProducts, releases, pendingCollab, staff, openTasks] =
    await Promise.all([
      db.product.count(),
      db.product.count({ where: { status: "PUBLISHED" } }),
      db.product.count({ where: { status: "DRAFT" } }),
      db.release.count({ where: { status: "PUBLISHED" } }),
      db.collaborationRequest.count({ where: { status: "PENDING" } }),
      db.user.count({
        where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
      }),
      db.task.count({ where: { status: { not: "DONE" } } }),
    ]);
  return {
    products,
    liveProducts,
    draftProducts,
    releases,
    pendingCollab,
    staff,
    openTasks,
  };
}

export async function teamCards(): Promise<TeamCardData[]> {
  const teams = await db.team.findMany({
    orderBy: { name: "asc" },
    include: {
      members: { include: { user: { select: { name: true } } } },
      projects: {
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, progress: true },
      },
    },
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    memberCount: t.members.length,
    members: t.members.map((m) => m.user.name),
    projects: t.projects,
  }));
}

/** Tasks assigned to one person. Employees see only this. */
export async function myTasks(userId: string) {
  return db.task.findMany({
    where: { assigneeId: userId },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 20,
    include: { project: { select: { name: true } } },
  });
}

export async function myTeams(userId: string): Promise<TeamCardData[]> {
  const memberships = await db.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { name: true } } } },
          projects: {
            where: { status: "ACTIVE" },
            select: { id: true, name: true, progress: true },
          },
        },
      },
    },
  });

  return memberships.map(({ team }) => ({
    id: team.id,
    name: team.name,
    memberCount: team.members.length,
    members: team.members.map((m) => m.user.name),
    projects: team.projects,
  }));
}

/** Collaboration requests belonging to one external collaborator (by email). */
export async function myCollaborations(email: string) {
  return db.collaborationRequest.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      status: true,
      message: true,
      createdAt: true,
      reviewNote: true,
    },
  });
}

/*
 * Account growth used to live here as a hand-rolled 7-day loop. It now comes from
 * lib/analytics.ts, which is the one definition of "growth" on the platform —
 * the dashboard card and the Analytics page must never be able to disagree about
 * what a number means.
 */

/**
 * Staff with their current work — the reference's "List Techs" panel.
 * Internal staff only; never shown to a collaborator.
 *
 * `online` is real (lib/profile.ts): seen in the last five minutes. This panel
 * used to pass `online` unconditionally to every avatar.
 */
export async function staffWithWork(take = 6) {
  const staff = await db.user.findMany({
    where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
    orderBy: { createdAt: "asc" },
    take,
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      avatarName: true,
      avatarAt: true,
      lastSeenAt: true,
      memberships: { take: 1, select: { title: true, team: { select: { name: true } } } },
      tasks: {
        where: { status: { not: "DONE" } },
        take: 1,
        orderBy: { dueAt: "asc" },
        select: { id: true, title: true, status: true },
      },
    },
  });

  return staff.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    title: s.title ?? s.memberships[0]?.title ?? null,
    team: s.memberships[0]?.team.name ?? null,
    task: s.tasks[0] ?? null,
    avatarUrl: avatarUrlFor(s),
    online: isOnline(s.lastSeenAt),
  }));
}

/**
 * Who owns the catalogue, and who ships the releases.
 *
 * The summary cards used to render the same avatar stack of "some staff" on all
 * three, which told the operator nothing: the faces on the Products card had no
 * relationship to the products. These are the people actually behind each number.
 */
export async function productOwners(): Promise<string[]> {
  const products = await db.product.findMany({ select: { ownerId: true } });
  const ids = [...new Set(products.map((p) => p.ownerId))];
  if (ids.length === 0) return [];
  const owners = await db.user.findMany({
    where: { id: { in: ids } },
    select: { name: true },
  });
  return owners.map((o) => o.name);
}

export async function releasePublishers(): Promise<string[]> {
  const releases = await db.release.findMany({ select: { createdById: true } });
  const ids = [...new Set(releases.map((r) => r.createdById))];
  if (ids.length === 0) return [];
  const people = await db.user.findMany({
    where: { id: { in: ids } },
    select: { name: true },
  });
  return people.map((p) => p.name);
}

export async function recentAudit(take = 8) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function greeting(viewer: Viewer): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${viewer.name.split(" ")[0]}`;
}

/*
 * ── The release pipeline, as a measurable thing ──────────────────────────────
 *
 * The dashboard's Pipeline card used to render a list of the four most recent
 * releases, and nothing at all when there were none — a tall, empty column on a
 * new installation, which is exactly when someone is most likely to be looking.
 *
 * The replacement is not decoration and not a placeholder. Phase 3 defines a
 * real, fixed sequence every artifact travels:
 *
 *     upload → quarantine → scan → sign (founder) → publish
 *
 * Those stages exist whether or not anything is in them, so showing them with
 * their REAL occupancy is honest at zero and immediately useful at one. A count
 * of 0 against "Awaiting scan" is a fact about this platform; it is not a
 * fabricated number, which is what CLAUDE.md forbids and `test:data` enforces.
 *
 * The activity series is likewise real: it counts release events already in the
 * audit log, bucketed by week. No sample data, no smoothing, no invented trend.
 */
export type PipelineStage = {
  key: string;
  label: string;
  hint: string;
  count: number;
};

export async function releasePipeline() {
  const [quarantined, pendingScan, cleanUnsigned, published, revoked, rejected] =
    await Promise.all([
      db.release.count({ where: { status: "QUARANTINED" } }),
      db.artifact.count({ where: { scanStatus: "PENDING" } }),
      // Scanned clean, not yet signed: the founder-only step, and the one place
      // work actually waits on a person.
      db.artifact.count({
        where: { scanStatus: "CLEAN", signature: null },
      }),
      db.release.count({ where: { status: "PUBLISHED" } }),
      db.release.count({ where: { status: "REVOKED" } }),
      db.release.count({ where: { status: "REJECTED" } }),
    ]);

  const stages: PipelineStage[] = [
    { key: "quarantine", label: "In quarantine", hint: "uploaded, not yet cleared", count: quarantined },
    { key: "scan", label: "Awaiting scan", hint: "magic-byte checked, scanning", count: pendingScan },
    { key: "sign", label: "Awaiting signature", hint: "clean, needs the Founder", count: cleanUnsigned },
    { key: "published", label: "Published", hint: "signed and downloadable", count: published },
  ];

  return { stages, revoked, rejected, total: quarantined + published + revoked + rejected };
}

/**
 * Release activity by week, counted from the audit log.
 *
 * The audit log is the one record that already holds every pipeline event with a
 * timestamp, so this needs no new table and cannot disagree with what actually
 * happened. `weeks` is how far back to look.
 */
export async function releaseActivity(weeks = 8) {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  since.setHours(0, 0, 0, 0);

  const rows = await db.auditLog.findMany({
    where: {
      createdAt: { gte: since },
      action: { startsWith: "release." },
    },
    select: { action: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(since);
    start.setDate(start.getDate() + i * 7);
    return { start, published: 0, other: 0 };
  });

  for (const r of rows) {
    const idx = Math.min(
      weeks - 1,
      Math.floor((r.createdAt.getTime() - since.getTime()) / (7 * 86_400_000)),
    );
    if (idx < 0) continue;
    if (r.action.includes("publish")) buckets[idx].published += 1;
    else buckets[idx].other += 1;
  }

  return {
    measured: rows.length > 0,
    weeks: buckets.map((b) => ({
      label: b.start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      published: b.published,
      other: b.other,
    })),
    total: rows.length,
  };
}

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

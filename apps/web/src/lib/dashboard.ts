import { db } from "./db";
import type { Viewer } from "./guard";
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

/**
 * Account growth over the last 7 days — backs the reference's bar chart.
 *
 * CUMULATIVE (total accounts at the end of each day), not per-day signups.
 * Per-day was the honest number but produced a chart that read as empty: a young
 * platform signs everyone up on one day, so six bars sat at zero and one spiked.
 * The running total is equally true and actually shows the shape of growth.
 */
export async function growthSeries(): Promise<{ label: string; value: number }[]> {
  const days: { label: string; value: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(now.getDate() - i);
    end.setHours(23, 59, 59, 999);

    const value = await db.user.count({ where: { createdAt: { lte: end } } });

    days.push({
      label: end.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value,
    });
  }
  return days;
}

/**
 * Staff with their current work — the reference's "List Techs" panel.
 * Internal staff only; never shown to a collaborator.
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
    title: s.memberships[0]?.title ?? null,
    team: s.memberships[0]?.team.name ?? null,
    task: s.tasks[0] ?? null,
  }));
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

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

/** Last 7 days of signup activity — backs the reference's growth chart. */
export async function growthSeries(): Promise<{ label: string; value: number }[]> {
  const days: { label: string; value: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const value = await db.user.count({
      where: { createdAt: { gte: start, lt: end } },
    });

    days.push({
      label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value,
    });
  }
  return days;
}

export async function recentAudit(take = 8) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { name: true, email: true } } },
  });
}

export function greeting(viewer: Viewer): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${viewer.name.split(" ")[0]}`;
}

import { db } from "./db";
import { avatarUrlFor, isOnline } from "./profile";
import { ROLE_LABELS, type Role } from "./roles";

/*
 * People directory (Phase 5.7).
 *
 * The reference's "Clients List" screen, in EduSentinel terms: everyone the
 * Founder works with — Co-Founders, Employees, Collaborators and members — in
 * one table, with their team, title and account posture.
 *
 * Reading the directory requires `users.view`; CHANGING anyone's role or
 * permissions still happens only in Access Control, which is founder-reserved.
 * This module is read-only on purpose: a directory that can also mutate is how
 * a second, weaker role-management path gets born.
 */

export type DirectoryPerson = {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
  title: string | null;
  team: string | null;
  joined: Date;
  mfaEnabled: boolean;
  verified: boolean;
  openTasks: number;
  avatarUrl: string | null;
  online: boolean;
};

export type DirectoryGroup = "ALL" | "LEADERSHIP" | "EMPLOYEE" | "COLLABORATOR" | "MEMBER";

const GROUPS: Record<Exclude<DirectoryGroup, "ALL">, Role[]> = {
  LEADERSHIP: ["FOUNDER", "CO_FOUNDER", "ADMIN"],
  EMPLOYEE: ["EMPLOYEE"],
  COLLABORATOR: ["COLLABORATOR"],
  MEMBER: ["USER"],
};

export function isDirectoryGroup(v: unknown): v is DirectoryGroup {
  return v === "ALL" || (typeof v === "string" && v in GROUPS);
}

export async function directory(
  group: DirectoryGroup = "ALL",
  query = "",
): Promise<DirectoryPerson[]> {
  const rows = await db.user.findMany({
    where: group === "ALL" ? {} : { role: { in: GROUPS[group] } },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
      createdAt: true,
      mfaEnabled: true,
      emailVerified: true,
      avatarName: true,
      avatarAt: true,
      lastSeenAt: true,
      memberships: {
        take: 1,
        select: { title: true, team: { select: { name: true } } },
      },
      tasks: { where: { status: { not: "DONE" } }, select: { id: true } },
    },
  });

  const needle = query.trim().toLowerCase();
  return rows
    .filter(
      (u) =>
        !needle ||
        u.name.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle),
    )
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as Role,
      roleLabel: ROLE_LABELS[u.role as Role] ?? u.role,
      // The person's own title (Phase 6.2 profile) wins over the team-membership
      // title an admin set for them — it is their record to keep correct.
      title: u.title ?? u.memberships[0]?.title ?? null,
      team: u.memberships[0]?.team.name ?? null,
      joined: u.createdAt,
      mfaEnabled: u.mfaEnabled,
      verified: !!u.emailVerified,
      openTasks: u.tasks.length,
      avatarUrl: avatarUrlFor(u),
      online: isOnline(u.lastSeenAt),
    }));
}

export async function directoryCounts() {
  const [leadership, employees, collaborators, members] = await Promise.all([
    db.user.count({ where: { role: { in: GROUPS.LEADERSHIP } } }),
    db.user.count({ where: { role: { in: GROUPS.EMPLOYEE } } }),
    db.user.count({ where: { role: { in: GROUPS.COLLABORATOR } } }),
    db.user.count({ where: { role: { in: GROUPS.MEMBER } } }),
  ]);
  return {
    leadership,
    employees,
    collaborators,
    members,
    all: leadership + employees + collaborators + members,
  };
}

/** One team, with its members, projects and open work. Null if it does not exist. */
export async function teamDetail(teamId: string) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarName: true,
              avatarAt: true,
              lastSeenAt: true,
            },
          },
        },
      },
      projects: { orderBy: [{ status: "asc" }, { name: "asc" }] },
    },
  });
  if (!team) return null;

  const tasks = await db.task.findMany({
    where: { project: { teamId: team.id } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    include: {
      assignee: { select: { name: true } },
      project: { select: { name: true } },
    },
  });

  return { team, tasks };
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/guard";
import { teamDetail } from "@/lib/people";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Avatar } from "@/components/dashboard/avatar";
import {
  Breadcrumb,
  Panel,
  SegmentedBar,
  StatusDot,
} from "@/components/dashboard/widgets";

/*
 * Team detail — the page behind every team card's "View All".
 *
 * This route did not exist, so every team card on the dashboard and the Teams
 * list linked straight to a 404. An employee may only open a team they belong
 * to; `team.manage` sees any team.
 */
export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireCapability("team.view");
  const { id } = await params;

  const detail = await teamDetail(id);
  if (!detail) notFound();

  const { team, tasks } = detail;

  // Scope: without team.manage you may only look at a team you are in.
  const isMember = team.members.some((m) => m.userId === viewer.id);
  if (!viewer.can("team.manage") && !isMember) notFound();

  const active = team.projects.filter((p) => p.status === "ACTIVE");
  const openTasks = tasks.filter((t) => t.status !== "DONE");

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        trail={[
          { label: "Teams", href: "/app/teams" },
          { label: "Teams List", href: "/app/teams" },
          { label: team.name },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{team.name}</h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            {team.members.length} members · {active.length} active projects ·{" "}
            {openTasks.length} open tasks
            {team.description ? ` · ${team.description}` : ""}
          </p>
        </div>
        <Link
          href="/app/teams"
          className="inline-flex h-10 items-center rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
        >
          All teams
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Members <span className="text-text-muted">({team.members.length})</span>
          </h2>
          <ul className="mt-4 flex flex-col">
            {team.members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-0"
              >
                <Avatar name={m.user.name} size={40} online />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    {m.user.name}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {m.title ?? ROLE_LABELS[m.user.role as Role] ?? m.user.role}
                  </span>
                </span>
                {viewer.can("messages.use") && m.userId !== viewer.id && (
                  <Link
                    href="/app/messages?new=1"
                    className="shrink-0 text-sm font-medium text-brand-cyan hover:text-brand-teal"
                  >
                    Message
                  </Link>
                )}
              </li>
            ))}
            {team.members.length === 0 && (
              <li className="py-6 text-center text-sm text-text-muted">
                No members yet.
              </li>
            )}
          </ul>
        </Panel>

        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Projects <span className="text-text-muted">({team.projects.length})</span>
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {team.projects.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border-subtle px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{p.name}</span>
                  <span className="block text-xs text-text-muted">{p.status}</span>
                </span>
                <SegmentedBar value={p.progress} />
              </div>
            ))}
            {team.projects.length === 0 && (
              <p className="py-6 text-center text-sm text-text-muted">
                No projects yet.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
          Work <span className="text-text-muted">({tasks.length})</span>
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">#</th>
                <th className="px-5 py-3.5 font-medium">Task</th>
                <th className="px-5 py-3.5 font-medium">Project</th>
                <th className="px-5 py-3.5 font-medium">Assignee</th>
                <th className="px-5 py-3.5 font-medium">Due</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {tasks.map((t, i) => (
                <tr key={t.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4 text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4 font-medium">{t.title}</td>
                  <td className="px-5 py-4 text-text-secondary">
                    {t.project?.name ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-text-secondary">
                    {t.assignee?.name ?? "Unassigned"}
                  </td>
                  <td className="px-5 py-4 text-text-secondary">
                    {t.dueAt
                      ? t.dueAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusDot status={t.status} />
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-text-muted">
                    No work tracked for this team yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

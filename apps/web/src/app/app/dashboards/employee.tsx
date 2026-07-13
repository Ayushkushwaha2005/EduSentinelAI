import Link from "next/link";
import type { Viewer } from "@/lib/guard";
import { greeting, myTasks, myTeams } from "@/lib/dashboard";
import { productsFor } from "@/lib/products";
import { ClipboardIcon, UsersIcon, BoxIcon } from "@/components/dashboard/icons";
import {
  Breadcrumb,
  Pagination,
  Panel,
  StatCard,
  StatusDot,
  TableToolbar,
  TeamCard,
} from "@/components/dashboard/widgets";

/*
 * Employee dashboard — same shell, scoped content. An employee sees their own
 * assigned work and their own teams; queries are scoped by viewer.id in
 * lib/dashboard.ts, so this page cannot surface anyone else's workload even if
 * the UI were tampered with.
 */
export default async function EmployeeDashboard({ viewer }: { viewer: Viewer }) {
  const [tasks, teams, products] = await Promise.all([
    myTasks(viewer.id),
    myTeams(viewer.id),
    // The Products card's subtitle used to be the literal string "EduSentinel
    // product registry" — a label pretending to be a figure. `productsFor` is the
    // ownership-scoped helper (R12), so this counts what this employee may
    // actually open, not what exists.
    viewer.can("products.view")
      ? productsFor(viewer.id, viewer.role)
      : Promise.resolve([]),
  ]);

  const open = tasks.filter((t) => t.status !== "DONE");
  const teammates = [...new Set(teams.flatMap((t) => t.members))];

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          {greeting(viewer)}
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Your work at EduSentinel AI — assigned tasks, teams and products.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          icon={<ClipboardIcon size={26} />}
          title="My Tasks"
          subtitle={`Open tasks (${open.length})`}
          people={teammates}
          href="/app/tasks"
        />
        <StatCard
          icon={<UsersIcon size={26} />}
          title="My Teams"
          subtitle={`Teams (${teams.length})`}
          people={teammates}
          href="/app/teams"
        />
        <StatCard
          icon={<BoxIcon size={26} />}
          title="Products"
          subtitle={
            products.length === 1
              ? "1 product you can open"
              : `${products.length} products you can open`
          }
          href={viewer.can("products.view") ? "/app/products" : undefined}
        />
      </div>

      <Panel>
        <TableToolbar title="Assigned Tasks" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">#</th>
                <th className="px-5 py-3.5 font-medium">Task</th>
                <th className="px-5 py-3.5 font-medium">Project</th>
                <th className="px-5 py-3.5 font-medium">Priority</th>
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
                  <td className="px-5 py-4 text-text-secondary">{t.priority}</td>
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
                    Nothing assigned to you yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination shown={tasks.length} total={tasks.length} />
      </Panel>

      {teams.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Need access?</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
          Permissions at EduSentinel are granted per person by the Founder. If
          you need a capability you do not currently have, request it through
          your team lead — it will be granted explicitly and recorded in the
          audit log.
        </p>
        <Link
          href="/app/security"
          className="mt-4 inline-flex h-10 items-center rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover"
        >
          Review account security
        </Link>
      </Panel>
    </div>
  );
}

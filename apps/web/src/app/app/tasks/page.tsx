import { requireViewer } from "@/lib/guard";
import { myTasks } from "@/lib/dashboard";
import { db } from "@/lib/db";
import {
  Breadcrumb,
  Pagination,
  Panel,
  StatusDot,
  TableToolbar,
} from "@/components/dashboard/widgets";
import { Avatar } from "@/components/dashboard/avatar";
import { StatusControl, TaskCreator } from "./manage";

/*
 * Task board. Everyone reaches this page (it is their own work), but the scope
 * widens with capability: team.manage sees and assigns all tasks, everyone else
 * sees only the tasks assigned to them and may only move those.
 */
export default async function TasksPage() {
  const viewer = await requireViewer();
  const canManage = viewer.can("team.manage");

  const tasks = canManage
    ? await db.task.findMany({
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        take: 50,
        include: {
          project: { select: { name: true } },
          assignee: { select: { id: true, name: true } },
        },
      })
    : (await myTasks(viewer.id)).map((t) => ({
        ...t,
        assignee: { id: viewer.id, name: viewer.name },
      }));

  const [projects, staff] = canManage
    ? await Promise.all([
        db.project.findMany({
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        db.user.findMany({
          where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
      ])
    : [[], []];

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Tasks" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Tasks</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          {canManage ? "All open work across the teams." : "Work assigned to you."}
        </p>
      </div>

      {canManage && <TaskCreator projects={projects} staff={staff} />}

      <Panel>
        <TableToolbar title={canManage ? "All Tasks" : "My Tasks"} />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">#</th>
                <th className="px-5 py-3.5 font-medium">Task</th>
                <th className="px-5 py-3.5 font-medium">Project</th>
                <th className="px-5 py-3.5 font-medium">Assignee</th>
                <th className="px-5 py-3.5 font-medium">Priority</th>
                <th className="px-5 py-3.5 font-medium">Due</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {tasks.map((t, i) => {
                // Mirrors the server rule in setTaskStatusAction: the assignee,
                // or anyone holding team.manage.
                const mayMove = canManage || t.assignee?.id === viewer.id;
                return (
                  <tr key={t.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-4 text-text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-5 py-4 font-medium">{t.title}</td>
                    <td className="px-5 py-4 text-text-secondary">
                      {t.project?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      {t.assignee ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={t.assignee.name} size={28} />
                          <span className="text-text-secondary">{t.assignee.name}</span>
                        </span>
                      ) : (
                        <span className="text-text-muted">Unassigned</span>
                      )}
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
                    <td className="px-5 py-4">
                      {mayMove ? (
                        <StatusControl taskId={t.id} status={t.status} />
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-text-muted">
                    No tasks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination shown={tasks.length} total={tasks.length} />
      </Panel>
    </div>
  );
}

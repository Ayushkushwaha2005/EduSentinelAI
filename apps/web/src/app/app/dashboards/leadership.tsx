import Link from "next/link";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/guard";
import {
  growthSeries,
  greeting,
  leadershipStats,
  recentAudit,
  staffWithWork,
  teamCards,
} from "@/lib/dashboard";
import { directory } from "@/lib/people";
import { BoxIcon, ServerIcon, UsersIcon } from "@/components/dashboard/icons";
import { Avatar } from "@/components/dashboard/avatar";
import {
  Breadcrumb,
  GrowthChart,
  Pagination,
  Panel,
  StatCard,
  StatusDot,
  TableToolbar,
  TeamCard,
} from "@/components/dashboard/widgets";

/*
 * Founder + Co-Founder dashboard, laid out from the reference: three summary
 * cards, a directory table, the growth chart beside a staff panel, then the team
 * grid. Identical operational view for both roles — the difference is authority,
 * not information: founder-reserved actions (sign, revoke, manage roles and
 * permissions) are absent for the Co-Founder because lib/permissions.ts never
 * puts those capabilities in their effective set.
 */
export default async function LeadershipDashboard({ viewer }: { viewer: Viewer }) {
  const [stats, teams, growth, audit, releases, people, staff] = await Promise.all([
    leadershipStats(),
    teamCards(),
    growthSeries(),
    recentAudit(5),
    db.release.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        product: { select: { name: true } },
        artifact: { select: { scanStatus: true } },
      },
    }),
    viewer.can("users.view") ? directory("ALL") : [],
    staffWithWork(6),
  ]);

  const staffNames = staff.map((s) => s.name);
  const isFounder = viewer.role === "FOUNDER";

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
            {greeting(viewer)}
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            {isFounder
              ? "You hold full authority over EduSentinel AI — access, releases and permissions."
              : "Co-Founder view. Release signing and access control remain with the Founder."}
          </p>
        </div>
      </div>

      {/* ---- summary cards ---- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          icon={<BoxIcon size={26} />}
          title="Products"
          subtitle={`${stats.liveProducts} live · ${stats.draftProducts} draft`}
          people={staffNames}
          href="/app/products"
        />
        <StatCard
          icon={<ServerIcon size={26} />}
          title="Releases"
          subtitle={`${stats.releases} published`}
          people={staffNames}
          href="/app/admin/releases"
        />
        <StatCard
          icon={<UsersIcon size={26} />}
          title="Team"
          subtitle={`${stats.staff} staff · ${stats.openTasks} open tasks`}
          people={staffNames}
          href="/app/people"
        />
      </div>

      {/* ---- directory (reference's main table) ---- */}
      {viewer.can("users.view") && (
        <Panel>
          <TableToolbar
            title="People"
            onAddHref={viewer.can("users.manage_roles") ? "/app/access" : undefined}
            addLabel="Manage"
            searchPath="/app/people"
            exportName="edusentinel-people"
            exportRows={people.map((p) => ({
              name: p.name,
              email: p.email,
              role: p.roleLabel,
              team: p.team ?? "",
              twoFactor: p.mfaEnabled ? "on" : "off",
            }))}
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                  <th className="rounded-l-card px-5 py-3.5 font-medium">#</th>
                  <th className="px-5 py-3.5 font-medium">Name</th>
                  <th className="px-5 py-3.5 font-medium">Email</th>
                  <th className="px-5 py-3.5 font-medium">Role</th>
                  <th className="px-5 py-3.5 font-medium">Team</th>
                  <th className="px-5 py-3.5 font-medium">Security</th>
                  <th className="rounded-r-card px-5 py-3.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {people.slice(0, 5).map((p, i) => (
                  <tr key={p.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-4 text-text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={p.name} size={30} />
                        <span className="font-medium">{p.name}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{p.email}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-surface-overlay px-2.5 py-1 text-xs font-semibold text-text-secondary">
                        {p.roleLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{p.team ?? "—"}</td>
                    <td className="px-5 py-4">
                      <StatusDot status={p.mfaEnabled ? "Active" : "PENDING"} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-3 text-sm font-medium">
                        <Link href="/app/people" className="text-brand-cyan hover:text-brand-teal">
                          View
                        </Link>
                        {viewer.can("users.manage_roles") && p.role !== "FOUNDER" && (
                          <Link href="/app/access" className="text-brand-cyan hover:text-brand-teal">
                            Manage
                          </Link>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
                {people.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-text-muted">
                      No accounts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination shown={Math.min(5, people.length)} total={people.length} />
        </Panel>
      )}

      {/* ---- growth chart + staff panel ---- */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <GrowthChart title="Account Growth" caption="Last 7 days" data={growth} />

        <Panel>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Team</h2>
            <Link href="/app/people" className="text-sm font-medium text-brand-cyan">
              View all
            </Link>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {staff.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-card border border-border-subtle p-3"
              >
                <Avatar name={s.name} size={38} online />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-text-muted">
                    {s.title ?? s.role} {s.team ? `· ${s.team}` : ""}
                  </span>
                  {s.task && (
                    <span className="mt-0.5 block truncate text-xs text-text-secondary">
                      {s.task.title}
                    </span>
                  )}
                </span>
                <Link
                  href="/app/tasks"
                  className="shrink-0 text-sm font-medium text-brand-cyan hover:text-brand-teal"
                >
                  Details
                </Link>
              </li>
            ))}
            {staff.length === 0 && (
              <li className="py-6 text-center text-sm text-text-muted">No staff yet.</li>
            )}
          </ul>
        </Panel>
      </div>

      {/* ---- release pipeline ---- */}
      <Panel>
        <TableToolbar
          title="Release Pipeline"
          onAddHref={viewer.can("releases.upload") ? "/app/products" : undefined}
          addLabel="Upload"
          exportName="edusentinel-releases"
          exportRows={releases.map((r) => ({
            product: r.product.name,
            version: r.version,
            status: r.status,
            scan: r.artifact?.scanStatus ?? "PENDING",
          }))}
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">#</th>
                <th className="px-5 py-3.5 font-medium">Product</th>
                <th className="px-5 py-3.5 font-medium">Version</th>
                <th className="px-5 py-3.5 font-medium">Scan</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {releases.map((r, i) => (
                <tr key={r.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4 text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4 font-medium">{r.product.name}</td>
                  <td className="px-5 py-4 text-text-secondary">{r.version}</td>
                  <td className="px-5 py-4">
                    <StatusDot status={r.artifact?.scanStatus ?? "PENDING"} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusDot status={r.status} />
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href="/app/admin/releases"
                      className="text-sm font-medium text-brand-cyan hover:text-brand-teal"
                    >
                      {isFounder && r.status === "QUARANTINED" ? "Sign & publish" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
              {releases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-text-muted">
                    No releases yet — upload one from a product to start the pipeline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination shown={releases.length} total={stats.releases} />
      </Panel>

      {/* ---- recent activity ---- */}
      {viewer.can("audit.read") && (
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
              Recent Activity
            </h2>
            <Link href="/app/audit" className="text-sm font-medium text-brand-cyan">
              Audit log
            </Link>
          </div>
          <ul className="mt-4 flex flex-col">
            {audit.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-4 border-b border-border-subtle py-3 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-sm font-medium">
                    {e.action}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {e.actorEmail ?? "system"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-text-muted">
                  {e.createdAt.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
            {audit.length === 0 && (
              <li className="py-6 text-center text-sm text-text-muted">
                No activity recorded.
              </li>
            )}
          </ul>
        </Panel>
      )}

      {/* ---- teams grid ---- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {teams.map((t) => (
          <TeamCard key={t.id} team={t} />
        ))}
      </div>
    </div>
  );
}

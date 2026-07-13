import Link from "next/link";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/guard";
import {
  growthSeries,
  greeting,
  leadershipStats,
  recentAudit,
  teamCards,
} from "@/lib/dashboard";
import { BoxIcon, ServerIcon, UsersIcon } from "@/components/dashboard/icons";
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
 * Founder + Co-Founder dashboard. Identical operational view; the difference is
 * authority, not information: founder-reserved actions (sign, revoke, manage
 * roles/permissions) are absent for the Co-Founder because lib/permissions.ts
 * never puts those capabilities in their effective set.
 */
export default async function LeadershipDashboard({ viewer }: { viewer: Viewer }) {
  const [stats, teams, growth, audit, releases, staff] = await Promise.all([
    leadershipStats(),
    teamCards(),
    growthSeries(),
    recentAudit(6),
    db.release.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        product: { select: { name: true } },
        artifact: { select: { scanStatus: true, sha256: true } },
      },
    }),
    db.user.findMany({
      where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
      select: { name: true },
      take: 8,
    }),
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

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          icon={<BoxIcon size={26} />}
          title="Products"
          subtitle={`Registered products (${stats.products})`}
          people={staffNames}
          href="/app/products"
        />
        <StatCard
          icon={<ServerIcon size={26} />}
          title="Releases"
          subtitle={`Published releases (${stats.releases})`}
          people={staffNames}
          href="/app/admin/releases"
        />
        <StatCard
          icon={<UsersIcon size={26} />}
          title="Team"
          subtitle={`Team members (${stats.staff})`}
          people={staffNames}
          href="/app/teams"
        />
      </div>

      <Panel>
        <TableToolbar
          title="Release Pipeline"
          onAddHref={viewer.can("releases.upload") ? "/app/admin/releases#upload" : undefined}
          addLabel="Upload"
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="rounded-card bg-surface-overlay/60 text-sm text-text-secondary">
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
                    No releases yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination shown={releases.length} total={stats.releases} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <GrowthChart
          title="Account Growth"
          caption="Last 7 days"
          data={growth}
        />

        <Panel>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
              Recent Activity
            </h2>
            {viewer.can("audit.read") && (
              <Link href="/app/audit" className="text-sm font-medium text-brand-cyan">
                Audit log
              </Link>
            )}
          </div>
          <ul className="mt-5 flex flex-col">
            {audit.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-4 border-b border-border-subtle py-3 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">
                    {e.action}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {e.actor?.email ?? "system"}
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
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {teams.map((t) => (
          <TeamCard key={t.id} team={t} />
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Avatar } from "@/components/dashboard/avatar";
import { BoxIcon, ClipboardIcon, ServerIcon, UserIcon, UsersIcon } from "@/components/dashboard/icons";
import {
  GrowthChart,
  PageHeader,
  Panel,
  StatCard,
  StatusDot,
  TeamCard,
} from "@/components/dashboard/widgets";
import { DEMO_AUDIT, DEMO_GROWTH, DEMO_STATS, DEMO_TEAMS, DEMO_WORKFORCE } from "@/lib/demo/data";
import { useDemo } from "@/lib/demo/store";

/*
 * The demo Founder overview — a mirror of the production leadership dashboard,
 * rendered entirely from lib/demo/data.ts.
 *
 * The widgets are the production ones because they are pure presentation; the
 * DATA is entirely separate. See components/demo/shell.tsx for why that split is
 * the rule.
 */
export default function DemoOverview() {
  const { people, releases } = useDemo();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Good morning, Amara"
        subtitle="Simulated Founder view — full authority over products, releases and access. Nothing here is real."
        stats={[
          { icon: <ClipboardIcon size={19} />, label: "Open tasks", value: DEMO_STATS.openTasks, unit: "tasks" },
          { icon: <UserIcon size={19} />, label: "On the platform now", value: DEMO_STATS.online, unit: "people" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          icon={<BoxIcon size={26} />}
          title="Products"
          subtitle={`${DEMO_STATS.liveProducts} live · ${DEMO_STATS.draftProducts} draft`}
          people={["Priya Raghunathan", "Dele Adeyemi", "Hana Kimura"]}
          href="/demo/products"
        />
        <StatCard
          icon={<ServerIcon size={26} />}
          title="Releases"
          subtitle={`${DEMO_STATS.releases} published`}
          people={["Amara Osei", "Rafael Lima"]}
          href="/demo/releases"
        />
        <StatCard
          icon={<UsersIcon size={26} />}
          title="Team"
          subtitle={`${DEMO_STATS.staff} staff · ${DEMO_STATS.openTasks} open tasks`}
          people={people.slice(0, 5).map((p) => p.name)}
          href="/demo/people"
        />
      </div>

      {/* directory preview */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">People</h2>
          <Link href="/demo/people" className="text-sm font-medium text-brand-cyan hover:text-brand-teal">
            View all
          </Link>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">Name</th>
                <th className="px-5 py-3.5 font-medium">Email</th>
                <th className="px-5 py-3.5 font-medium">Role</th>
                <th className="px-5 py-3.5 font-medium">Team</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">2FA</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {people.slice(0, 5).map((p) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={p.name} size={30} online={p.online} />
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* growth + release pipeline */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <GrowthChart title="Account Growth" caption="Last 30 days (simulated)" data={DEMO_GROWTH} />

        <Panel>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Release pipeline</h2>
            <Link href="/demo/releases" className="text-sm font-medium text-brand-cyan">
              Open
            </Link>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {releases.slice(0, 4).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-card border border-border-subtle p-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{r.product}</span>
                  <span className="block text-xs text-text-muted">v{r.version}</span>
                </span>
                <StatusDot status={r.status} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* workforce */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Workforce today</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "At work", value: DEMO_WORKFORCE.present, of: `of ${DEMO_WORKFORCE.staff} staff` },
            { label: "On leave", value: DEMO_WORKFORCE.onLeave, of: "today" },
            { label: "Requests waiting", value: DEMO_WORKFORCE.pendingRequests, of: "need a decision" },
            { label: "Corrections waiting", value: DEMO_WORKFORCE.pendingFixes, of: "need a decision" },
          ].map((s) => (
            <div key={s.label} className="rounded-card border border-border-subtle p-4">
              <dt className="text-sm text-text-secondary">{s.label}</dt>
              <dd className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em]">{s.value}</dd>
              <dd className="text-xs text-text-muted">{s.of}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {/* activity */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Recent activity</h2>
        <ul className="mt-4 flex flex-col">
          {DEMO_AUDIT.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-4 border-b border-border-subtle py-3 last:border-0"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-sm font-medium">{e.action}</span>
                <span className="block truncate text-xs text-text-muted">{e.actor}</span>
              </span>
              <span className="shrink-0 text-xs text-text-muted">{e.time}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        {DEMO_TEAMS.map((t) => (
          <TeamCard key={t.id} team={t} />
        ))}
      </div>
    </div>
  );
}

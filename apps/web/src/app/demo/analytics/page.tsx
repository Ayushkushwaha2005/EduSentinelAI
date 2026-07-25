"use client";

import { GrowthChart, PageHeader, Panel, SegmentedBar } from "@/components/dashboard/widgets";
import { DEMO_ANALYTICS, DEMO_GROWTH } from "@/lib/demo/data";

/* Simulated analytics. In production these are computed server-side from our own
   records — there is no third-party analytics SDK anywhere in this platform. */
export default function DemoAnalytics() {
  const a = DEMO_ANALYTICS;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Analytics"
        subtitle="Computed from our own records — never a third-party SDK. These figures are simulated."
        stats={[]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total accounts", value: a.totalAccounts.toLocaleString(), sub: "all time" },
          { label: "Active this week", value: a.activeThisWeek.toLocaleString(), sub: "signed in" },
          { label: "Downloads", value: a.downloads30d.toLocaleString(), sub: "last 30 days" },
          { label: "Signature verified", value: `${Math.round((a.verifiedDownloads / a.downloads30d) * 100)}%`, sub: `${a.verifiedDownloads.toLocaleString()} of ${a.downloads30d.toLocaleString()}` },
        ].map((s) => (
          <Panel key={s.label}>
            <p className="text-sm text-text-secondary">{s.label}</p>
            <p className="mt-1.5 font-display text-[30px] font-semibold leading-none tracking-[-0.02em]">
              {s.value}
            </p>
            <p className="mt-1.5 text-xs text-text-muted">{s.sub}</p>
          </Panel>
        ))}
      </div>

      <GrowthChart title="Account growth" caption="Last 30 days (simulated)" data={DEMO_GROWTH} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Downloads by product</h2>
          <div className="mt-5 flex flex-col gap-4">
            {a.breakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between gap-4">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{b.label}</span>
                  <span className="block text-xs text-text-muted">
                    {b.value.toLocaleString()} downloads
                  </span>
                </span>
                <SegmentedBar value={b.share} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Support</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-border-subtle p-4">
              <dt className="text-sm text-text-secondary">Open requests</dt>
              <dd className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em]">
                {a.supportOpen}
              </dd>
            </div>
            <div className="rounded-card border border-border-subtle p-4">
              <dt className="text-sm text-text-secondary">Median first reply</dt>
              <dd className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em]">
                {a.supportMedianHours}h
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-sm text-text-muted">
            A metric that cannot be measured is reported as unmeasured, never as
            zero — a standing rule in the production analytics layer.
          </p>
        </Panel>
      </div>
    </div>
  );
}

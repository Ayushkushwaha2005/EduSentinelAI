"use client";

import { PageHeader, Panel, StatusDot } from "@/components/dashboard/widgets";
import { DEMO_AUDIT, DEMO_WORKFORCE } from "@/lib/demo/data";
import { useDemo } from "@/lib/demo/store";

/* Simulated reports. Export produces a real file built from the demo dataset —
   it is generated in the browser and contains only invented rows. */
export default function DemoReports() {
  const { people, products, releases, dispatch } = useDemo();

  const download = (name: string, rows: Record<string, string | number>[]) => {
    const headers = Object.keys(rows[0] ?? {});
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-demo.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch({
      type: "toast",
      kind: "simulated",
      message: `${name} exported — the file contains demo rows only.`,
    });
  };

  const reports = [
    {
      name: "People",
      desc: "Directory with role, team and two-factor status.",
      rows: people.map((p) => ({
        name: p.name, email: p.email, role: p.roleLabel,
        team: p.team ?? "", twoFactor: p.mfaEnabled ? "on" : "off", joined: p.joined,
      })),
    },
    {
      name: "Products",
      desc: "Catalogue with owner, release count and lifecycle status.",
      rows: products.map((p) => ({
        product: p.name, owner: p.owner, releases: p.releases, status: p.status, updated: p.updated,
      })),
    },
    {
      name: "Releases",
      desc: "Pipeline with scan result and publication status.",
      rows: releases.map((r) => ({
        product: r.product, version: r.version, size: r.size, scan: r.scan, status: r.status,
      })),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Reports"
        subtitle="Exports built from the demo dataset. Real exports are scoped to what the viewer may actually see."
        stats={[]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {reports.map((r) => (
          <Panel key={r.name}>
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{r.name}</h2>
            <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-text-secondary">{r.desc}</p>
            <p className="mt-3 text-xs text-text-muted">{r.rows.length} rows</p>
            <button
              type="button"
              onClick={() => download(r.name.toLowerCase(), r.rows)}
              className="mt-5 h-10 w-full rounded-control border border-border-subtle text-sm font-medium transition-colors hover:bg-surface-overlay"
            >
              Export CSV
            </button>
          </Panel>
        ))}
      </div>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Audit trail</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          In production every security-relevant action is written to a
          hash-chained audit log that snapshots the actor, so a record survives
          the person and tampering is detectable. These entries are invented.
        </p>
        <ul className="mt-5 flex flex-col">
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

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Workforce summary</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Staff", value: DEMO_WORKFORCE.staff },
            { label: "At work today", value: DEMO_WORKFORCE.present },
            { label: "On leave", value: DEMO_WORKFORCE.onLeave },
            { label: "Awaiting decision", value: DEMO_WORKFORCE.pendingRequests + DEMO_WORKFORCE.pendingFixes },
          ].map((s) => (
            <div key={s.label} className="rounded-card border border-border-subtle p-4">
              <dt className="text-sm text-text-secondary">{s.label}</dt>
              <dd className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em]">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 flex items-center gap-2 text-sm text-text-muted">
          <StatusDot status="Active" /> Leave reasons are never included in a
          report — they reach only the person and their approver chain.
        </p>
      </Panel>
    </div>
  );
}

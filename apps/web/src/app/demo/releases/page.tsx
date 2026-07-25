"use client";

import { PageHeader, Panel, StatusDot } from "@/components/dashboard/widgets";
import { useDemo } from "@/lib/demo/store";

/* Simulated release pipeline: quarantine → sign & publish → revoke. */
export default function DemoReleases() {
  const { releases, dispatch } = useDemo();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Releases"
        subtitle="Upload → quarantine → scan → founder-only signature → public download. Simulated end to end."
        stats={[]}
      />

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Pipeline</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">Product</th>
                <th className="px-5 py-3.5 font-medium">Version</th>
                <th className="px-5 py-3.5 font-medium">Size</th>
                <th className="px-5 py-3.5 font-medium">Scan</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {releases.map((r) => (
                <tr key={r.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4 font-medium">{r.product}</td>
                  <td className="px-5 py-4 font-mono text-text-secondary">{r.version}</td>
                  <td className="px-5 py-4 tabular-nums text-text-secondary">{r.size}</td>
                  <td className="px-5 py-4">
                    <StatusDot status={r.scan} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusDot status={r.status} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-3 text-sm font-medium">
                      {r.status === "QUARANTINED" && (
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "signRelease", id: r.id })}
                          className="text-brand-cyan hover:text-brand-teal"
                        >
                          Sign &amp; publish
                        </button>
                      )}
                      {r.status === "PUBLISHED" && (
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "revokeRelease", id: r.id })}
                          className="text-text-secondary hover:text-danger"
                        >
                          Revoke
                        </button>
                      )}
                      {r.status === "REVOKED" && (
                        <span className="text-text-muted">Revoked</span>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-sm text-text-muted">
          In production, signing is an ed25519 signature over the artifact&apos;s
          SHA-256 using the Founder&apos;s key, and a revoked release disappears
          from downloads and appears as a public incident notice. Here the buttons
          only move a row in your browser.
        </p>
      </Panel>
    </div>
  );
}

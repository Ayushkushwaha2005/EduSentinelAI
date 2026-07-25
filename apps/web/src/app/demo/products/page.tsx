"use client";

import { PageHeader, Panel, StatusDot } from "@/components/dashboard/widgets";
import { useDemo } from "@/lib/demo/store";

/* Simulated catalogue. Publish/archive mutate React state only — see
   lib/demo/store.tsx for why there is no path from here to a database. */
export default function DemoProducts() {
  const { products, dispatch, blocked } = useDemo();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Products"
        subtitle="The catalogue is data, not code — the Founder adds and publishes from here. Simulated."
        stats={[]}
      />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Catalogue</h2>
          <button
            type="button"
            onClick={() => blocked("Adding a product")}
            className="flex h-10 items-center gap-1.5 rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors hover:bg-surface-overlay"
          >
            Add product
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">Product</th>
                <th className="px-5 py-3.5 font-medium">Owner</th>
                <th className="px-5 py-3.5 font-medium">Releases</th>
                <th className="px-5 py-3.5 font-medium">Updated</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4">
                    <span className="block font-medium">{p.name}</span>
                    <span className="block text-xs text-text-muted">{p.summary}</span>
                  </td>
                  <td className="px-5 py-4 text-text-secondary">{p.owner}</td>
                  <td className="px-5 py-4 tabular-nums text-text-secondary">{p.releases}</td>
                  <td className="px-5 py-4 text-text-secondary">{p.updated}</td>
                  <td className="px-5 py-4">
                    <StatusDot status={p.status} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-3 text-sm font-medium">
                      {p.status !== "PUBLISHED" && (
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "publishProduct", id: p.id })}
                          className="text-brand-cyan hover:text-brand-teal"
                        >
                          Publish
                        </button>
                      )}
                      {p.status !== "ARCHIVED" && (
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "archiveProduct", id: p.id })}
                          className="text-text-secondary hover:text-text-primary"
                        >
                          Archive
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => blocked("Deleting a product")}
                        className="text-text-muted hover:text-danger"
                      >
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-sm text-text-muted">
          In production, <code className="font-mono">products.delete</code> is
          founder-reserved and refused while releases exist. Here it is simply
          inert.
        </p>
      </Panel>
    </div>
  );
}

import { requireCapability } from "@/lib/guard";
import { db } from "@/lib/db";
import { Breadcrumb, Pagination, Panel, TableToolbar } from "@/components/dashboard/widgets";

/*
 * Audit trail. Read-only by construction — the hash chain is verified out of
 * band (`npm run audit:verify`), never mutated from the UI.
 */
export default async function AuditPage() {
  await requireCapability("audit.read");

  const [events, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { name: true, email: true } } },
    }),
    db.auditLog.count(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Audit" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Audit Trail</h1>
        <p className="mt-1 max-w-3xl text-[15px] text-text-secondary">
          Every security-relevant action, hash-chained so tampering is
          detectable. Verify the chain with <code className="font-mono text-sm">npm run audit:verify</code>.
        </p>
      </div>

      <Panel>
        <TableToolbar title="Events" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">When</th>
                <th className="px-5 py-3.5 font-medium">Action</th>
                <th className="px-5 py-3.5 font-medium">Actor</th>
                <th className="px-5 py-3.5 font-medium">Detail</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {events.map((e) => (
                <tr key={e.id} className="border-b border-border-subtle last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-text-secondary">
                    {e.createdAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm font-medium">{e.action}</td>
                  <td className="px-5 py-3.5 text-text-secondary">
                    {e.actor?.email ?? "system"}
                  </td>
                  <td className="max-w-[280px] truncate px-5 py-3.5 text-text-secondary">
                    {e.detail ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-text-muted">
                    {e.ip ?? "—"}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-text-muted">
                    No events recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination shown={events.length} total={total} />
      </Panel>
    </div>
  );
}

import { requireCapability } from "@/lib/guard";
import { db } from "@/lib/db";
import { sanitizeLine } from "@/lib/sanitize";
import {
  Breadcrumb,
  Pagination,
  Panel,
  TableToolbar,
} from "@/components/dashboard/widgets";

const PAGE_SIZE = 25;

/*
 * Audit trail. Read-only by construction — the hash chain is verified out of
 * band (`npm run audit:verify`), never mutated from the UI. Paging is real
 * (server-side, in the URL) because an operator reading an audit log needs to
 * know they are seeing all of it.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireCapability("audit.read");

  const { q, page: rawPage } = await searchParams;
  const query = sanitizeLine(q, 80).trim();
  const page = Math.max(1, Number(rawPage) || 1);

  // Filter on action / detail / actor email.
  //
  // Case handling is provider-specific: SQLite's LIKE is case-insensitive for
  // ASCII, so this matches regardless of case today. Postgres LIKE is NOT — when
  // the datasource switches (Pre-Launch Gate), add `mode: "insensitive"` to each
  // clause, which Prisma supports there but rejects on SQLite.
  const where = query
    ? {
        OR: [
          { action: { contains: query } },
          { detail: { contains: query } },
          { actorEmail: { contains: query } },
        ],
      }
    : {};

  const [events, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);

  const hrefFor = (p: number) =>
    `/app/audit?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(p) })}`;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Audit" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Audit Trail</h1>
        <p className="mt-1 max-w-3xl text-[15px] text-text-secondary">
          Every security-relevant action, hash-chained so tampering is detectable.
          Verify the chain with{" "}
          <code className="font-mono text-sm">npm run audit:verify</code>.
        </p>
      </div>

      <Panel>
        <TableToolbar
          title="Events"
          searchPath="/app/audit"
          query={query}
          exportName="edusentinel-audit"
          exportRows={events.map((e) => ({
            time: e.createdAt.toISOString(),
            action: e.action,
            actor: e.actorEmail ?? "system",
            detail: e.detail ?? "",
            ip: e.ip ?? "",
          }))}
        />

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
                    {e.actorEmail ?? "system"}
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
                    {query ? `Nothing matched “${query}”.` : "No events recorded."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          shown={events.length}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          hrefFor={hrefFor}
        />
      </Panel>
    </div>
  );
}

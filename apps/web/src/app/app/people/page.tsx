import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { directory, directoryCounts, isDirectoryGroup, type DirectoryGroup } from "@/lib/people";
import { sanitizeLine } from "@/lib/sanitize";
import { Avatar } from "@/components/dashboard/avatar";
import {
  Breadcrumb,
  Pagination,
  Panel,
  TableToolbar,
} from "@/components/dashboard/widgets";

/*
 * People directory — the reference's "Clients List" screen.
 *
 * Read-only, gated on `users.view`. Every "Manage" link goes to Access Control,
 * which is founder-reserved: the Founder decides roles and permissions, and this
 * page never becomes a second way to do it.
 */
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string }>;
}) {
  const viewer = await requireCapability("users.view");
  const { group: rawGroup, q } = await searchParams;

  const group: DirectoryGroup = isDirectoryGroup(rawGroup) ? rawGroup : "ALL";
  const query = sanitizeLine(q, 80).trim();

  const [people, counts] = await Promise.all([
    directory(group, query),
    directoryCounts(),
  ]);

  const canManage = viewer.can("users.manage_roles");

  const tabs: { key: DirectoryGroup; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: counts.all },
    { key: "LEADERSHIP", label: "Leadership", count: counts.leadership },
    { key: "EMPLOYEE", label: "Employees", count: counts.employees },
    { key: "COLLABORATOR", label: "Collaborators", count: counts.collaborators },
    { key: "MEMBER", label: "Members", count: counts.members },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        trail={[{ label: "People", href: "/app/people" }, { label: "Directory" }]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">People</h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            Everyone at EduSentinel AI — leadership, employees, collaborators and
            members.
            {canManage && " Roles and permissions are assigned in Access Control."}
          </p>
        </div>
        {canManage && (
          <Link
            href="/app/access"
            className="inline-flex h-10 items-center rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover"
          >
            Access Control
          </Link>
        )}
      </div>

      <Panel>
        <nav className="flex flex-wrap items-center gap-5 border-b border-border-subtle pb-3">
          {tabs.map((t) => {
            const active = t.key === group;
            const params = new URLSearchParams({
              ...(t.key === "ALL" ? {} : { group: t.key }),
              ...(query ? { q: query } : {}),
            });
            return (
              <Link
                key={t.key}
                href={`/app/people${params.size ? `?${params}` : ""}`}
                className={`-mb-3 border-b-2 pb-3 text-[15px] font-medium transition-colors duration-[--duration-fast] ${
                  active
                    ? "border-brand-cyan text-brand-cyan"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {t.label}{" "}
                <span className={active ? "text-brand-cyan" : "text-text-muted"}>
                  ({t.count})
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-5">
          <TableToolbar
            title="Directory"
            searchPath="/app/people"
            query={query}
            exportName="edusentinel-people"
            exportRows={people.map((p) => ({
              name: p.name,
              email: p.email,
              role: p.roleLabel,
              title: p.title ?? "",
              team: p.team ?? "",
              joined: p.joined.toISOString().slice(0, 10),
              twoFactor: p.mfaEnabled ? "on" : "off",
              verified: p.verified ? "yes" : "no",
            }))}
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">#</th>
                <th className="px-5 py-3.5 font-medium">Name</th>
                <th className="px-5 py-3.5 font-medium">Email</th>
                <th className="px-5 py-3.5 font-medium">Role</th>
                <th className="px-5 py-3.5 font-medium">Title</th>
                <th className="px-5 py-3.5 font-medium">Team</th>
                <th className="px-5 py-3.5 font-medium">Joined</th>
                <th className="px-5 py-3.5 font-medium">Security</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {people.map((p, i) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4 text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={p.name} size={32} src={p.avatarUrl} online={p.online} />
                      <span className="font-medium">{p.name}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-text-secondary">{p.email}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-surface-overlay px-2.5 py-1 text-xs font-semibold text-text-secondary">
                      {p.roleLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-text-secondary">{p.title ?? "—"}</td>
                  <td className="px-5 py-4 text-text-secondary">{p.team ?? "—"}</td>
                  <td className="px-5 py-4 text-text-secondary">
                    {p.joined.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          p.mfaEnabled ? "bg-success" : "bg-warning"
                        }`}
                      />
                      <span className={p.mfaEnabled ? "text-success" : "text-warning"}>
                        {p.mfaEnabled ? "2FA on" : "No 2FA"}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {canManage && p.role !== "FOUNDER" ? (
                      <Link
                        href="/app/access"
                        className="text-sm font-medium text-brand-cyan hover:text-brand-teal"
                      >
                        Manage
                      </Link>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-text-muted">
                    {query ? `Nobody matched “${query}”.` : "Nobody in this group yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination shown={people.length} total={people.length} />
      </Panel>
    </div>
  );
}

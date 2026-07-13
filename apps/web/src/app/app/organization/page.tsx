import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/guard";
import { orgDirectory, unlinkedAccounts } from "@/lib/org";
import { assignTeamDepartment } from "./actions";
import { AddMember, DepartmentForm, MemberRow } from "./forms";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";

/*
 * The organization (Phase 6.5) — the org chart, and the console that edits it.
 *
 * Gated on `org.manage`, which is FOUNDER-RESERVED: no grant row can produce it
 * (lib/permissions.ts strips reserved capabilities on every check, and
 * test:permissions writes forged rows to prove it). Someone who could edit this
 * page could add themselves to the leadership of the company and publish it.
 *
 * Everything here is the same records the public /company page renders. There is
 * no second copy to keep in step.
 */
export const metadata = { title: "Organization" };

export default async function OrganizationPage() {
  await requireCapability("org.manage");

  const [directory, accounts, teams] = await Promise.all([
    orgDirectory(),
    unlinkedAccounts(),
    db.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const departments = directory.departments.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    sortOrder: d.sortOrder,
  }));

  // The picker offers accounts that are not on the chart yet, plus the one this
  // member is already linked to (or their own link would vanish from the list).
  const accountsFor = (linkedId: string | null) => {
    const own = directory.members.find((m) => m.userId === linkedId);
    const base = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      roleLabel: a.roleLabel,
    }));
    if (linkedId && own) {
      base.unshift({
        id: linkedId,
        name: own.name,
        email: own.email ?? "",
        roleLabel: own.accountRole ?? "",
      });
    }
    return base;
  };

  const publicCount = directory.members.filter((m) => m.visibility === "PUBLIC").length;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        trail={[{ label: "Dashboards", href: "/app" }, { label: "Organization" }]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Organization</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-text-secondary">
            Who EduSentinel is — leadership, departments, teams and people. This is
            the same record the public{" "}
            <Link href="/company" className="text-brand-cyan hover:text-brand-teal">
              company page
            </Link>{" "}
            renders: {publicCount} of {directory.members.length}{" "}
            {directory.members.length === 1 ? "person is" : "people are"} public.
          </p>
        </div>
        <Link
          href="/app/company"
          className="inline-flex h-10 items-center rounded-control border border-border-subtle px-5 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
        >
          Company profile
        </Link>
      </div>

      {/* ---- people ---- */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">People</h2>
          <AddMember
            departments={departments}
            teams={teams}
            accounts={accountsFor(null)}
          />
        </div>

        {directory.members.length === 0 ? (
          <p className="mt-6 text-[15px] text-text-muted">
            Nobody on the org chart yet. Add your leadership, or link the accounts
            that already exist — run <code>npm run db:seed:org</code> to import the
            team the site shipped with.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col">
            {directory.members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                departments={departments}
                teams={teams}
                accounts={accountsFor(m.userId)}
              />
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- departments ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Departments</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Removing a department reorganizes; it never deletes the people or teams
          inside it.
        </p>

        <div className="mt-5 flex flex-col gap-5">
          {departments.map((d) => (
            <div key={d.id} className="rounded-card border border-border-subtle p-5">
              <DepartmentForm department={d} />
              <p className="mt-3 text-sm text-text-muted">
                {directory.departments.find((x) => x.id === d.id)?.members.length ?? 0}{" "}
                people ·{" "}
                {directory.departments.find((x) => x.id === d.id)?.teams.length ?? 0} teams
              </p>
            </div>
          ))}

          <div className="rounded-card border border-dashed border-border-subtle p-5">
            <DepartmentForm />
          </div>
        </div>
      </Panel>

      {/* ---- teams under departments ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Teams</h2>
        <p className="mt-1 text-sm text-text-secondary">
          The teams from{" "}
          <Link href="/app/teams" className="text-brand-cyan hover:text-brand-teal">
            Teams
          </Link>
          , placed on the org chart. Same records — a team renamed there is renamed
          here.
        </p>

        <ul className="mt-5 flex flex-col">
          {teams.map((t) => {
            const current = directory.departments.find((d) =>
              d.teams.some((x) => x.id === t.id),
            );
            return (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-4 border-b border-border-subtle py-3 last:border-0"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {t.name}
                </span>
                <form action={assignTeamDepartment} className="flex items-center gap-2">
                  <input type="hidden" name="teamId" value={t.id} />
                  <label className="sr-only" htmlFor={`team-dept-${t.id}`}>
                    Department for {t.name}
                  </label>
                  <select
                    id={`team-dept-${t.id}`}
                    name="departmentId"
                    defaultValue={current?.id ?? ""}
                    className="h-10 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm focus:border-brand-cyan focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="h-10 rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
                  >
                    Move
                  </button>
                </form>
              </li>
            );
          })}
          {teams.length === 0 && (
            <li className="py-6 text-sm text-text-muted">
              No teams yet — create them on the Teams page.
            </li>
          )}
        </ul>
      </Panel>

      {/* ---- accounts not on the chart ---- */}
      {accounts.length > 0 && (
        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Staff not on the org chart
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            These people have accounts but no place on the chart. They are listed
            here rather than added silently — being able to sign in is not the same
            fact as being on the org chart, and the platform should not guess.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="rounded-full bg-surface-overlay px-3 py-1.5 text-sm text-text-secondary"
              >
                {a.name} · {a.roleLabel}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

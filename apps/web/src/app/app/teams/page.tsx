import { requireCapability } from "@/lib/guard";
import { db } from "@/lib/db";
import { teamCards, myTeams } from "@/lib/dashboard";
import { Breadcrumb, EmptyState, TeamCard } from "@/components/dashboard/widgets";
import { TeamManager } from "./manage";

/*
 * Teams List — the reference's team grid. Leadership sees every team; an
 * employee sees only the teams they belong to (scoped in lib/dashboard.ts).
 * The management panel appears only for `team.manage`, and its actions
 * re-check that capability server-side.
 */
export default async function TeamsPage() {
  const viewer = await requireCapability("team.view");
  const canManage = viewer.can("team.manage");

  const teams = canManage ? await teamCards() : await myTeams(viewer.id);
  const staff = canManage
    ? await db.user.findMany({
        where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      })
    : [];

  return (
    <div className="flex grow flex-col gap-4">
      <Breadcrumb
        trail={[{ label: "Teams", href: "/app/teams" }, { label: "Teams List" }]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Teams</h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            {canManage
              ? `${teams.length} teams across EduSentinel AI.`
              : "The teams you belong to."}
          </p>
        </div>
      </div>

      {canManage && (
        <TeamManager
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
          staff={staff}
        />
      )}

      {teams.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center">
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="No teams yet"
            body="Teams group people around projects, and give tasks and the calendar something to belong to. Create the first one to get started."
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}

import { db } from "@/lib/db";
import { requireViewer } from "@/lib/guard";
import { currentYear, holidays, whoIsOut } from "@/lib/hr";
import { Avatar } from "@/components/dashboard/avatar";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
import { MonthGrid } from "@/components/dashboard/month-grid";
import { itemsByDay, monthRange } from "@/lib/calendar";
import { EventForm } from "./event-form";
import {
  EntitlementForm,
  HolidayForm,
  LeaveTypeForm,
  RemoveHoliday,
} from "./forms";

/*
 * Calendar (Phase 8.3).
 *
 * Everyone may see the company's holidays and who is away — a team that cannot
 * see who is out cannot plan. Nobody sees WHY: `whoIsOut()` returns no reason and
 * no leave type, because "SICK" printed against a name on a shared calendar is a
 * medical disclosure, and it is not one anybody consented to.
 *
 * Maintaining the calendar (holidays, leave types, entitlements) takes
 * `calendar.manage`, and every one of those actions re-checks it server-side.
 */
export const metadata = { title: "Calendar" };

const dayLabel = (d: Date) =>
  new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const shortRange = (a: Date, b: Date) => {
  const f = (d: Date) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return new Date(a).getTime() === new Date(b).getTime() ? f(a) : `${f(a)} – ${f(b)}`;
};

export default async function CalendarPage() {
  const viewer = await requireViewer();
  const canManage = viewer.can("calendar.manage");

  const now = new Date();
  const in60 = new Date(now.getTime() + 60 * 86_400_000);

  const [days, out, types, staff] = await Promise.all([
    holidays(currentYear()),
    whoIsOut(now, in60),
    db.leaveType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    canManage
      ? db.user.findMany({
          where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const upcoming = days.filter((h) => h.date >= new Date(new Date().toDateString()));

  /*
   * Phase 17 — the aggregated month feed.
   *
   * `itemsByDay` unions created events with holidays, approved leave, published
   * releases and task deadlines, already scoped to this viewer. Leave arrives
   * carrying no reason and no type; see lib/calendar.ts.
   */
  const month = monthRange(now);
  const [byDay, myTeams] = await Promise.all([
    itemsByDay(viewer, month),
    db.teamMember.findMany({
      where: { userId: viewer.id },
      select: { team: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="flex grow flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Calendar" }]} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold leading-[0.98] tracking-[-0.04em] md:text-[44px]">
            Calendar
          </h1>
          <p className="mt-2 text-[15px] text-text-secondary">
            Meetings, deadlines, releases, holidays and who is away — everything
            you are entitled to see, in one place.
          </p>
        </div>
        <p className="text-[15px] font-medium text-text-secondary">
          {now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ---- the month ---- */}
      <Panel>
        <MonthGrid year={now.getFullYear()} month={now.getMonth()} byDay={byDay} />
        <p className="mt-4 text-sm text-text-muted">
          Leave shows as &ldquo;away&rdquo; only. The reason and the type of leave
          reach the person and their approver chain, and stop there.
        </p>
      </Panel>

      {/* ---- add an event ---- */}
      <Panel id="new">
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Add an event</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Personal events are yours alone. Team events need you to be in the team.
          {canManage
            ? " Company events appear for everyone on staff."
            : " Company-wide events need the calendar permission."}
        </p>
        <div className="mt-5">
          <EventForm
            teams={myTeams.map((m) => m.team)}
            canCompany={canManage}
          />
        </div>
      </Panel>

      {/* ---- who is out ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
          Away in the next 60 days
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Who, and when. Not why — that is between a person and whoever approves
          their leave.
        </p>

        {out.length === 0 ? (
          <p className="mt-5 text-[15px] text-text-muted">Nobody is booked off.</p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {out.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 rounded-card border border-border-subtle p-3"
              >
                <Avatar name={o.name} size={38} src={o.avatarUrl} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{o.name}</span>
                  <span className="block text-xs text-text-muted">
                    {shortRange(o.startDate, o.endDate)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- holidays ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
          Company holidays {currentYear()}
        </h2>

        {canManage && (
          <div className="mt-5 rounded-card border border-dashed border-border-subtle p-4">
            <HolidayForm />
          </div>
        )}

        {upcoming.length === 0 ? (
          <p className="mt-5 text-[15px] text-text-muted">
            No holidays left this year.
            {canManage && " Add them above and they stop being charged to leave."}
          </p>
        ) : (
          <ul className="mt-5 flex flex-col">
            {upcoming.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center gap-3 border-b border-border-subtle py-3 last:border-0"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {h.name}
                </span>
                <span className="text-sm text-text-secondary">{dayLabel(h.date)}</span>
                {canManage && <RemoveHoliday id={h.id} />}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- leave types & entitlements (calendar.manage) ---- */}
      {canManage && (
        <>
          <Panel>
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Leave types</h2>
            <p className="mt-1 text-sm text-text-secondary">
              The default is the starting entitlement each year. Individual
              entitlements override it below — someone joining in July does not get a
              full year&apos;s allowance.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              {types.map((t) => (
                <div key={t.id} className="rounded-card border border-border-subtle p-4">
                  <LeaveTypeForm
                    type={{
                      id: t.id,
                      name: t.name,
                      code: t.code,
                      defaultDays: t.defaultDays,
                      paid: t.paid,
                    }}
                  />
                </div>
              ))}
              <div className="rounded-card border border-dashed border-border-subtle p-4">
                <LeaveTypeForm />
              </div>
            </div>
          </Panel>

          {types.length > 0 && staff.length > 0 && (
            <Panel>
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
                Individual entitlement
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Cannot be set below what someone has already used or booked — that
                would create a negative balance by decree.
              </p>
              <div className="mt-5">
                <EntitlementForm
                  people={staff}
                  types={types.map((t) => ({ id: t.id, name: t.name }))}
                />
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

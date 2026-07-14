import { db } from "@/lib/db";
import { requireViewer } from "@/lib/guard";
import { currentYear, holidays, whoIsOut } from "@/lib/hr";
import { Avatar } from "@/components/dashboard/avatar";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
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

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Calendar" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Calendar</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Company holidays and who is away. Holidays are never charged to anyone&apos;s
          leave balance.
        </p>
      </div>

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

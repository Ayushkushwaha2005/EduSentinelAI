import { requireViewer } from "@/lib/guard";
import { db } from "@/lib/db";
import {
  myAttendance,
  pendingCorrections,
  teamToday,
  todayFor,
} from "@/lib/hr";
import { Avatar } from "@/components/dashboard/avatar";
import { Breadcrumb, Panel, StatusDot } from "@/components/dashboard/widgets";
import { ClockPanel, CorrectionDecision, CorrectionForm } from "./forms";

/*
 * Attendance (Phase 8.1).
 *
 * Gated on requireViewer, not a capability: clocking in is a statement about
 * YOURSELF, and everyone has a self. What takes a capability is seeing anyone
 * else's record (`attendance.manage` / `hr.view`) or deciding a correction
 * (`attendance.manage`) — and those reads happen inside lib/hr.ts, which returns
 * nothing at all to a viewer without them.
 */
export const metadata = { title: "Attendance" };

const dateLabel = (d: Date) =>
  new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const timeLabel = (d: Date | null) =>
  d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";

export default async function AttendancePage() {
  const viewer = await requireViewer();

  const [today, history, team, corrections, myPending] = await Promise.all([
    todayFor(viewer.id),
    myAttendance(viewer.id, 30),
    teamToday(viewer), // returns [] without attendance.manage / hr.view
    pendingCorrections(viewer), // returns [] without attendance.manage
    db.attendanceCorrection.findMany({
      where: { requestedById: viewer.id, status: "PENDING" },
      select: { attendanceId: true },
    }),
  ]);

  const awaiting = new Set(myPending.map((c) => c.attendanceId));
  const canManage = viewer.can("attendance.manage") || viewer.can("hr.view");

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Attendance" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Attendance</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Your day, and your last 30. Past days are corrected by request, never
          rewritten — a record anyone can quietly change is not a record.
        </p>
      </div>

      <Panel>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Today
        </h2>
        <div className="mt-5">
          <ClockPanel today={today} />
        </div>
      </Panel>

      {/* ---- corrections queue (attendance.manage) ---- */}
      {corrections.length > 0 && (
        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Corrections awaiting review{" "}
            <span className="text-text-muted">({corrections.length})</span>
          </h2>
          <ul className="mt-4 flex flex-col">
            {corrections.map((c) => (
              <li key={c.id} className="border-b border-border-subtle py-4 last:border-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[15px] font-medium">{c.userName}</span>
                  <span className="text-sm text-text-secondary">{dateLabel(c.date)}</span>
                  <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {c.fromStatus} → {c.toStatus}
                  </span>
                </div>
                <p className="mt-1.5 max-w-3xl text-sm text-text-secondary">{c.reason}</p>
                <div className="mt-3">
                  <CorrectionDecision id={c.id} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---- my history ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Your last 30 days</h2>

        {history.length === 0 ? (
          <p className="mt-5 text-[15px] text-text-muted">
            Nothing recorded yet — clock in above and this fills up.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                  <th className="rounded-l-card px-5 py-3.5 font-medium">Date</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">In</th>
                  <th className="px-5 py-3.5 font-medium">Out</th>
                  <th className="rounded-r-card px-5 py-3.5 font-medium">Correction</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {history.map((a) => (
                  <tr key={a.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-4 font-medium">{dateLabel(a.date)}</td>
                    <td className="px-5 py-4">
                      <StatusDot status={a.status} />
                    </td>
                    <td className="px-5 py-4 tabular-nums text-text-secondary">
                      {timeLabel(a.clockIn)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-text-secondary">
                      {timeLabel(a.clockOut)}
                    </td>
                    <td className="px-5 py-4">
                      {a.status === "LEAVE" || a.status === "HOLIDAY" ? (
                        <span className="text-sm text-text-muted">—</span>
                      ) : awaiting.has(a.id) ? (
                        <span className="text-sm text-warning">Awaiting review</span>
                      ) : (
                        <CorrectionForm attendanceId={a.id} current={a.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ---- the team's day (attendance.manage / hr.view) ---- */}
      {canManage && team.length > 0 && (
        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">The team today</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Where people are. Notes are not shown here — a note can say anything,
            including why someone is unwell.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-card border border-border-subtle p-3"
              >
                <Avatar name={m.name} size={38} src={m.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{m.name}</span>
                  <span className="block truncate text-xs text-text-muted">
                    {m.title ?? "—"}
                  </span>
                </span>
                {m.status ? (
                  <StatusDot status={m.status} />
                ) : (
                  <span className="text-xs text-text-muted">Not in yet</span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

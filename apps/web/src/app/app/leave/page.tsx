import { requireViewer } from "@/lib/guard";
import { balancesFor, myLeave, pendingLeave } from "@/lib/hr";
import { Avatar } from "@/components/dashboard/avatar";
import { Breadcrumb, Panel, StatusDot } from "@/components/dashboard/widgets";
import { CancelButton, DecisionForm, RequestForm } from "./forms";

/*
 * Leave (Phase 8.2).
 *
 * requireViewer: booking your own leave is not a privilege. The approval queue
 * below is fetched through `pendingLeave()`, which returns an EMPTY LIST to anyone
 * without `leave.approve` — the page cannot show what it was never given.
 *
 * Reasons are redacted in lib/hr.ts, not here. A viewer who may not read a reason
 * receives `null` for it, so a future edit to this file cannot leak one by
 * accident.
 */
export const metadata = { title: "Leave" };

const range = (a: Date, b: Date) => {
  const f = (d: Date) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return new Date(a).getTime() === new Date(b).getTime() ? f(a) : `${f(a)} – ${f(b)}`;
};

export default async function LeavePage() {
  const viewer = await requireViewer();

  const [balances, mine, queue] = await Promise.all([
    balancesFor(viewer, viewer.id),
    myLeave(viewer),
    pendingLeave(viewer),
  ]);

  const canApprove = viewer.can("leave.approve");
  const types = (balances ?? []).map((b) => ({
    typeId: b.typeId,
    name: b.name,
    remaining: b.remaining,
    paid: b.paid,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Leave" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Leave</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Your balances, your requests, and — if you approve leave — the queue.
        </p>
      </div>

      {/* ---- balances ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(balances ?? []).map((b) => (
          <Panel key={b.typeId}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-text-secondary">{b.name}</p>
              {!b.paid && (
                <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-xs text-text-muted">
                  unpaid
                </span>
              )}
            </div>
            <p className="mt-2 text-[30px] font-semibold tabular-nums tracking-[-0.02em]">
              {b.remaining}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              of {b.entitled} days · {b.used} used
              {b.pending > 0 && ` · ${b.pending} pending`}
            </p>
          </Panel>
        ))}
        {(balances ?? []).length === 0 && (
          <Panel className="sm:col-span-2 lg:col-span-4">
            <p className="text-[15px] text-text-muted">
              No leave types configured yet — they are set up on the Calendar page.
            </p>
          </Panel>
        )}
      </div>

      {/* ---- request ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Request leave</h2>
        <div className="mt-5">
          <RequestForm types={types} />
        </div>
      </Panel>

      {/* ---- approval queue (leave.approve) ---- */}
      {canApprove && (
        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Awaiting your decision <span className="text-text-muted">({queue.length})</span>
          </h2>

          {queue.length === 0 ? (
            <p className="mt-5 text-[15px] text-text-muted">
              Nothing waiting on you.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col">
              {queue.map((r) => (
                <li key={r.id} className="border-b border-border-subtle py-4 last:border-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={r.userName} size={34} src={r.avatarUrl} />
                    <span className="text-[15px] font-medium">{r.userName}</span>
                    <span className="rounded-full bg-brand-cyan/10 px-2.5 py-0.5 text-xs font-semibold text-brand-cyan">
                      {r.type}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {range(r.startDate, r.endDate)} · {r.days}{" "}
                      {r.days === 1 ? "day" : "days"}
                    </span>
                  </div>

                  {/* Visible because deciding the request is the one job that needs
                      it. Nobody else sees this field — not HR, not the Founder on a
                      calendar, not an export. */}
                  {r.reason && (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">
                      “{r.reason}”
                    </p>
                  )}

                  <div className="mt-3">
                    <DecisionForm id={r.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* ---- my requests ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Your requests</h2>

        {mine.length === 0 ? (
          <p className="mt-5 text-[15px] text-text-muted">
            You have not booked any leave yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                  <th className="rounded-l-card px-5 py-3.5 font-medium">Type</th>
                  <th className="px-5 py-3.5 font-medium">Dates</th>
                  <th className="px-5 py-3.5 font-medium">Days</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="rounded-r-card px-5 py-3.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {mine.map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-4 font-medium">{r.type}</td>
                    <td className="px-5 py-4 text-text-secondary">
                      {range(r.startDate, r.endDate)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-text-secondary">{r.days}</td>
                    <td className="px-5 py-4">
                      <StatusDot status={r.status} />
                      {r.decisionNote && (
                        <span className="mt-1 block text-xs text-text-muted">
                          “{r.decisionNote}”
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {r.status === "PENDING" || r.status === "APPROVED" ? (
                        <CancelButton id={r.id} />
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

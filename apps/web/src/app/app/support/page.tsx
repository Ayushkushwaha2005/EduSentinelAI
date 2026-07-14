import Link from "next/link";
import { requireViewer } from "@/lib/guard";
import { myRequests, queue, supportSummary } from "@/lib/support";
import { Avatar } from "@/components/dashboard/avatar";
import { Breadcrumb, Panel, StatusDot } from "@/components/dashboard/widgets";
import { RaiseForm } from "./forms";

/*
 * Support Center (Phase 9).
 *
 * requireViewer — anyone who can sign in can ask for help, including a
 * collaborator. The staff QUEUE below comes from `queue()`, which returns an empty
 * list to anyone without `support.respond`: the page cannot show what it was never
 * given, so there is no "hide the panel" logic to get wrong.
 */
export const metadata = { title: "Support" };

const when = (d: Date) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function SupportPage() {
  const viewer = await requireViewer();

  const [mine, staffQueue, summary] = await Promise.all([
    myRequests(viewer),
    queue(viewer), // [] without support.respond
    supportSummary(viewer), // null without support.respond
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Support" }]} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Support</h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            Ask for what you need — access, a bug, a security concern. Your request
            is visible to you and to the people who answer it.
          </p>
        </div>
        <RaiseForm />
      </div>

      {/* ---- staff summary ---- */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Open", value: summary.open, note: "not yet resolved" },
            { label: "Unassigned", value: summary.unassigned, note: "nobody has picked these up" },
            { label: "Assigned to you", value: summary.mine, note: "yours to answer" },
            {
              label: "Awaiting first reply",
              value: summary.awaitingFirstReply,
              note: "nobody has answered yet",
            },
          ].map((s) => (
            <Panel key={s.label}>
              <p className="text-sm font-medium text-text-secondary">{s.label}</p>
              <p className="mt-2 text-[30px] font-semibold tabular-nums tracking-[-0.02em]">
                {s.value}
              </p>
              <p className="mt-1 text-sm text-text-muted">{s.note}</p>
            </Panel>
          ))}
        </div>
      )}

      {/* ---- staff queue ---- */}
      {summary && (
        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">The queue</h2>

          {staffQueue.length === 0 ? (
            <p className="mt-5 text-[15px] text-text-muted">
              Nothing in the queue.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                    <th className="rounded-l-card px-5 py-3.5 font-medium">Subject</th>
                    <th className="px-5 py-3.5 font-medium">From</th>
                    <th className="px-5 py-3.5 font-medium">Priority</th>
                    <th className="px-5 py-3.5 font-medium">Assignee</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="rounded-r-card px-5 py-3.5 font-medium">Raised</th>
                  </tr>
                </thead>
                <tbody className="text-[15px]">
                  {staffQueue.map((r) => (
                    <tr key={r.id} className="border-b border-border-subtle last:border-0">
                      <td className="px-5 py-4">
                        <Link
                          href={`/app/support/${r.id}`}
                          className="font-medium text-text-primary hover:text-brand-cyan"
                        >
                          {r.subject}
                        </Link>
                        {/* An SLA breach is a fact about a request that nobody has
                            answered yet — not a permanent mark on one that was
                            answered late. */}
                        {r.overdue && (
                          <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                            overdue
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={r.requesterName} size={28} src={r.requesterAvatar} />
                          <span className="text-text-secondary">{r.requesterName}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            r.priority === "URGENT" || r.priority === "HIGH"
                              ? "bg-danger/10 text-danger"
                              : "bg-surface-overlay text-text-secondary"
                          }`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-text-secondary">
                        {r.assigneeName ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <StatusDot status={r.status} />
                      </td>
                      <td className="px-5 py-4 text-text-secondary">{when(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* ---- my requests ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Your requests</h2>

        {mine.length === 0 ? (
          <p className="mt-5 text-[15px] text-text-muted">
            You have not raised anything. If you need access, hit a bug, or spot
            something that looks wrong, this is the place.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col">
            {mine.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 border-b border-border-subtle py-4 last:border-0"
              >
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/app/support/${r.id}`}
                    className="block truncate text-[15px] font-medium hover:text-brand-cyan"
                  >
                    {r.subject}
                  </Link>
                  <span className="mt-0.5 block text-xs text-text-muted">
                    {r.category} · {r.messages}{" "}
                    {r.messages === 1 ? "message" : "messages"}
                    {r.attachments > 0 && ` · ${r.attachments} attachment(s)`} ·{" "}
                    {when(r.createdAt)}
                  </span>
                </span>
                <StatusDot status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

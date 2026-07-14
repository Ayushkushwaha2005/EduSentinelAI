import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/guard";
import { canRespond, openRequest, responders, SLA_HOURS } from "@/lib/support";
import { Avatar } from "@/components/dashboard/avatar";
import { Breadcrumb, Panel, StatusDot } from "@/components/dashboard/widgets";
import { ManageForm, ReplyForm } from "../forms";

/*
 * One support request (Phase 9).
 *
 * `openRequest()` returns null when the viewer may not see it — the same answer a
 * request that does not exist gets — so this page 404s identically either way. A
 * tampered id learns nothing about what exists.
 *
 * Internal notes are filtered out in the QUERY LAYER for a requester, so they never
 * reach this component. It cannot leak what it was never handed.
 *
 * Bodies are rendered as PLAIN TEXT. They are untrusted input from a stranger
 * arriving in a staff console — which is the textbook setup for stored XSS, and
 * exactly why nothing here goes near dangerouslySetInnerHTML or MDX.
 */
export const metadata = { title: "Support request" };

const stamp = (d: Date) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function SupportThread({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const { id } = await params;

  const request = await openRequest(viewer, id);
  if (!request) notFound();

  const staff = canRespond(viewer);
  const people = staff ? await responders() : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Breadcrumb
        trail={[
          { label: "Dashboards", href: "/app" },
          { label: "Support", href: "/app/support" },
          { label: request.subject },
        ]}
      />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{request.subject}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <StatusDot status={request.status} />
          <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium">
            {request.category}
          </span>
          <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium">
            {request.priority}
          </span>
          <span>Raised {stamp(request.createdAt)}</span>
        </p>
      </div>

      {/* SLA: a measured fact, not a promise on a page. */}
      {staff && (
        <Panel>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
            Response
          </h2>
          <p className="mt-3 text-[15px] text-text-secondary">
            {request.firstResponseAt ? (
              <>
                First answered {stamp(request.firstResponseAt)} — target was{" "}
                {SLA_HOURS[request.priority]}h.
              </>
            ) : request.overdue ? (
              <span className="text-danger">
                Nobody has answered this yet, and the {SLA_HOURS[request.priority]}h
                target has passed.
              </span>
            ) : (
              <>
                Not answered yet. Target: {SLA_HOURS[request.priority]}h (by{" "}
                {stamp(request.dueBy)}).
              </>
            )}
          </p>

          <div className="mt-5 border-t border-border-subtle pt-5">
            <ManageForm
              request={{
                id: request.id,
                status: request.status,
                priority: request.priority,
                assigneeId: request.assigneeId,
              }}
              responders={people}
            />
          </div>
        </Panel>
      )}

      {/* ---- thread ---- */}
      <Panel>
        <ul className="flex flex-col gap-5">
          {request.messages.map((m) => (
            <li
              key={m.id}
              className={`flex gap-3 rounded-card p-4 ${
                m.internal
                  ? "border border-warning/30 bg-warning/[0.04]"
                  : m.mine
                    ? "bg-surface-overlay/50"
                    : "border border-border-subtle"
              }`}
            >
              <Avatar name={m.authorName} size={36} src={m.authorAvatar} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-medium">{m.authorName}</span>
                  {m.internal && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                      internal — the requester does not see this
                    </span>
                  )}
                  <span className="text-xs text-text-muted">{stamp(m.createdAt)}</span>
                </p>
                {/* Plain text. Sanitized on write, rendered as text on read — never
                    HTML, never MDX. */}
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-text-secondary">
                  {m.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {request.attachments.length > 0 && (
          <div className="mt-6 border-t border-border-subtle pt-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
              Attachments
            </h3>
            <ul className="mt-3 flex flex-wrap gap-3">
              {request.attachments.map((a) => (
                <li key={a.id}>
                  {/* Served by a route that asks the SAME access question this page
                      did, and always as a download — never rendered in our origin. */}
                  <Link
                    href={`/api/support-file/${a.id}`}
                    className="flex items-center gap-2 rounded-control border border-border-subtle px-3 py-2 text-sm transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
                  >
                    <span className="truncate">{a.fileName}</span>
                    <span className="text-xs text-text-muted">
                      {Math.max(1, Math.round(a.size / 1024))} KB
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {request.status !== "CLOSED" && (
          <div className="mt-6 border-t border-border-subtle pt-5">
            <ReplyForm requestId={request.id} staff={staff} />
          </div>
        )}
      </Panel>
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/guard";
import { collaborationBoard } from "@/lib/collaborations";
import { linkAccount } from "./actions";
import { AddCollaboration, CollaborationRow } from "./forms";
import { CollaborationControls } from "../admin/collaborations/moderation-forms";
import { Breadcrumb, Panel, StatusDot } from "@/components/dashboard/widgets";

/*
 * Collaboration (Phase 6.5) — the page the bug was on.
 *
 * The symptom was "People shows collaborators, Collaboration is empty". The cause
 * was that they were reading different tables and neither was the relationship:
 *
 *   People             → User(role: COLLABORATOR)     — who has an account
 *   Collaboration      → CollaborationRequest         — who filled in the form
 *
 * Approving a request changed a status and created nothing, so an approved
 * collaborator with an account appeared in one list and not the other, forever.
 * `Collaboration` is now the relationship itself, and this page shows it — plus,
 * deliberately, every collaborator account that does not have one yet, so the two
 * views can be reconciled in a click instead of quietly disagreeing.
 */
export const metadata = { title: "Collaboration" };

export default async function CollaborationsPage() {
  /*
   * `collab.manage`, NOT `collab.view`.
   *
   * `collab.view` is what a COLLABORATOR holds — it is their permission to see
   * their OWN thread on their own dashboard. Gating this page on it would have
   * handed every external collaborator the full list of everyone we work with,
   * which is the exact tenant-isolation failure Phase 5 was built to prevent.
   * This page is staff-only.
   */
  const viewer = await requireCapability("collab.manage");
  const board = await collaborationBoard();

  const canManage = viewer.can("collab.manage");
  const canModerate = viewer.can("collab.moderate");

  const accounts = await db.user.findMany({
    where: { role: "COLLABORATOR" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  const linkedIds = new Set(board.collaborations.map((c) => c.userId).filter(Boolean));
  const linkable = accounts.filter((a) => !linkedIds.has(a.id));

  const pending = board.requests.filter((r) => r.status === "PENDING");

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        trail={[{ label: "Dashboards", href: "/app" }, { label: "Collaboration" }]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Collaboration</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-text-secondary">
            Who we are actually working with. {board.active} active ·{" "}
            {board.collaborations.length} total · {pending.length} request
            {pending.length === 1 ? "" : "s"} awaiting review.
          </p>
        </div>
        {canManage && <AddCollaboration accounts={linkable} />}
      </div>

      {/* ---- the reconciliation the page never had ---- */}
      {board.unlinkedAccounts.length > 0 && (
        <Panel className="border border-warning/30 bg-warning/5">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-warning">
            In People, missing here
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text-secondary">
            {board.unlinkedAccounts.length}{" "}
            {board.unlinkedAccounts.length === 1 ? "account has" : "accounts have"} the
            Collaborator role but no collaboration record. This is the drift that made
            this page look empty while People listed collaborators. Nothing is created
            automatically — an account existing is not proof that a working
            relationship does, and the platform should not invent one.
          </p>

          <ul className="mt-5 flex flex-col gap-3">
            {board.unlinkedAccounts.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-4 rounded-card border border-border-subtle bg-surface-raised p-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{u.name}</span>
                  <span className="block truncate text-sm text-text-muted">{u.email}</span>
                </span>
                {canManage && (
                  <form action={linkAccount}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="h-10 rounded-control bg-ink px-4 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover"
                    >
                      Create collaboration
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---- collaborations ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Collaborations</h2>
        {board.collaborations.length === 0 ? (
          <p className="mt-5 text-[15px] leading-relaxed text-text-muted">
            No collaborations recorded yet. Approve a request below, link a
            collaborator account above, or create one directly — a partnership that
            started over a call does not have to go through the public form first.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col">
            {board.collaborations.map((c) => (
              <CollaborationRow key={c.id} collaboration={c} accounts={linkable} />
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- requests inbox ---- */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Requests from the website
          </h2>
          {canModerate && (
            <Link
              href="/app/admin/collaborations"
              className="text-sm font-medium text-brand-cyan hover:text-brand-teal"
            >
              Full inbox & abuse reports →
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Public submissions. Approving one now <strong>creates the collaboration</strong>{" "}
          — which is precisely what used to be missing. Text is stored sanitized and
          rendered as plain text.
        </p>

        {board.requests.length === 0 ? (
          <p className="mt-5 text-[15px] text-text-muted">No requests yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col">
            {board.requests.slice(0, 10).map((r) => (
              <li
                key={r.id}
                className="border-b border-border-subtle py-4 last:border-0"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[15px] font-semibold">{r.name}</span>
                  <span className="text-sm text-text-secondary">{r.email}</span>
                  {r.org && <span className="text-sm text-text-muted">· {r.org}</span>}
                  <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium capitalize text-text-secondary">
                    {r.kind}
                  </span>
                  <StatusDot status={r.status} />
                  <span className="ml-auto text-xs text-text-muted">
                    {r.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {r.message}
                </p>
                {r.status === "PENDING" && canModerate && (
                  <div className="mt-3">
                    <CollaborationControls id={r.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

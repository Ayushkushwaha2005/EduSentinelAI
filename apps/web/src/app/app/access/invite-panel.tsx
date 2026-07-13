"use client";

import { useActionState, useState } from "react";
import {
  resendInvitation,
  revokeInvitation,
  sendInvitation,
  type InviteState,
} from "./invite-actions";
import { recordAccessReview, type ActionState } from "./actions";
import { ROLE_LABELS, type Role } from "@/lib/roles";

const input =
  "h-10 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan";
const primary =
  "h-10 rounded-control bg-ink px-4 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";

export type PendingInvite = {
  id: string;
  email: string;
  role: Role;
  capabilities: string[];
  status: string;
  expired: boolean;
  invitedByEmail: string;
  expiresAt: Date;
  acceptedAt: Date | null;
};

/*
 * Invite someone (Phase 7.1). The role is chosen HERE, at the moment of the offer:
 * the invitation is the access decision, made once and audited, rather than a
 * signup followed by a scramble to promote.
 *
 * The role list is `invitableBy(actor)` — computed on the server. FOUNDER and
 * CO_FOUNDER are never in it, and neither is anything at or above the inviter's own
 * rank. The server re-checks all of it (lib/invitations.ts): this list is a
 * convenience, not the control.
 */
export function InviteForm({
  roles,
  grantable,
  canAttachCapabilities,
}: {
  roles: Role[];
  grantable: string[];
  canAttachCapabilities: boolean;
}) {
  const [state, action, pending] = useActionState<InviteState, FormData>(
    sendInvitation,
    {},
  );
  const [showCaps, setShowCaps] = useState(false);

  return (
    <form action={action}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-medium text-text-secondary" htmlFor="invite-email">
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="person@example.com"
            className={`mt-2 w-full ${input}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary" htmlFor="invite-role">
            Role on joining
          </label>
          <select id="invite-role" name="role" defaultValue="EMPLOYEE" className={`mt-2 ${input}`}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="block text-sm font-medium text-text-secondary" htmlFor="invite-message">
            Message (optional)
          </label>
          <input
            id="invite-message"
            name="message"
            maxLength={300}
            placeholder="Welcome aboard…"
            className={`mt-2 w-full ${input}`}
          />
        </div>

        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Sending…" : "Send invitation"}
        </button>
      </div>

      {canAttachCapabilities && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowCaps((v) => !v)}
            className="text-sm font-medium text-brand-cyan hover:text-brand-teal"
          >
            {showCaps ? "Hide starting permissions" : "Attach starting permissions"}
          </button>

          {showCaps && (
            <>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                Granted the moment they accept, so nobody spends their first week
                asking for access. Founder-reserved capabilities are not listed and
                are refused by the server even if one is sent.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {grantable.map((cap) => (
                  <label
                    key={cap}
                    className="flex items-center gap-2 rounded-control border border-border-subtle px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      name="capabilities"
                      value={cap}
                      className="h-4 w-4 accent-[--color-brand-cyan]"
                    />
                    <span className="truncate font-mono text-xs">{cap}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {state.error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="mt-3 text-sm text-success">
          {state.notice}
        </p>
      )}
    </form>
  );
}

export function InviteList({ invitations }: { invitations: PendingInvite[] }) {
  if (invitations.length === 0) {
    return (
      <p className="mt-5 text-[15px] text-text-muted">
        No invitations yet. Invite someone above and they arrive with the right
        access already granted.
      </p>
    );
  }

  return (
    <ul className="mt-4 flex flex-col">
      {invitations.map((i) => {
        const state = i.expired ? "EXPIRED" : i.status;
        const tone =
          state === "ACCEPTED"
            ? "bg-success/10 text-success"
            : state === "PENDING"
              ? "bg-warning/10 text-warning"
              : "bg-surface-overlay text-text-secondary";

        return (
          <li
            key={i.id}
            className="flex flex-wrap items-center gap-3 border-b border-border-subtle py-3 last:border-0"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{i.email}</span>
              <span className="block truncate text-xs text-text-muted">
                {ROLE_LABELS[i.role] ?? i.role}
                {i.capabilities.length > 0 && ` · +${i.capabilities.length} permission(s)`}
                {" · invited by "}
                {i.invitedByEmail}
              </span>
            </span>

            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
              {state}
            </span>

            <span className="text-xs text-text-muted">
              {state === "ACCEPTED" && i.acceptedAt
                ? `joined ${i.acceptedAt.toLocaleDateString("en-GB")}`
                : `expires ${i.expiresAt.toLocaleDateString("en-GB")}`}
            </span>

            {i.status === "PENDING" && (
              <span className="flex items-center gap-3">
                {/* Resend issues a NEW token and kills the old one — we could not
                    resend the original even if we wanted to, since only its hash
                    is stored. That is the design, not a limitation. */}
                <form action={resendInvitation}>
                  <input type="hidden" name="id" value={i.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-brand-cyan hover:text-brand-teal"
                  >
                    Resend
                  </button>
                </form>
                <form action={revokeInvitation}>
                  <input type="hidden" name="id" value={i.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-danger hover:opacity-80"
                  >
                    Revoke
                  </button>
                </form>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type ElevatedGrant = {
  id: string;
  capability: string;
  name: string;
  email: string;
  reason: string | null;
  expiresAt: Date | null;
};

/*
 * Quarterly access review (Phase 7.3). The Continuous Security Track has always
 * promised one; this is where it happens, and it leaves a row behind so the
 * promise is a fact rather than a claim.
 */
export function AccessReview({
  grants,
  lastReview,
}: {
  grants: ElevatedGrant[];
  lastReview: { reviewedAt: Date; revoked: number } | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    recordAccessReview,
    {},
  );

  return (
    <form action={action}>
      <p className="max-w-3xl text-[15px] leading-relaxed text-text-secondary">
        Everyone holding an explicit capability beyond their role. Tick anything that
        should no longer be there, then record the review — the grants are removed and
        those accounts are signed out immediately.
        {lastReview && (
          <>
            {" "}
            Last reviewed {lastReview.reviewedAt.toLocaleDateString("en-GB")} (
            {lastReview.revoked} revoked).
          </>
        )}
      </p>

      {grants.length === 0 ? (
        <p className="mt-4 text-[15px] text-text-muted">
          Nobody holds a capability beyond their role defaults. There is nothing to
          review, which is the best possible outcome of a review.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {grants.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center gap-3 rounded-control border border-border-subtle px-3 py-2"
            >
              <input
                type="checkbox"
                name="revoke"
                value={g.id}
                id={`rev-${g.id}`}
                className="h-4 w-4 accent-[--color-danger]"
              />
              <label htmlFor={`rev-${g.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {g.name}{" "}
                  <span className="font-mono text-xs text-brand-teal">{g.capability}</span>
                </span>
                <span className="block truncate text-xs text-text-muted">
                  {g.email}
                  {g.reason && ` · “${g.reason}”`}
                  {g.expiresAt
                    ? ` · expires ${g.expiresAt.toLocaleDateString("en-GB")}`
                    : " · no expiry"}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="review-note">
          Review note
        </label>
        <input
          id="review-note"
          name="note"
          maxLength={300}
          placeholder="Note (optional)"
          className={`min-w-[240px] flex-1 ${input}`}
        />
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Recording…" : "Record access review"}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="mt-3 text-sm text-success">
          {state.ok}
        </p>
      )}
    </form>
  );
}

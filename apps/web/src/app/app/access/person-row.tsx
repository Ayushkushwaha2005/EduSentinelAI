"use client";

import { useActionState, useState } from "react";
import {
  clearPermissionAction,
  offboard,
  revokeSessionsAction,
  setPermissionAction,
  setRoleAction,
  type ActionState,
} from "./actions";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { ChevronDown } from "@/components/dashboard/icons";

const EMPTY: ActionState = {};

/*
 * Per-person controls. The Founder's own account and the FOUNDER role are
 * inert here — but that is a courtesy of the UI; the server refuses these
 * changes regardless (lib/authz.ts, lib/permissions.ts).
 */
export function PersonRow({
  user,
  isSelf,
  isFounderAccount,
  roles,
  grantable,
  defaults,
  overrides,
  canOffboard,
}: {
  user: { id: string; email: string; role: string };
  isSelf: boolean;
  isFounderAccount: boolean;
  roles: Role[];
  grantable: string[];
  defaults: string[];
  overrides: { capability: string; allow: boolean; expiresAt: Date | null; reason: string | null }[];
  canOffboard: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [roleState, roleAction, rolePending] = useActionState(setRoleAction, EMPTY);
  const [permState, permAction, permPending] = useActionState(setPermissionAction, EMPTY);
  const [clearState, clearAction] = useActionState(clearPermissionAction, EMPTY);
  const [sessState, sessAction] = useActionState(revokeSessionsAction, EMPTY);
  const [offState, offAction, offPending] = useActionState(offboard, EMPTY);
  const [offOpen, setOffOpen] = useState(false);

  const locked = isSelf || isFounderAccount;
  const overrideOf = (cap: string) => overrides.find((o) => o.capability === cap);
  const message =
    roleState.error ??
    permState.error ??
    clearState.error ??
    sessState.error ??
    offState.error ??
    roleState.ok ??
    permState.ok ??
    clearState.ok ??
    sessState.ok ??
    offState.ok;
  const isError = !!(
    roleState.error ??
    permState.error ??
    clearState.error ??
    sessState.error ??
    offState.error
  );

  /*
   * "Why can this person do this?" (Phase 7.4).
   *
   * Authorization that cannot be inspected becomes folklore — people remember that
   * someone "has access" and nobody remembers why. Every capability states its
   * provenance: the role default, an explicit grant, an explicit revoke, and when
   * it lapses.
   */
  const explain = (cap: string) => {
    const byDefault = defaults.includes(cap);
    const override = overrideOf(cap);
    if (!override) return byDefault ? "from role" : "not in role";
    const when = override.expiresAt
      ? ` · expires ${new Date(override.expiresAt).toLocaleDateString("en-GB")}`
      : " · no expiry";
    const what = override.allow
      ? byDefault
        ? "granted explicitly (already in role)"
        : "granted explicitly"
      : byDefault
        ? "revoked explicitly (overrides role)"
        : "revoked explicitly";
    return what + when;
  };

  return (
    <div className="mt-4 border-t border-border-subtle pt-4">
      {locked ? (
        <p className="text-sm text-text-muted">
          {isSelf
            ? "You cannot change your own role or permissions."
            : "The Founder account cannot be modified."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <form action={roleAction} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={user.id} />
              <label className="text-sm text-text-secondary" htmlFor={`role-${user.id}`}>
                Role
              </label>
              <select
                id={`role-${user.id}`}
                name="role"
                defaultValue={user.role}
                className="h-9 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={rolePending}
                className="h-9 rounded-control bg-ink px-3 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60"
              >
                {rolePending ? "Saving…" : "Apply"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex h-9 items-center gap-1.5 rounded-control border border-border-subtle px-3 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
            >
              Permissions
              <ChevronDown size={15} className={open ? "rotate-180" : ""} />
            </button>

            <form action={sessAction}>
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                className="h-9 rounded-control border border-border-subtle px-3 text-sm font-medium text-danger transition-colors duration-[--duration-fast] hover:bg-danger/5"
              >
                Revoke sessions
              </button>
            </form>

            {canOffboard && (
              <button
                type="button"
                onClick={() => setOffOpen((v) => !v)}
                aria-expanded={offOpen}
                className="h-9 rounded-control px-3 text-sm font-medium text-danger transition-colors duration-[--duration-fast] hover:bg-danger/5"
              >
                Offboard
              </button>
            )}
          </div>

          {/* Offboarding: one action, everything that must happen. The account is
              NOT deleted — the audit chain snapshots the actor precisely so a record
              survives the person. What is removed is access. */}
          {offOpen && canOffboard && (
            <form
              action={offAction}
              className="mt-4 rounded-card border border-danger/30 bg-danger/[0.03] p-4"
            >
              <input type="hidden" name="userId" value={user.id} />
              <p className="text-sm font-semibold text-danger">Offboard {user.email}</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                Role stripped to Member, every capability removed, all sessions
                revoked, pending invitations they sent withdrawn, products they own
                reassigned to you, teams and open tasks released, org-chart entry
                removed and collaborations ended. The account and its history remain
                — offboarding is not deletion.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`off-confirm-${user.id}`}>
                  Type {user.email} to confirm
                </label>
                <input
                  id={`off-confirm-${user.id}`}
                  name="confirm"
                  required
                  placeholder={`Type ${user.email} to confirm`}
                  className="h-9 min-w-[240px] flex-1 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-danger"
                />
                <label className="sr-only" htmlFor={`off-reason-${user.id}`}>
                  Reason
                </label>
                <input
                  id={`off-reason-${user.id}`}
                  name="reason"
                  placeholder="Reason (optional)"
                  className="h-9 min-w-[160px] rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan"
                />
                <button
                  type="submit"
                  disabled={offPending}
                  className="h-9 rounded-control bg-danger px-4 text-sm font-medium text-surface-raised transition-opacity duration-[--duration-fast] hover:opacity-90 disabled:opacity-60"
                >
                  {offPending ? "Offboarding…" : "Offboard"}
                </button>
              </div>
            </form>
          )}

          {open && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {grantable.map((cap) => {
                const byDefault = defaults.includes(cap);
                const override = overrideOf(cap);
                const effective = override ? override.allow : byDefault;

                return (
                  <div
                    key={cap}
                    className="flex items-center justify-between gap-3 rounded-control border border-border-subtle px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs font-medium">
                        {cap}
                      </span>
                      <span className="block text-[11px] text-text-muted">
                        {explain(cap)}
                      </span>
                      {override?.reason && (
                        <span className="block truncate text-[11px] text-text-muted">
                          “{override.reason}”
                        </span>
                      )}
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      <form action={permAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="capability" value={cap} />
                        <input type="hidden" name="allow" value={String(!effective)} />
                        {/* Temporary access that quietly becomes permanent is how a
                            company stops knowing who can do what. Expiry is now a
                            choice, and effectiveCapabilities() has always honoured it. */}
                        {!effective && (
                          <>
                            <label className="sr-only" htmlFor={`exp-${user.id}-${cap}`}>
                              Expiry for {cap}
                            </label>
                            <select
                              id={`exp-${user.id}-${cap}`}
                              name="expiresInDays"
                              defaultValue="0"
                              className="h-7 rounded-full border border-border-subtle bg-surface-raised px-1.5 text-[11px] outline-none focus:border-brand-cyan"
                            >
                              <option value="0">forever</option>
                              <option value="7">7 days</option>
                              <option value="30">30 days</option>
                              <option value="90">90 days</option>
                            </select>
                          </>
                        )}
                        <button
                          type="submit"
                          disabled={permPending}
                          className={`h-7 rounded-full px-2.5 text-xs font-medium transition-colors duration-[--duration-fast] disabled:opacity-60 ${
                            effective
                              ? "bg-success/10 text-success hover:bg-success/20"
                              : "bg-surface-overlay text-text-secondary hover:bg-border-subtle"
                          }`}
                        >
                          {effective ? "Allowed" : "Denied"}
                        </button>
                      </form>

                      {override && (
                        <form action={clearAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="capability" value={cap} />
                          <button
                            type="submit"
                            title="Reset to role default"
                            className="h-7 rounded-full px-2 text-xs text-text-muted hover:text-text-primary"
                          >
                            Reset
                          </button>
                        </form>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {message && (
        <p
          className={`mt-3 text-sm ${isError ? "text-danger" : "text-success"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}

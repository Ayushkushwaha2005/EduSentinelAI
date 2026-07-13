"use client";

import { useActionState, useState } from "react";
import {
  clearPermissionAction,
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
}: {
  user: { id: string; email: string; role: string };
  isSelf: boolean;
  isFounderAccount: boolean;
  roles: Role[];
  grantable: string[];
  defaults: string[];
  overrides: { capability: string; allow: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [roleState, roleAction, rolePending] = useActionState(setRoleAction, EMPTY);
  const [permState, permAction, permPending] = useActionState(setPermissionAction, EMPTY);
  const [clearState, clearAction] = useActionState(clearPermissionAction, EMPTY);
  const [sessState, sessAction] = useActionState(revokeSessionsAction, EMPTY);

  const locked = isSelf || isFounderAccount;
  const overrideOf = (cap: string) => overrides.find((o) => o.capability === cap);
  const message =
    roleState.error ??
    permState.error ??
    clearState.error ??
    sessState.error ??
    roleState.ok ??
    permState.ok ??
    clearState.ok ??
    sessState.ok;
  const isError = !!(roleState.error ?? permState.error ?? clearState.error ?? sessState.error);

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
          </div>

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
                        {override
                          ? override.allow
                            ? "granted explicitly"
                            : "revoked explicitly"
                          : byDefault
                            ? "from role"
                            : "not in role"}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      <form action={permAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="capability" value={cap} />
                        <input type="hidden" name="allow" value={String(!effective)} />
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

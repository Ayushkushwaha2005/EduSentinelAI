"use client";

import { useActionState, useState } from "react";
import type { OrgSessionRow } from "@/lib/sessions";
import { ApprovalDialog } from "@/components/dashboard/approval";
import { adminEndSessionAction, type OrgSessionState } from "./actions";

/*
 * Presentation for the Session Center.
 *
 * `canManage` decides whether the end-session controls RENDER — it never
 * decides whether they work. The action re-checks `sessions.manage` on the
 * server every time, so a control forced into the DOM still ends nothing, and
 * an executive without the capability sees the approval dialog instead of an
 * error.
 */

const when = (d: Date) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function ago(d: Date) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 2) return "active now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function OrgSessions({
  groups,
  canManage,
}: {
  groups: OrgSessionRow[][];
  canManage: boolean;
}) {
  const [state, act, pending] = useActionState<OrgSessionState, FormData>(
    adminEndSessionAction,
    {},
  );
  /* The dialog is DERIVED from the action's result, not pushed into state by an
     effect. Each run returns a fresh state object, so remembering which one was
     dismissed is enough to close it without a cascading render. */
  const [dismissed, setDismissed] = useState<OrgSessionState | null>(null);
  const dialog = !!state.approval && dismissed !== state;

  const total = groups.reduce((n, g) => n + g.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Active sessions</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {total} live {total === 1 ? "session" : "sessions"} across{" "}
            {groups.length} {groups.length === 1 ? "account" : "accounts"}.
          </p>
        </div>
      </div>

      {state.notice && (
        <p role="status" className="mt-4 text-sm text-success">
          {state.notice}
        </p>
      )}
      {state.error && !state.approval && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {state.error}
        </p>
      )}

      {groups.length === 0 ? (
        <p className="mt-5 text-[15px] leading-relaxed text-text-muted">
          No active sessions recorded. Sessions appear here as people sign in —
          those that began before session recording existed are not listed,
          because nothing was recorded about them.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {groups.map((rows) => {
            const person = rows[0];
            return (
              <li key={person.userId} className="rounded-card border border-border-subtle p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">
                      {person.userName}
                      <span className="ml-2 rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                        {person.userRole}
                      </span>
                    </span>
                    <span className="block truncate text-sm text-text-muted">
                      {person.userEmail} · {rows.length}{" "}
                      {rows.length === 1 ? "device" : "devices"}
                    </span>
                  </span>

                  {canManage && (
                    <form action={act}>
                      <input type="hidden" name="scope" value="user" />
                      <input type="hidden" name="userId" value={person.userId} />
                      <button
                        type="submit"
                        disabled={pending}
                        className="h-9 rounded-control border border-danger/40 px-3.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                      >
                        End all
                      </button>
                    </form>
                  )}
                </div>

                <ul className="mt-3 flex flex-col gap-2">
                  {rows.map((s) => (
                    <li
                      key={s.id}
                      className={`flex flex-wrap items-center gap-3 rounded-[12px] border px-3.5 py-2.5 ${
                        s.current ? "border-brand-cyan/50 bg-brand-cyan/[0.04]" : "border-border-subtle"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {s.browser} on {s.os}
                          <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] font-normal text-text-muted">
                            {s.device}
                          </span>
                          {s.current && (
                            <span className="rounded-full bg-brand-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-brand-cyan">
                              This device
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {s.location ?? "Location unknown"}
                          {s.ip && ` · ${s.ip}`} · in {when(s.createdAt)} · {ago(s.lastSeenAt)}
                        </span>
                      </span>

                      {canManage && !s.current && (
                        <form action={act}>
                          <input type="hidden" name="scope" value="one" />
                          <input type="hidden" name="sessionId" value={s.id} />
                          <input type="hidden" name="userId" value={s.userId} />
                          <button
                            type="submit"
                            disabled={pending}
                            className="h-8 shrink-0 rounded-control border border-border-subtle px-3 text-xs font-medium transition-colors hover:bg-surface-overlay disabled:opacity-50"
                          >
                            End
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <ApprovalDialog
        open={dialog}
        title={state.error ?? "Founder approval required."}
        body="This operation requires Founder authorization before production changes can be applied."
        simulated="The session you selected was identified and validated. Ending it is awaiting Founder authorization."
        onClose={() => setDismissed(state)}
      />
    </div>
  );
}

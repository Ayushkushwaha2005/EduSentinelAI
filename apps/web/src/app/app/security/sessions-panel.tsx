"use client";

import { useActionState } from "react";
import type { SessionRow } from "@/lib/sessions";
import { endSessionsAction, type SessionActionState } from "./session-actions";

/*
 * Active sessions.
 *
 * Presentational. Every row was produced by `sessionsFor(viewer.id, …)`, which
 * is scoped to the caller — this component cannot be made to show anybody
 * else's devices by changing a prop, because it never asks for them.
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
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function DeviceIcon({ device }: { device: string }) {
  if (device === "Phone" || device === "Tablet") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function SessionsPanel({ sessions }: { sessions: SessionRow[] }) {
  /* One action, one pending flag. The `scope` field in each form says which
     rows to end; the server re-derives who is asking either way. */
  const [state, act, pending] = useActionState<SessionActionState, FormData>(
    endSessionsAction,
    {},
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Active sessions</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Every device currently signed in to your account. Location is
            approximate and comes from the connection itself — we do not look
            your address up anywhere.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={act}>
            <input type="hidden" name="scope" value="others" />
            <button
              type="submit"
              disabled={pending || sessions.length < 2}
              className="h-10 rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors hover:bg-surface-overlay disabled:opacity-50"
            >
              {pending ? "Working…" : "Sign out other devices"}
            </button>
          </form>
          <form action={act}>
            <input type="hidden" name="scope" value="all" />
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-control border border-danger/40 px-4 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              {pending ? "Working…" : "Sign out everywhere"}
            </button>
          </form>
        </div>
      </div>

      {(state.error || state.notice) && (
        <p
          role={state.error ? "alert" : "status"}
          className={`mt-4 text-sm ${state.error ? "text-danger" : "text-success"}`}
        >
          {state.error ?? state.notice}
        </p>
      )}

      {sessions.length === 0 ? (
        <p className="mt-5 text-[15px] leading-relaxed text-text-muted">
          No sessions recorded yet. Devices appear here after your next sign-in —
          sessions that began before this feature existed are not listed, because
          nothing was recorded about them and inventing entries would be worse
          than showing none.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {sessions.map((s) => (
            <li
              key={s.id}
              className={`flex flex-wrap items-center gap-4 rounded-card border p-4 ${
                s.current ? "border-brand-cyan/50 bg-brand-cyan/[0.04]" : "border-border-subtle"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-overlay text-text-secondary">
                <DeviceIcon device={s.device} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-medium">
                    {s.browser} on {s.os}
                  </span>
                  {s.current && (
                    <span className="rounded-full bg-brand-cyan/15 px-2 py-0.5 text-[11px] font-semibold text-brand-cyan">
                      This device
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-text-secondary">
                  {s.location ?? "Location unknown"}
                  {s.ip && <span className="text-text-muted"> · {s.ip}</span>}
                </span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  Signed in {when(s.createdAt)} · {ago(s.lastSeenAt)}
                </span>
              </span>

              {!s.current && (
                <form action={act}>
                  <input type="hidden" name="scope" value="one" />
                  <input type="hidden" name="sessionId" value={s.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="h-9 shrink-0 rounded-control border border-border-subtle px-3.5 text-sm font-medium transition-colors hover:bg-surface-overlay disabled:opacity-50"
                  >
                    Sign out
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

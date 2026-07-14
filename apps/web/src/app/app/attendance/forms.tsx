"use client";

import { useActionState, useState } from "react";
import {
  clockIn,
  clockOut,
  decideCorrection,
  requestCorrection,
  setTodayStatus,
  type HrState,
} from "./actions";

const primary =
  "h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";
const ghost =
  "h-10 rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay disabled:opacity-60";
const input =
  "h-10 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan";

function Feedback({ state }: { state: HrState }) {
  if (state.error)
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.notice)
    return (
      <p role="status" className="mt-3 text-sm text-success">
        {state.notice}
      </p>
    );
  return null;
}

const time = (d: Date | null) =>
  d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";

export function ClockPanel({
  today,
}: {
  today: { status: string; clockIn: Date | null; clockOut: Date | null } | null;
}) {
  const [state, action, pending] = useActionState<HrState, FormData>(setTodayStatus, {});

  const inAt = today?.clockIn ?? null;
  const outAt = today?.clockOut ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <p className="text-sm text-text-secondary">Clocked in</p>
          <p className="mt-0.5 text-[22px] font-semibold tabular-nums tracking-[-0.01em]">
            {time(inAt)}
          </p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Clocked out</p>
          <p className="mt-0.5 text-[22px] font-semibold tabular-nums tracking-[-0.01em]">
            {time(outAt)}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {!inAt && (
            <form action={clockIn}>
              <button type="submit" className={primary}>
                Clock in
              </button>
            </form>
          )}
          {inAt && !outAt && (
            <form action={clockOut}>
              <button type="submit" className={primary}>
                Clock out
              </button>
            </form>
          )}
          {inAt && outAt && (
            <span className="text-sm text-text-muted">Day complete.</span>
          )}
        </div>
      </div>

      {/* A day-state, for the days that are not simply "at my desk". LEAVE is not
          here on purpose: booking it through Leave is what keeps the balance right. */}
      <form action={action} className="mt-6 flex flex-wrap items-end gap-3 border-t border-border-subtle pt-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary" htmlFor="att-status">
            Today
          </label>
          <select
            id="att-status"
            name="status"
            defaultValue={today?.status ?? "WORKING"}
            className={`mt-2 ${input}`}
          >
            <option value="WORKING">Working</option>
            <option value="REMOTE">Remote</option>
            <option value="SICK">Sick</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="block text-sm font-medium text-text-secondary" htmlFor="att-note">
            Note (optional)
          </label>
          <input id="att-note" name="note" maxLength={300} className={`mt-2 w-full ${input}`} />
        </div>
        <button type="submit" disabled={pending} className={ghost}>
          {pending ? "Saving…" : "Update"}
        </button>
        <span className="w-full">
          <Feedback state={state} />
        </span>
      </form>
    </div>
  );
}

/** Ask for a past day to be corrected. It does not land until someone approves it. */
export function CorrectionForm({
  attendanceId,
  current,
}: {
  attendanceId: string;
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<HrState, FormData>(requestCorrection, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-brand-cyan hover:text-brand-teal"
      >
        Request correction
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="attendanceId" value={attendanceId} />
      <label className="sr-only" htmlFor={`fix-${attendanceId}`}>
        Correct to
      </label>
      <select
        id={`fix-${attendanceId}`}
        name="toStatus"
        defaultValue={current === "WORKING" ? "REMOTE" : "WORKING"}
        className={input}
      >
        <option value="WORKING">Working</option>
        <option value="REMOTE">Remote</option>
        <option value="SICK">Sick</option>
        <option value="ABSENT">Absent</option>
      </select>
      <input
        name="reason"
        required
        maxLength={300}
        placeholder="Why is it wrong?"
        className={`min-w-[180px] flex-1 ${input}`}
      />
      <button type="submit" disabled={pending} className={ghost}>
        {pending ? "Sending…" : "Request"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-muted">
        Cancel
      </button>
      <span className="w-full">
        <Feedback state={state} />
      </span>
    </form>
  );
}

export function CorrectionDecision({ id }: { id: string }) {
  const [state, action, pending] = useActionState<HrState, FormData>(decideCorrection, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`note-${id}`}>
        Decision note
      </label>
      <input
        id={`note-${id}`}
        name="note"
        maxLength={300}
        placeholder="Note (optional)"
        className={`min-w-[160px] ${input}`}
      />
      <button
        type="submit"
        name="decision"
        value="APPROVED"
        disabled={pending}
        className="h-10 rounded-control bg-success/10 px-4 text-sm font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-60"
      >
        Approve
      </button>
      <button
        type="submit"
        name="decision"
        value="REJECTED"
        disabled={pending}
        className="h-10 rounded-control px-4 text-sm font-medium text-danger transition-colors hover:bg-danger/5 disabled:opacity-60"
      >
        Reject
      </button>
      <span className="w-full">
        <Feedback state={state} />
      </span>
    </form>
  );
}

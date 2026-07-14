"use client";

import { useActionState } from "react";
import { cancelLeave, decideLeave, requestLeave, type LeaveState } from "./actions";

const input =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] outline-none focus:border-brand-cyan";
const label = "block text-sm font-medium text-text-secondary";
const primary =
  "h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";

function Feedback({ state }: { state: LeaveState }) {
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

export type LeaveTypeOption = {
  typeId: string;
  name: string;
  remaining: number;
  paid: boolean;
};

export function RequestForm({ types }: { types: LeaveTypeOption[] }) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(requestLeave, {});

  if (types.length === 0) {
    return (
      <p className="text-[15px] text-text-muted">
        No leave types configured yet. Someone with calendar permissions sets them up
        on the Calendar page.
      </p>
    );
  }

  return (
    <form action={action}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={label} htmlFor="leaveTypeId">
            Type
          </label>
          <select id="leaveTypeId" name="leaveTypeId" required className={`mt-2 ${input}`}>
            {types.map((t) => (
              <option key={t.typeId} value={t.typeId}>
                {t.name} ({t.remaining} left)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="startDate">
            From
          </label>
          <input id="startDate" name="startDate" type="date" required className={`mt-2 ${input}`} />
        </div>
        <div>
          <label className={label} htmlFor="endDate">
            To
          </label>
          <input id="endDate" name="endDate" type="date" required className={`mt-2 ${input}`} />
        </div>
        <div>
          <label className={label} htmlFor="reason">
            Reason (optional)
          </label>
          <input id="reason" name="reason" maxLength={300} className={`mt-2 ${input}`} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Requesting…" : "Request leave"}
        </button>
        <p className="text-sm text-text-muted">
          Weekends and company holidays inside your dates are not charged to your
          balance. Your reason is visible only to you and whoever decides the request.
        </p>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function CancelButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(cancelLeave, {});

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-danger hover:opacity-80 disabled:opacity-60"
      >
        {pending ? "Cancelling…" : "Cancel"}
      </button>
      {state.error && (
        <span role="alert" className="ml-2 text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function DecisionForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(decideLeave, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`ln-${id}`}>
        Decision note
      </label>
      <input
        id={`ln-${id}`}
        name="note"
        maxLength={300}
        placeholder="Note (optional)"
        className="h-10 min-w-[160px] rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan"
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

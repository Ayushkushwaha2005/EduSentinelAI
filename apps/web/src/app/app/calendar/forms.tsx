"use client";

import { useActionState } from "react";
import {
  removeHoliday,
  saveHoliday,
  saveLeaveType,
  setEntitlement,
  type LeaveState,
} from "../leave/actions";

const input =
  "h-10 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan";
const label = "block text-sm font-medium text-text-secondary";
const primary =
  "h-10 rounded-control bg-ink px-4 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";

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

export function HolidayForm() {
  const [state, action, pending] = useActionState<LeaveState, FormData>(saveHoliday, {});

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <label className={label} htmlFor="h-name">
          Holiday
        </label>
        <input id="h-name" name="name" required maxLength={80} className={`mt-2 w-full ${input}`} />
      </div>
      <div>
        <label className={label} htmlFor="h-date">
          Date
        </label>
        <input id="h-date" name="date" type="date" required className={`mt-2 ${input}`} />
      </div>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Adding…" : "Add holiday"}
      </button>
      <span className="w-full">
        <Feedback state={state} />
      </span>
    </form>
  );
}

export function RemoveHoliday({ id }: { id: string }) {
  return (
    <form action={removeHoliday}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm font-medium text-danger hover:opacity-80">
        Remove
      </button>
    </form>
  );
}

export function LeaveTypeForm({
  type,
}: {
  type?: { id: string; name: string; code: string; defaultDays: number; paid: boolean };
}) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(saveLeaveType, {});
  const key = type?.id ?? "new";

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {type && <input type="hidden" name="id" value={type.id} />}
      <div className="min-w-[160px] flex-1">
        <label className={label} htmlFor={`lt-name-${key}`}>
          Name
        </label>
        <input
          id={`lt-name-${key}`}
          name="name"
          defaultValue={type?.name ?? ""}
          required
          maxLength={60}
          className={`mt-2 w-full ${input}`}
        />
      </div>
      <div className="w-28">
        <label className={label} htmlFor={`lt-code-${key}`}>
          Code
        </label>
        <input
          id={`lt-code-${key}`}
          name="code"
          defaultValue={type?.code ?? ""}
          required
          maxLength={20}
          placeholder="ANNUAL"
          className={`mt-2 w-full ${input}`}
        />
      </div>
      <div className="w-28">
        <label className={label} htmlFor={`lt-days-${key}`}>
          Days/year
        </label>
        <input
          id={`lt-days-${key}`}
          name="defaultDays"
          type="number"
          min={0}
          max={365}
          defaultValue={type?.defaultDays ?? 0}
          className={`mt-2 w-full ${input}`}
        />
      </div>
      <label className="flex h-10 items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          name="paid"
          defaultChecked={type?.paid ?? true}
          className="h-4 w-4 accent-[--color-brand-cyan]"
        />
        Paid
      </label>
      <button type="submit" disabled={pending} className={primary}>
        {type ? "Save" : "Add type"}
      </button>
      <span className="w-full">
        <Feedback state={state} />
      </span>
    </form>
  );
}

export function EntitlementForm({
  people,
  types,
}: {
  people: { id: string; name: string }[];
  types: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(setEntitlement, {});

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px] flex-1">
        <label className={label} htmlFor="ent-user">
          Person
        </label>
        <select id="ent-user" name="userId" required className={`mt-2 w-full ${input}`}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[150px]">
        <label className={label} htmlFor="ent-type">
          Leave type
        </label>
        <select id="ent-type" name="leaveTypeId" required className={`mt-2 w-full ${input}`}>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <label className={label} htmlFor="ent-days">
          Days
        </label>
        <input
          id="ent-days"
          name="entitled"
          type="number"
          min={0}
          max={365}
          required
          className={`mt-2 w-full ${input}`}
        />
      </div>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Saving…" : "Set entitlement"}
      </button>
      <span className="w-full">
        <Feedback state={state} />
      </span>
    </form>
  );
}

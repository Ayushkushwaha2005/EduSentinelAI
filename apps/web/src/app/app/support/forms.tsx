"use client";

import { useActionState, useState } from "react";
import { raiseRequest, reply, updateRequest, type SupportState } from "./actions";
import { CATEGORIES, PRIORITIES, SUPPORT_STATUSES } from "@/lib/support-types";

const input =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] outline-none focus:border-brand-cyan";
const label = "block text-sm font-medium text-text-secondary";
const primary =
  "h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";
const ghost =
  "h-10 rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay";

function Feedback({ state }: { state: SupportState }) {
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

export function RaiseForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SupportState, FormData>(raiseRequest, {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={primary}>
        New request
      </button>
    );
  }

  return (
    <form action={action} className="rounded-card border border-border-subtle p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="subject">
            Subject
          </label>
          <input id="subject" name="subject" required maxLength={120} className={`mt-2 ${input}`} />
        </div>
        <div>
          <label className={label} htmlFor="category">
            Category
          </label>
          <select id="category" name="category" defaultValue="other" className={`mt-2 ${input}`}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="priority">
            Priority
          </label>
          <select id="priority" name="priority" defaultValue="NORMAL" className={`mt-2 ${input}`}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="body">
            What do you need?
          </label>
          <textarea
            id="body"
            name="body"
            rows={5}
            required
            maxLength={4000}
            className="mt-2 w-full rounded-control border border-border-subtle bg-surface-raised p-3.5 text-[15px] leading-relaxed outline-none focus:border-brand-cyan"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="attachment">
            Attachment (optional)
          </label>
          <input
            id="attachment"
            type="file"
            name="attachment"
            accept="image/png,image/jpeg,application/pdf,application/zip"
            className="mt-2 max-w-full text-sm text-text-secondary file:mr-3 file:h-10 file:cursor-pointer file:rounded-control file:border file:border-border-subtle file:bg-surface-raised file:px-4 file:text-sm file:font-medium file:text-text-primary"
          />
          <p className="mt-1.5 text-xs text-text-muted">
            PNG, JPEG, PDF or ZIP, up to 10 MB. Checked by its actual contents, not
            its name.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Sending…" : "Send request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={ghost}>
          Cancel
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ReplyForm({
  requestId,
  staff,
}: {
  requestId: string;
  staff: boolean;
}) {
  const [state, action, pending] = useActionState<SupportState, FormData>(reply, {});

  return (
    <form action={action}>
      <input type="hidden" name="requestId" value={requestId} />
      <label className="sr-only" htmlFor={`reply-${requestId}`}>
        Reply
      </label>
      <textarea
        id={`reply-${requestId}`}
        name="body"
        rows={4}
        required
        maxLength={4000}
        placeholder="Write a reply…"
        className="w-full rounded-control border border-border-subtle bg-surface-raised p-3.5 text-[15px] leading-relaxed outline-none focus:border-brand-cyan"
      />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Sending…" : "Send reply"}
        </button>

        {/* Staff only. The server refuses the flag from anyone else rather than
            trusting a checkbox that is not supposed to be there. */}
        {staff && (
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="internal"
              className="h-4 w-4 accent-[--color-brand-cyan]"
            />
            Internal note — the requester never sees this
          </label>
        )}
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ManageForm({
  request,
  responders,
}: {
  request: {
    id: string;
    status: string;
    priority: string;
    assigneeId: string | null;
  };
  responders: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<SupportState, FormData>(updateRequest, {});

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={request.id} />

      <div>
        <label className={label} htmlFor={`st-${request.id}`}>
          Status
        </label>
        <select
          id={`st-${request.id}`}
          name="status"
          defaultValue={request.status}
          className={`mt-2 h-10 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan`}
        >
          {SUPPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor={`pr-${request.id}`}>
          Priority
        </label>
        <select
          id={`pr-${request.id}`}
          name="priority"
          defaultValue={request.priority}
          className="mt-2 h-10 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[180px]">
        <label className={label} htmlFor={`as-${request.id}`}>
          Assignee
        </label>
        <select
          id={`as-${request.id}`}
          name="assigneeId"
          defaultValue={request.assigneeId ?? ""}
          className="mt-2 h-10 w-full rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan"
        >
          <option value="">Unassigned</option>
          {responders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={pending} className={ghost}>
        {pending ? "Saving…" : "Update"}
      </button>

      <span className="w-full">
        <Feedback state={state} />
      </span>
    </form>
  );
}

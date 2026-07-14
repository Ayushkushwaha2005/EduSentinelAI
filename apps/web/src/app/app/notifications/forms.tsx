"use client";

import { useActionState } from "react";
import { broadcast, markAllRead, markOneRead, type NotifyState } from "./actions";

const input =
  "h-10 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan";
const primary =
  "h-10 rounded-control bg-ink px-4 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";

export function MarkAllRead() {
  return (
    <form action={markAllRead}>
      <button
        type="submit"
        className="h-10 rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
      >
        Mark all read
      </button>
    </form>
  );
}

export function MarkOneRead({ id }: { id: string }) {
  return (
    <form action={markOneRead}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm text-text-muted hover:text-text-primary">
        Mark read
      </button>
    </form>
  );
}

export function BroadcastForm() {
  const [state, action, pending] = useActionState<NotifyState, FormData>(broadcast, {});

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <label className="block text-sm font-medium text-text-secondary" htmlFor="b-title">
          Announcement
        </label>
        <input
          id="b-title"
          name="title"
          required
          maxLength={120}
          className={`mt-2 w-full ${input}`}
        />
      </div>
      <div className="min-w-[180px] flex-1">
        <label className="block text-sm font-medium text-text-secondary" htmlFor="b-body">
          Detail (optional)
        </label>
        <input
          id="b-body"
          name="body"
          maxLength={160}
          className={`mt-2 w-full ${input}`}
        />
      </div>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Sending…" : "Send to everyone"}
      </button>

      <span className="w-full">
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
      </span>
    </form>
  );
}

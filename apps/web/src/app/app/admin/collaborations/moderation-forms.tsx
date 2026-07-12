"use client";

import { useActionState } from "react";
import {
  moderateCollaborationAction,
  handleAbuseReportAction,
  type ModerationState,
} from "./actions";

function Error({ state }: { state: ModerationState }) {
  if (!state.error) return null;
  return (
    <span role="alert" className="text-xs text-danger">
      {state.error}
    </span>
  );
}

const btn =
  "h-9 rounded-control px-3.5 text-xs font-medium transition-colors disabled:opacity-50";

export function CollaborationControls({ id }: { id: string }) {
  const [state, action, pending] = useActionState(moderateCollaborationAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="note"
        placeholder="Internal note (optional)"
        className="h-9 w-52 rounded-control border border-border-subtle bg-surface-raised px-3 text-xs placeholder:text-text-muted focus:border-ink focus:outline-none"
      />
      <button
        type="submit"
        name="status"
        value="APPROVED"
        disabled={pending}
        className={`${btn} bg-ink text-surface-raised hover:bg-ink-hover`}
      >
        Approve
      </button>
      <button
        type="submit"
        name="status"
        value="REJECTED"
        disabled={pending}
        className={`${btn} border border-border-subtle hover:bg-surface-overlay`}
      >
        Reject
      </button>
      <button
        type="submit"
        name="status"
        value="SPAM"
        disabled={pending}
        className={`${btn} border border-danger/40 text-danger hover:bg-danger/5`}
      >
        Spam
      </button>
      <Error state={state} />
    </form>
  );
}

export function AbuseControls({ id }: { id: string }) {
  const [state, action, pending] = useActionState(handleAbuseReportAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="status"
        value="ACTIONED"
        disabled={pending}
        className={`${btn} bg-ink text-surface-raised hover:bg-ink-hover`}
      >
        Mark actioned
      </button>
      <button
        type="submit"
        name="status"
        value="DISMISSED"
        disabled={pending}
        className={`${btn} border border-border-subtle hover:bg-surface-overlay`}
      >
        Dismiss
      </button>
      <Error state={state} />
    </form>
  );
}

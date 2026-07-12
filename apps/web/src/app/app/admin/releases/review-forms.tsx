"use client";

import { useActionState } from "react";
import {
  publishReleaseAction,
  rejectReleaseAction,
  revokeReleaseAction,
  type ReviewState,
} from "./actions";

function Feedback({ state }: { state: ReviewState }) {
  if (state.error)
    return (
      <span role="alert" className="text-xs text-danger">
        {state.error}
      </span>
    );
  if (state.ok) return <span className="text-xs text-success">{state.ok}</span>;
  return null;
}

export function ReviewControls({ releaseId, flagged }: { releaseId: string; flagged: boolean }) {
  const [pubState, pubAction, pubPending] = useActionState(publishReleaseAction, {});
  const [rejState, rejAction, rejPending] = useActionState(rejectReleaseAction, {});
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={pubAction}>
        <input type="hidden" name="releaseId" value={releaseId} />
        <button
          type="submit"
          disabled={pubPending || flagged}
          title={flagged ? "Blocked: flagged by malware scan" : undefined}
          className="h-9 rounded-control bg-ink px-4 text-xs font-medium text-surface-raised transition-colors hover:bg-ink-hover disabled:opacity-50"
        >
          {pubPending ? "…" : "Sign & publish"}
        </button>
      </form>
      <form action={rejAction}>
        <input type="hidden" name="releaseId" value={releaseId} />
        <button
          type="submit"
          disabled={rejPending}
          className="h-9 rounded-control border border-danger/40 px-4 text-xs font-medium text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
        >
          Reject
        </button>
      </form>
      <Feedback state={pubState} />
      <Feedback state={rejState} />
    </div>
  );
}

export function RevokeControl({ releaseId }: { releaseId: string }) {
  const [state, action, pending] = useActionState(revokeReleaseAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="releaseId" value={releaseId} />
      <input
        name="reason"
        placeholder="Public revocation reason"
        required
        className="h-9 w-56 rounded-control border border-border-subtle bg-surface-raised px-3 text-xs placeholder:text-text-muted focus:border-ink focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-control border border-danger/40 px-4 text-xs font-medium text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
      >
        {pending ? "…" : "Revoke"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

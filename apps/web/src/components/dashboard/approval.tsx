"use client";

import { useEffect, useRef } from "react";

/*
 * The approval affordances for the Executive Workspace.
 *
 * These are PRESENTATION. Nothing here decides anything: an operation reaches
 * this dialog only because a server action already refused it, and refusing it
 * again in the browser would add no security. What they add is a sentence that
 * tells the truth — the work is understood and is waiting on the one person who
 * can authorise it — instead of a dead end.
 *
 * The wording deliberately avoids "restricted", "limited" and "read only".
 * Those describe the person. "Approval required" describes the operation.
 */

export function ExecutiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ws-line bg-ws-lilac/50 px-3 py-1 text-[11px] font-semibold tracking-[0.01em] text-ws-ink">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <path d="M12 3l7 4v5c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V7l7-4z" />
      </svg>
      {label}
    </span>
  );
}

/**
 * The banner a leadership surface wears when the reader may review it but not
 * change it. One line, stated once at the top, so individual controls do not
 * each have to apologise for themselves.
 */
export function ReviewNotice({
  surface,
  detail,
}: {
  surface: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-card border border-ws-line bg-surface-overlay/40 px-5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ws-lilac text-ws-ink">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 3l7 4v5c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V7l7-4z" />
          <path d="M9.5 12l1.8 1.8L15 10" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold tracking-[-0.01em]">
          {surface} · Executive review
        </span>
        <span className="mt-0.5 block text-sm leading-relaxed text-text-secondary">
          {detail ??
            "You can open and review everything here. Applying changes to production requires Founder authorization."}
        </span>
      </span>
    </div>
  );
}

/**
 * The dialog shown when a workflow completes and stops at authorisation.
 *
 * `<dialog>` rather than a hand-rolled overlay: it gets focus trapping, Escape,
 * and inertness of the page behind it from the platform, which is a great deal
 * of accessibility work not to have to write or maintain.
 */
export function ApprovalDialog({
  open,
  title,
  body,
  simulated,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  simulated?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      /* `m-auto` is load-bearing: the page CSS reset zeroes margins, which strips
         the auto margins a modal <dialog> relies on to centre itself, so it
         rendered pinned to the top-left corner. */
      className="approval-dialog m-auto w-[min(440px,calc(100vw-2rem))] rounded-[22px] border border-ws-line bg-surface-raised p-0 text-text-primary backdrop:bg-black/45"
      aria-labelledby="approval-title"
    >
      <div className="p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ws-lilac text-ws-ink">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 3l7 4v5c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V7l7-4z" />
          </svg>
        </span>

        <h2
          id="approval-title"
          className="mt-4 font-display text-[22px] font-semibold tracking-[-0.02em]"
        >
          {title}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{body}</p>

        {simulated && (
          <p className="mt-4 rounded-card border border-success/30 bg-success/[0.06] px-4 py-3 text-sm leading-relaxed text-text-secondary">
            <span className="font-medium text-success">Simulation completed successfully.</span>{" "}
            {simulated}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover"
          >
            Understood
          </button>
        </div>
      </div>
    </dialog>
  );
}

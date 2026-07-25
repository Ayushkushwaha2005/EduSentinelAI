"use client";

import { useActionState } from "react";
import {
  submitCollaborationAction,
  submitAbuseReportAction,
  type SubmitState,
} from "./actions";

const inputClass =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] placeholder:text-text-muted focus:border-ink focus:outline-none";
const areaClass =
  "w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 py-2.5 text-[15px] placeholder:text-text-muted focus:border-ink focus:outline-none";
const buttonClass =
  "h-12 rounded-control bg-ink px-6 text-[15px] font-medium text-surface-raised transition-colors hover:bg-ink-hover disabled:opacity-60";

/** Honeypot + signed timing token — bot defense, no third-party CAPTCHA. */
function BotFields({ token }: { token: string }) {
  return (
    <>
      <input type="hidden" name="formToken" value={token} />
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
    </>
  );
}

export function CollaborationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitCollaborationAction,
    {},
  );

  if (state.ok) {
    return (
      <div className="rounded-card border border-border-subtle bg-surface-raised p-8">
        <h2 className="text-xl font-semibold tracking-tight">Request received</h2>
        <p className="mt-3 leading-relaxed text-text-secondary">
          Thank you — a person reads every submission. We&apos;ll reply to the
          address you gave us.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-4">
      <BotFields token={token} />
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" placeholder="Your name" required className={inputClass} />
        <input name="email" type="email" placeholder="Email address" required className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="org" placeholder="Organization (optional)" className={inputClass} />
        {/*
         * a11y: this select had no accessible name — axe-core reports it as a
         * CRITICAL `select-name` violation. A screen reader announced only
         * "combo box, Partnership", with no indication of what is being chosen.
         * The visible design has no label here, so the name is provided
         * off-screen rather than by changing the layout.
         */}
        <label htmlFor="collab-kind" className="sr-only">
          Type of collaboration
        </label>
        <select
          id="collab-kind"
          name="kind"
          required
          defaultValue="partnership"
          className={inputClass}
        >
          <option value="partnership">Partnership</option>
          <option value="contributor">Contributor</option>
          <option value="research">Research</option>
          <option value="other">Other</option>
        </select>
      </div>
      <textarea
        name="message"
        rows={6}
        required
        minLength={20}
        placeholder="What would you like to build with us?"
        className={areaClass}
      />
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}

export function AbuseReportForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitAbuseReportAction,
    {},
  );

  if (state.ok) {
    return (
      <p className="text-[15px] text-success">
        Report received. Thank you — we review every report.
      </p>
    );
  }

  return (
    <form action={action} className="relative space-y-3">
      <BotFields token={token} />
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Same critical `select-name` violation as the collaboration form above. */}
        <label htmlFor="abuse-target-type" className="sr-only">
          What are you reporting?
        </label>
        <select
          id="abuse-target-type"
          name="targetType"
          required
          defaultValue="other"
          className={inputClass}
        >
          <option value="collaboration">A collaboration request</option>
          <option value="release">A published release</option>
          <option value="other">Something else</option>
        </select>
        <input name="targetRef" placeholder="Link or reference (optional)" className={inputClass} />
      </div>
      <textarea
        name="reason"
        rows={4}
        required
        minLength={10}
        placeholder="What's the problem? Include anything that helps us act quickly."
        className={areaClass}
      />
      <input name="reporter" placeholder="Your contact (optional)" className={inputClass} />
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-control border border-border-subtle px-5 text-sm font-medium transition-colors hover:bg-surface-overlay disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit report"}
      </button>
    </form>
  );
}

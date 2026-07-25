"use client";

import { useActionState } from "react";
import {
  submitContactAction,
  submitSecurityReportAction,
  type SubmitState,
} from "./actions";

/*
 * The contact and responsible-disclosure forms (Phase 10, Task 11).
 *
 * Styled to match the collaboration forms exactly — same control classes, same
 * bot-defense fields, same success/error shape — because they are the same kind
 * of thing and a visitor should not be able to tell which one was built later.
 */

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

function Sent({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    // role="status": the form is replaced in place, so a screen reader needs to
    // be told that something happened.
    <div
      role="status"
      className="rounded-card border border-border-subtle bg-surface-raised p-8"
    >
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">{children}</p>
    </div>
  );
}

export function ContactForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitContactAction,
    {},
  );

  if (state.ok) {
    return (
      <Sent title="Message sent">
        Thank you — a person reads every message. We&apos;ll reply to the address
        you gave us.
      </Sent>
    );
  }

  return (
    <form action={action} className="relative space-y-4">
      <BotFields token={token} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="sr-only">
            Your name
          </label>
          <input
            id="contact-name"
            name="name"
            placeholder="Your name"
            autoComplete="name"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="sr-only">
            Email address
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            placeholder="Email address"
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-org" className="sr-only">
            Organisation (optional)
          </label>
          <input
            id="contact-org"
            name="org"
            placeholder="Organisation (optional)"
            autoComplete="organization"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className="sr-only">
            Subject
          </label>
          <input
            id="contact-subject"
            name="subject"
            placeholder="Subject"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="sr-only">
          Your message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          required
          minLength={20}
          placeholder="How can we help?"
          className={areaClass}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass}>
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

export function SecurityReportForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitSecurityReportAction,
    {},
  );

  if (state.ok) {
    return (
      <Sent title="Report received">
        Thank you for disclosing this responsibly. The 90-day coordinated window
        starts now. If you gave us an address, we&apos;ll acknowledge the report
        and keep you updated on the fix.
      </Sent>
    );
  }

  return (
    <form action={action} className="relative space-y-4">
      <BotFields token={token} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sec-reporter" className="sr-only">
            Your name (optional)
          </label>
          <input
            id="sec-reporter"
            name="reporter"
            placeholder="Your name (optional)"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sec-email" className="sr-only">
            Email for follow-up (optional)
          </label>
          <input
            id="sec-email"
            name="email"
            type="email"
            placeholder="Email for follow-up (optional)"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sec-affected" className="sr-only">
            Affected product, page or endpoint
          </label>
          <input
            id="sec-affected"
            name="affected"
            placeholder="Affected product, page or endpoint"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sec-severity" className="sr-only">
            Severity
          </label>
          <select
            id="sec-severity"
            name="severity"
            required
            defaultValue="unsure"
            className={inputClass}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unsure">Not sure</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="sec-message" className="sr-only">
          Steps to reproduce and impact
        </label>
        <textarea
          id="sec-message"
          name="message"
          rows={8}
          required
          minLength={40}
          placeholder="Steps to reproduce, expected vs actual behaviour, and the impact. Please do not include live credentials or third-party data."
          className={areaClass}
        />
      </div>

      <p className="text-sm text-text-secondary">
        Reporting anonymously is fine — the name and email fields are optional.
        Without an address we cannot acknowledge the report or tell you when it
        is fixed.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass}>
        {pending ? "Sending…" : "Submit report"}
      </button>
    </form>
  );
}

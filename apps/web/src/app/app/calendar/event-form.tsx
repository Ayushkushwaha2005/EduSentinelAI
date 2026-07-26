"use client";

import { useActionState, useState } from "react";
import {
  EVENT_KINDS,
  KIND_LABELS,
  VISIBILITY_LABELS,
  type Visibility,
} from "@/lib/calendar-types";
import { createEvent, type EventState } from "./event-actions";

/*
 * Event creation.
 *
 * The visibility choices offered here are narrowed to what this person can
 * actually do — but that narrowing is a courtesy, not a control: createEvent
 * re-derives the same answer from the session before it writes anything.
 */

const input =
  "h-10 w-full rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-brand-cyan";
const label = "block text-sm font-medium text-text-secondary";
const primary =
  "h-10 rounded-control bg-ink px-4 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";

export function EventForm({
  teams,
  canCompany,
}: {
  teams: { id: string; name: string }[];
  canCompany: boolean;
}) {
  const [state, action, pending] = useActionState<EventState, FormData>(createEvent, {});
  const [visibility, setVisibility] = useState<Visibility>("PERSONAL");

  const options: Visibility[] = [
    "PERSONAL",
    ...(teams.length > 0 ? (["TEAM"] as Visibility[]) : []),
    ...(canCompany ? (["COMPANY"] as Visibility[]) : []),
  ];

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={label} htmlFor="ev-title">
          Title
        </label>
        <input
          id="ev-title"
          name="title"
          required
          maxLength={140}
          placeholder="Sprint review"
          className={`mt-2 ${input}`}
        />
      </div>

      <div>
        <label className={label} htmlFor="ev-kind">
          Type
        </label>
        <select id="ev-kind" name="kind" defaultValue="MEETING" className={`mt-2 ${input}`}>
          {EVENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="ev-visibility">
          Who sees it
        </label>
        <select
          id="ev-visibility"
          name="visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
          className={`mt-2 ${input}`}
        >
          {options.map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      {visibility === "TEAM" && (
        <div className="sm:col-span-2">
          <label className={label} htmlFor="ev-team">
            Team
          </label>
          <select id="ev-team" name="teamId" required className={`mt-2 ${input}`}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={label} htmlFor="ev-start">
          Starts
        </label>
        <input
          id="ev-start"
          name="startsAt"
          type="datetime-local"
          required
          className={`mt-2 ${input}`}
        />
      </div>

      <div>
        <label className={label} htmlFor="ev-end">
          Ends <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <input
          id="ev-end"
          name="endsAt"
          type="datetime-local"
          className={`mt-2 ${input}`}
        />
      </div>

      <div>
        <label className={label} htmlFor="ev-location">
          Location <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <input
          id="ev-location"
          name="location"
          maxLength={160}
          className={`mt-2 ${input}`}
        />
      </div>

      <div className="flex items-end">
        <label className="flex h-10 items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            name="allDay"
            className="h-4 w-4 rounded border-border-subtle accent-brand-cyan"
          />
          All day
        </label>
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="ev-detail">
          Notes <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <textarea
          id="ev-detail"
          name="detail"
          rows={3}
          maxLength={2000}
          className="mt-2 w-full rounded-control border border-border-subtle bg-surface-raised px-3 py-2 text-sm outline-none focus:border-brand-cyan"
        />
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Adding…" : "Add event"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="text-sm text-success">
            Added to the calendar.
          </p>
        )}
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import {
  addMemberAction,
  createProjectAction,
  createTeamAction,
  type TeamState,
} from "./actions";

const EMPTY: TeamState = {};

const field =
  "h-10 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none transition-colors duration-[--duration-fast] focus:border-brand-cyan";
const submit =
  "h-10 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";

function Note({ state }: { state: TeamState }) {
  if (!state.error && !state.ok) return null;
  return (
    <p
      role="status"
      className={`text-sm ${state.error ? "text-danger" : "text-success"}`}
    >
      {state.error ?? state.ok}
    </p>
  );
}

/*
 * Team management panel — only rendered for viewers holding `team.manage`.
 * The server actions re-check that capability, so hiding this is convenience.
 */
export function TeamManager({
  teams,
  staff,
}: {
  teams: { id: string; name: string }[];
  staff: { id: string; name: string; role: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [teamState, teamAction, teamPending] = useActionState(createTeamAction, EMPTY);
  const [projState, projAction, projPending] = useActionState(createProjectAction, EMPTY);
  const [memState, memAction, memPending] = useActionState(addMemberAction, EMPTY);

  return (
    <section id="new" className="rounded-card bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Manage teams</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Create teams, add staff and track project progress.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="h-10 rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
        >
          {open ? "Close" : "Open"}
        </button>
      </div>

      {open && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form action={teamAction} className="flex flex-col gap-3">
            <h3 className="text-[15px] font-semibold">New team</h3>
            <label className="sr-only" htmlFor="team-name">
              Team name
            </label>
            <input id="team-name" name="name" placeholder="Team name" required className={field} />
            <label className="sr-only" htmlFor="team-desc">
              Description
            </label>
            <input
              id="team-desc"
              name="description"
              placeholder="Description (optional)"
              className={field}
            />
            <button type="submit" disabled={teamPending} className={submit}>
              {teamPending ? "Creating…" : "Create team"}
            </button>
            <Note state={teamState} />
          </form>

          <form action={memAction} className="flex flex-col gap-3">
            <h3 className="text-[15px] font-semibold">Add member</h3>
            <label className="sr-only" htmlFor="mem-team">
              Team
            </label>
            <select id="mem-team" name="teamId" required className={field}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="mem-user">
              Staff member
            </label>
            <select id="mem-user" name="userId" required className={field}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input name="title" placeholder="Title, e.g. Security Engineer" className={field} />
            <button type="submit" disabled={memPending} className={submit}>
              {memPending ? "Adding…" : "Add member"}
            </button>
            <Note state={memState} />
          </form>

          <form action={projAction} className="flex flex-col gap-3">
            <h3 className="text-[15px] font-semibold">New project</h3>
            <label className="sr-only" htmlFor="proj-team">
              Team
            </label>
            <select id="proj-team" name="teamId" required className={field}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input name="name" placeholder="Project name" required className={field} />
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              Progress
              <input
                name="progress"
                type="number"
                min={0}
                max={100}
                defaultValue={0}
                className={`${field} w-24`}
              />
              %
            </label>
            <button type="submit" disabled={projPending} className={submit}>
              {projPending ? "Adding…" : "Add project"}
            </button>
            <Note state={projState} />
          </form>
        </div>
      )}
    </section>
  );
}

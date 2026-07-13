"use client";

import { useActionState, useState } from "react";
import { createTaskAction, setTaskStatusAction, type TaskState } from "./actions";

const EMPTY: TaskState = {};

const field =
  "h-10 rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none transition-colors duration-[--duration-fast] focus:border-brand-cyan";

/** Create + assign work. Rendered only for `team.manage`; re-checked server-side. */
export function TaskCreator({
  projects,
  staff,
}: {
  projects: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createTaskAction, EMPTY);

  return (
    <section className="rounded-card bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Assign work</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Create a task and assign it to a staff member.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="h-10 rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
        >
          {open ? "Close" : "New task"}
        </button>
      </div>

      {open && (
        <form action={action} className="mt-6 grid gap-3 md:grid-cols-5">
          <label className="sr-only" htmlFor="task-title">
            Task title
          </label>
          <input
            id="task-title"
            name="title"
            placeholder="Task title"
            required
            className={`${field} md:col-span-2`}
          />

          <label className="sr-only" htmlFor="task-project">
            Project
          </label>
          <select id="task-project" name="projectId" className={field} defaultValue="">
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="task-assignee">
            Assignee
          </label>
          <select id="task-assignee" name="assigneeId" className={field} defaultValue="">
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="task-priority">
            Priority
          </label>
          <select id="task-priority" name="priority" className={field} defaultValue="NORMAL">
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-text-secondary md:col-span-2">
            Due
            <input type="date" name="dueAt" className={`${field} flex-1`} />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create task"}
          </button>

          {(state.error || state.ok) && (
            <p
              role="status"
              className={`text-sm md:col-span-5 ${state.error ? "text-danger" : "text-success"}`}
            >
              {state.error ?? state.ok}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

/** Status control. Shown only where the viewer may actually move the task. */
export function StatusControl({
  taskId,
  status,
}: {
  taskId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(setTaskStatusAction, EMPTY);
  const next =
    status === "OPEN" ? "IN_PROGRESS" : status === "IN_PROGRESS" ? "DONE" : "OPEN";
  const label =
    status === "OPEN" ? "Start" : status === "IN_PROGRESS" ? "Complete" : "Reopen";

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        disabled={pending}
        className="h-8 rounded-control border border-border-subtle px-3 text-xs font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay disabled:opacity-60"
      >
        {pending ? "…" : label}
      </button>
      {state.error && (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

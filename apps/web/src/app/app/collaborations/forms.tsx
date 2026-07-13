"use client";

import { useActionState, useState } from "react";
import { Avatar } from "@/components/dashboard/avatar";
import {
  removeCollaboration,
  saveCollaboration,
  type CollabState,
} from "./actions";
import {
  COLLAB_KINDS,
  COLLAB_STATUSES,
  type ResolvedCollaboration,
} from "@/lib/org-types";

const input =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] placeholder:text-text-muted focus:border-brand-cyan focus:outline-none";
const label = "block text-sm font-medium text-text-secondary";
const primary =
  "h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";
const ghost =
  "h-11 rounded-control border border-border-subtle px-5 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay";

export type CollaboratorOption = { id: string; name: string; email: string };

function Feedback({ state }: { state: CollabState }) {
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

export function CollaborationForm({
  collaboration,
  accounts,
  onDone,
}: {
  collaboration?: ResolvedCollaboration;
  accounts: CollaboratorOption[];
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<CollabState, FormData>(
    saveCollaboration,
    {},
  );
  const [linked, setLinked] = useState(collaboration?.userId ?? "");
  const key = collaboration?.id ?? "new";

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone?.();
      }}
      className="rounded-card border border-border-subtle p-5"
    >
      {collaboration && <input type="hidden" name="id" value={collaboration.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor={`c-user-${key}`}>
            Collaborator account
          </label>
          <select
            id={`c-user-${key}`}
            name="userId"
            value={linked}
            onChange={(e) => setLinked(e.target.value)}
            className={`mt-2 ${input}`}
          >
            <option value="">No account — external partner</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.email}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-text-muted">
            Linked collaborations take their name and email from the account, so the
            two pages can never disagree about who this is.
          </p>
        </div>

        {!linked && (
          <>
            <div>
              <label className={label} htmlFor={`c-name-${key}`}>
                Name
              </label>
              <input
                id={`c-name-${key}`}
                name="name"
                defaultValue={collaboration?.hasAccount ? "" : (collaboration?.name ?? "")}
                maxLength={80}
                className={`mt-2 ${input}`}
              />
            </div>
            <div>
              <label className={label} htmlFor={`c-email-${key}`}>
                Email
              </label>
              <input
                id={`c-email-${key}`}
                name="email"
                type="email"
                defaultValue={collaboration?.hasAccount ? "" : (collaboration?.email ?? "")}
                maxLength={120}
                className={`mt-2 ${input}`}
              />
            </div>
          </>
        )}

        <div>
          <label className={label} htmlFor={`c-org-${key}`}>
            Organization
          </label>
          <input
            id={`c-org-${key}`}
            name="org"
            defaultValue={collaboration?.org ?? ""}
            maxLength={80}
            className={`mt-2 ${input}`}
          />
        </div>
        <div>
          <label className={label} htmlFor={`c-kind-${key}`}>
            Type
          </label>
          <select
            id={`c-kind-${key}`}
            name="kind"
            defaultValue={collaboration?.kind ?? "partnership"}
            className={`mt-2 ${input}`}
          >
            {COLLAB_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`c-status-${key}`}>
            Status
          </label>
          <select
            id={`c-status-${key}`}
            name="status"
            defaultValue={collaboration?.status ?? "ACTIVE"}
            className={`mt-2 ${input}`}
          >
            {COLLAB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor={`c-summary-${key}`}>
            What are we doing together?
          </label>
          <textarea
            id={`c-summary-${key}`}
            name="summary"
            rows={3}
            maxLength={500}
            defaultValue={collaboration?.summary ?? ""}
            className="mt-2 w-full rounded-control border border-border-subtle bg-surface-raised p-3.5 text-[15px] leading-relaxed focus:border-brand-cyan focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : collaboration ? "Save changes" : "Create collaboration"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className={ghost}>
            Cancel
          </button>
        )}
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function CollaborationRow({
  collaboration,
  accounts,
}: {
  collaboration: ResolvedCollaboration;
  accounts: CollaboratorOption[];
}) {
  const [open, setOpen] = useState(false);

  const tone =
    collaboration.status === "ACTIVE"
      ? "bg-success/10 text-success"
      : collaboration.status === "PAUSED"
        ? "bg-warning/10 text-warning"
        : "bg-surface-overlay text-text-secondary";

  return (
    <li className="border-b border-border-subtle py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={collaboration.name} size={40} src={collaboration.photoUrl} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">{collaboration.name}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
              {collaboration.status}
            </span>
            <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
              {collaboration.kind}
            </span>
            {collaboration.hasAccount ? (
              <span className="rounded-full bg-brand-cyan/10 px-2.5 py-0.5 text-xs font-semibold text-brand-cyan">
                account linked
              </span>
            ) : (
              <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs text-text-muted">
                no account
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-sm text-text-muted">
            {[collaboration.org, collaboration.email].filter(Boolean).join(" · ") || "—"}
          </span>
        </span>

        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm font-medium text-brand-cyan hover:text-brand-teal"
          >
            {open ? "Close" : "Edit"}
          </button>
          <form action={removeCollaboration}>
            <input type="hidden" name="id" value={collaboration.id} />
            <button type="submit" className="text-sm font-medium text-danger hover:opacity-80">
              Remove
            </button>
          </form>
        </span>
      </div>

      {collaboration.summary && !open && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">
          {collaboration.summary}
        </p>
      )}

      {open && (
        <div className="mt-4">
          <CollaborationForm
            collaboration={collaboration}
            accounts={accounts}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </li>
  );
}

export function AddCollaboration({ accounts }: { accounts: CollaboratorOption[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={primary}>
        New collaboration
      </button>
    );
  }
  return <CollaborationForm accounts={accounts} onDone={() => setOpen(false)} />;
}

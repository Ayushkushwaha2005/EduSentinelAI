"use client";

import { useActionState } from "react";
import { changeRoleAction } from "./actions";

/** Role controls per user row. FOUNDER rows render no controls at all. */
export function RoleSelect({
  userId,
  currentRole,
  options,
}: {
  userId: string;
  currentRole: string;
  options: string[];
}) {
  const [state, formAction, pending] = useActionState(changeRoleAction, {});
  if (currentRole === "FOUNDER" || options.length === 0) {
    return <span className="text-xs text-text-muted">—</span>;
  }
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="h-8 rounded-control border border-border-subtle bg-surface-raised px-2 text-xs"
      >
        {options.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="h-8 rounded-control bg-surface-overlay px-3 text-xs font-medium transition-colors hover:bg-border-subtle disabled:opacity-60"
      >
        {pending ? "…" : "Apply"}
      </button>
      {state.error && (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

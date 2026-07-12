"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "../actions";
import { AuthShell, inputClass } from "../auth-form";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, {});
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="This signs you out everywhere for your safety"
    >
      <form action={formAction} className="mt-9 space-y-4">
        <input type="hidden" name="token" value={token} />
        <input
          name="password"
          type="password"
          placeholder="New password (min. 10 characters)"
          autoComplete="new-password"
          required
          minLength={10}
          className={inputClass}
        />
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-control bg-ink text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover disabled:opacity-60"
        >
          {pending ? "Please wait…" : "Set new password"}
        </button>
      </form>
    </AuthShell>
  );
}

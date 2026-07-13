"use client";

import { useActionState } from "react";
import { acceptInvitation } from "./actions";
import { AuthShell, inputClass } from "../auth-form";

export function AcceptForm({
  token,
  email,
  roleLabel,
  company,
  inviter,
}: {
  token: string;
  email: string;
  roleLabel: string;
  company: string;
  inviter: string;
}) {
  const [state, formAction, pending] = useActionState(acceptInvitation, {});

  return (
    <AuthShell
      title={`Join ${company}`}
      subtitle={`${inviter} invited you as ${roleLabel}`}
    >
      <form action={formAction} className="mt-9 space-y-4">
        <input type="hidden" name="token" value={token} />

        {/* Shown, not editable. The address comes from the invitation — accepting
            someone else's invitation by typing your own email is not a thing that
            can happen, because nothing on the server reads this field. */}
        <p className="rounded-control border border-border-subtle bg-surface-overlay/50 px-3.5 py-3 text-[15px] text-text-secondary">
          {email}
        </p>

        <input
          name="name"
          placeholder="Your name"
          autoComplete="name"
          required
          minLength={2}
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          placeholder="Choose a password (min. 10 characters)"
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
          className="h-12 w-full rounded-control bg-ink text-[15px] font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60"
        >
          {pending ? "Creating your account…" : "Accept invitation"}
        </button>

        <p className="pt-2 text-center text-sm text-text-muted">
          This link works once. If your role holds privileged access, you will be
          asked to set up two-factor authentication as soon as you sign in.
        </p>
      </form>
    </AuthShell>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "../actions";
import { AuthShell, inputClass } from "../auth-form";

export function RequestResetForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, {});
  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a single-use reset link"
    >
      <form action={formAction} className="mt-9 space-y-4">
        <input
          name="email"
          type="email"
          placeholder="Email address"
          autoComplete="email"
          required
          className={inputClass}
        />
        {state.notice && <p className="text-sm text-text-secondary">{state.notice}</p>}
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
          {pending ? "Please wait…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-text-secondary">
        <Link href="/login" className="font-medium text-text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { EASE } from "@/components/motion";
import type { FormState } from "./actions";

export const inputClass =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none";

/* Show WHOSE code we're expecting without printing the whole address — a light
 * confirmation for the person, not a disclosure. Local part keeps its first two
 * characters; the rest becomes asterisks. */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const shown = local.slice(0, 2);
  return `${shown}${"*".repeat(Math.max(local.length - 2, 1))}${domain}`;
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="w-full max-w-sm"
    >
      <div className="flex flex-col items-center text-center">
        <LogoMark size={64} />
        <h1 className="mt-6 text-3xl font-medium tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-[15px] text-text-secondary">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

export function AuthForm({
  mode,
  action,
  next,
  reset,
  formToken,
}: {
  mode: "login" | "signup";
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  next?: string;
  reset?: boolean;
  formToken?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const isLogin = mode === "login";

  // Email & password are controlled so their values persist when the login flow
  // advances to the second (2FA) step — where they ride along as hidden inputs so
  // the SAME server action re-runs unchanged — and are still there if the visitor
  // steps back. Pure UX state: no bearing on the authentication logic.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // The 2FA step is a distinct screen, not "another login". It appears once the
  // server reports MFA is required; "Back" returns to the credentials screen
  // without discarding what was typed. Every new submission clears "Back" (see
  // the form action wrapper) so a fresh challenge — including a rejected code,
  // which re-requests one — always lands on the code screen.
  const [wentBack, setWentBack] = useState(false);
  const onMfaStep = isLogin && !!state.mfaRequired && !wentBack;

  const submit = (data: FormData) => {
    setWentBack(false);
    formAction(data);
  };

  const title = onMfaStep
    ? "Two-Factor Authentication"
    : isLogin
      ? "Welcome back"
      : "Create your account";
  const subtitle = onMfaStep
    ? "Enter the 6-digit code from your authenticator app."
    : isLogin
      ? "Sign in to your EduSentinel AI account"
      : "One identity for the whole EduSentinel ecosystem";

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <form action={submit} className="relative mt-9 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        {onMfaStep ? (
          <>
            {/* The credentials are carried, invisibly, so the unchanged action
                receives email + password + code together. */}
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="password" value={password} />
            {email && (
              <p className="text-center text-sm text-text-muted">
                Verifying <span className="text-text-secondary">{maskEmail(email)}</span>
              </p>
            )}
            {/* A stable key forces a FRESH node so the field never inherits the
                email input's value across the credentials → 2FA switch, and
                autoFocus lands the cursor in an empty box. */}
            <input
              key="mfa-otp"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit authentication code"
              required
              defaultValue=""
              className={`${inputClass} text-center tracking-[0.4em]`}
              autoFocus
            />
          </>
        ) : (
          <>
            {/* bot defense: honeypot + signed timing token (signup only) */}
            {!isLogin && formToken && (
              <>
                <input type="hidden" name="formToken" value={formToken} />
                <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="website">Leave this field empty</label>
                  <input id="website" name="website" tabIndex={-1} autoComplete="off" />
                </div>
              </>
            )}
            {!isLogin && (
              <input name="name" placeholder="Full name" autoComplete="name" required className={inputClass} />
            )}
            <input
              name="email"
              type="email"
              placeholder="Email address"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <input
              name="password"
              type="password"
              placeholder={isLogin ? "Password" : "Password (min. 10 characters)"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={isLogin ? 1 : 10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </>
        )}

        {reset && !state.error && !state.notice && (
          <p className="text-sm text-success">Password updated — sign in with your new password.</p>
        )}
        {/* On the 2FA step the subtitle already carries the instruction, so the
            echoed notice is suppressed to avoid saying it twice. */}
        {state.notice && !onMfaStep && (
          <p className="text-sm text-text-secondary">{state.notice}</p>
        )}
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
          {pending
            ? "Please wait…"
            : onMfaStep
              ? "Verify"
              : isLogin
                ? "Sign in"
                : "Create account"}
        </button>
      </form>

      {onMfaStep ? (
        <p className="mt-7 text-center text-sm">
          <button
            type="button"
            onClick={() => setWentBack(true)}
            className="inline-flex items-center gap-1.5 font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <span aria-hidden="true">←</span> Back
          </button>
        </p>
      ) : (
        <p className="mt-7 text-center text-sm text-text-secondary">
          {isLogin ? (
            <>
              New to EduSentinel?{" "}
              <Link href="/signup" className="font-medium text-text-primary hover:underline">
                Create an account
              </Link>
              <span className="mx-2 text-text-muted">·</span>
              <Link href="/forgot-password" className="font-medium text-text-primary hover:underline">
                Forgot password?
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-text-primary hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      )}
    </AuthShell>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { EASE } from "@/components/motion";
import type { FormState } from "./actions";

export const inputClass =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none";

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

  return (
    <AuthShell
      title={isLogin ? "Welcome back" : "Create your account"}
      subtitle={
        isLogin
          ? "Sign in to your EduSentinel AI account"
          : "One identity for the whole EduSentinel ecosystem"
      }
    >
      <form action={formAction} className="relative mt-9 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
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
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          placeholder={isLogin ? "Password" : "Password (min. 10 characters)"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={isLogin ? 1 : 10}
          className={inputClass}
        />
        {isLogin && state.mfaRequired && (
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit authenticator code"
            required
            className={inputClass}
            autoFocus
          />
        )}
        {reset && !state.error && !state.notice && (
          <p className="text-sm text-success">Password updated — sign in with your new password.</p>
        )}
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
          {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

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
    </AuthShell>
  );
}

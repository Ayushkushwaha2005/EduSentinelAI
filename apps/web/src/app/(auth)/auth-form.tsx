"use client";

import { useActionState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { EASE } from "@/components/motion";
import type { FormState } from "./actions";

const inputClass =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none";

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "login" | "signup";
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const reduce = useReducedMotion();
  const isLogin = mode === "login";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="w-full max-w-sm"
    >
      <div className="flex flex-col items-center text-center">
        <LogoMark size={64} />
        <h1 className="mt-6 text-3xl font-medium tracking-[-0.02em]">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-[15px] text-text-secondary">
          {isLogin
            ? "Sign in to your EduSentinel AI account"
            : "One identity for the whole EduSentinel ecosystem"}
        </p>
      </div>

      <form action={formAction} className="mt-9 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {!isLogin && (
          <input
            name="name"
            placeholder="Full name"
            autoComplete="name"
            required
            className={inputClass}
          />
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
    </motion.div>
  );
}

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { LogoIntro } from "@/components/logo-animated";
import { EASE } from "@/components/motion";
import {
  BottomGradient,
  BoxReveal,
  Label,
  Ripple,
  SpotlightInput,
  TechOrbitDisplay,
  type OrbitIcon,
} from "@/components/ui/animated-sign-in";
import { OrbitGlyph, type OrbitGlyphName } from "@/components/ui/orbit-glyphs";
import type { FormState } from "./actions";

/*
 * Sign-in (Phase 10, Task 1).
 *
 * ⚠ THE AUTHENTICATION FLOW IN THIS FILE IS UNCHANGED. This was a presentation
 * pass: the reference animation (animation.txt) was wrapped AROUND the existing
 * server-action flow, not substituted for it. Specifically, all of the following
 * are byte-for-byte the behaviour that shipped before:
 *
 *   - `useActionState(action)` against the same loginAction/signupAction;
 *   - the two-step MFA screen, entered when the server reports `mfaRequired`;
 *   - carrying email + password as hidden inputs into the second step so the
 *     SAME action re-runs with all three values;
 *   - `wentBack`, and the rule that any new submission clears it;
 *   - the signup honeypot + signed timing token;
 *   - every error and notice string.
 *
 * The reference's own `AnimatedForm` was deliberately not used: it validates and
 * submits client-side and ships a Google button. There is no Google provider
 * here, and client-side validation in front of a server action is decoration —
 * the server is the only thing that decides.
 */

export const inputClass =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none";

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

/*
 * The orbit constellation.
 *
 * The reference orbits framework logos loaded from cdn.jsdelivr.net and
 * iconfinder. Both would be BLOCKED here — the CSP is `img-src 'self' blob:
 * data:` (src/middleware.ts) — and a third-party image request on the sign-in
 * page is a tracker on the sign-in page, which this platform does not ship
 * (check:trackers). So the orbit carries locally-drawn glyphs for what
 * EduSentinel actually does: shield, lock, key, fingerprint, scan, audit trail,
 * signed artifact, neural core.
 */
type OrbitSeed = {
  glyph: OrbitGlyphName;
  radius: number;
  duration: number;
  delay: number;
  size: number;
  reverse?: boolean;
};

/* Four rings. Two glyphs per ring on the inner orbits, three on the third, and
   the pairs are offset by half a period so the constellation never bunches. */
const ORBIT_SEEDS: OrbitSeed[] = [
  { glyph: "shield", radius: 110, duration: 26, delay: 0, size: 30 },
  { glyph: "lock", radius: 110, duration: 26, delay: 13, size: 30 },
  { glyph: "key", radius: 168, duration: 32, delay: 0, size: 34, reverse: true },
  { glyph: "fingerprint", radius: 168, duration: 32, delay: 16, size: 34, reverse: true },
  { glyph: "scan", radius: 228, duration: 40, delay: 0, size: 32 },
  { glyph: "audit", radius: 228, duration: 40, delay: 13, size: 32 },
  { glyph: "signature", radius: 228, duration: 40, delay: 26, size: 32 },
  { glyph: "core", radius: 292, duration: 48, delay: 0, size: 36, reverse: true },
  { glyph: "network", radius: 292, duration: 48, delay: 24, size: 36, reverse: true },
];

const ORBIT: OrbitIcon[] = ORBIT_SEEDS.map(({ glyph, size, ...rest }) => ({
  ...rest,
  // `path: false` — the reference draws a faint guide circle per orbit. With four
  // rings and nine glyphs that reads as a target, not a constellation.
  path: false,
  className: "border-none bg-transparent",
  component: () => <OrbitGlyph name={glyph} size={size} />,
}));

/* A small inline spinner for the pending state — see the Task 9 note below. */
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The simple, centred auth shell — used by forgot-password, reset-password,
 * verify-email and accept-invite. Unchanged in structure; it now reveals its
 * heading with the reference's BoxReveal instead of a plain fade.
 */
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
        <LogoMark size={64} priority />
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
  const [showPassword, setShowPassword] = useState(false);

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

  /*
   * TASK 9 — the "Please wait…" that felt broken.
   *
   * Nothing about verification got faster here and nothing about it got weaker;
   * the delay was never mostly in the check. Submitting runs the server action,
   * which signs in and then REDIRECTS into /app — and /app is a full workspace
   * render (layout queries + dashboard queries) against a serverless Postgres.
   * Through all of that, `pending` stays true and the old UI showed one static,
   * unexplained string on a dead button.
   *
   * Two fixes, both purely presentational:
   *   - the label now names the actual stage, so the wait is legible rather than
   *     mysterious, and there is a spinner so the page is visibly alive;
   *   - the destination now streams (see src/app/app/loading.tsx), so the
   *     workspace shell paints immediately instead of after every query lands.
   */
  const pendingLabel = onMfaStep
    ? "Verifying code…"
    : isLogin
      ? "Signing you in…"
      : "Creating your account…";

  const idleLabel = onMfaStep ? "Verify" : isLogin ? "Sign in" : "Create account";

  return (
    <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-4">
      {/* ---------------- Left: the brand orbit (lg and up) ----------------
          Hidden below lg exactly as the reference does — on a phone the form is
          the whole job, and a 600px decorative canvas above it is not. */}
      {/*
       * The outermost ring has a 292px radius — a 584px circle. At the `lg`
       * breakpoint this column is only about 470px wide, so at full size the
       * constellation is cropped on every side. Scaling the whole stage keeps the
       * composition intact and the rings complete; at `xl` there is room for it
       * at full size. The brand lockup rides inside the same transform, so it
       * stays centred in the rings at both scales.
       */}
      <div className="relative hidden h-[560px] items-center justify-center lg:flex">
        <div className="absolute inset-0 flex items-center justify-center scale-[0.72] xl:scale-100">
          <Ripple mainCircleSize={120} />
          <TechOrbitDisplay iconsArray={ORBIT}>
            <div className="pointer-events-none z-10 flex flex-col items-center text-center">
              {/*
               * Task 1: "Animated Login" was the reference's placeholder heading.
               * It is replaced by the official mark and wordmark — and the mark
               * plays the Task 2 intro (particles -> assemble -> glow -> sweep ->
               * settle) as the page arrives.
               */}
              <LogoIntro size={104} />
              <span className="mt-5 font-display text-[44px] font-extrabold leading-none tracking-[-0.03em] text-text-primary">
                EduSentinel <span className="text-brand-teal">AI</span>
              </span>
              <span className="mt-3 max-w-[19rem] text-[15px] leading-relaxed text-text-secondary">
                One identity for the whole privacy-first ecosystem.
              </span>
            </div>
          </TechOrbitDisplay>
        </div>
      </div>

      {/* ---------------- Right: the form ---------------- */}
      <div className="mx-auto flex w-full max-w-sm flex-col">
        <div className="flex flex-col items-center text-center lg:hidden">
          <LogoMark size={56} priority />
        </div>

        <BoxReveal duration={0.4}>
          <h1 className="mt-6 text-3xl font-medium tracking-[-0.02em] lg:mt-0">
            {title}
          </h1>
        </BoxReveal>
        <BoxReveal duration={0.4} className="pb-2">
          <p className="mt-2 text-[15px] text-text-secondary">{subtitle}</p>
        </BoxReveal>

        <form action={submit} className="relative mt-7 space-y-4">
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
              <BoxReveal width="100%" duration={0.35}>
                <Label htmlFor="mfa-code">Authentication code</Label>
                {/* A stable key forces a FRESH node so the field never inherits the
                    email input's value across the credentials → 2FA switch, and
                    autoFocus lands the cursor in an empty box. */}
                <SpotlightInput
                  key="mfa-otp"
                  id="mfa-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit authentication code"
                  required
                  defaultValue=""
                  className="mt-2 text-center tracking-[0.4em]"
                  autoFocus
                />
              </BoxReveal>
            </>
          ) : (
            <>
              {/* bot defense: honeypot + signed timing token (signup only) */}
              {!isLogin && formToken && (
                <>
                  <input type="hidden" name="formToken" value={formToken} />
                  <div
                    aria-hidden="true"
                    className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
                  >
                    <label htmlFor="website">Leave this field empty</label>
                    <input id="website" name="website" tabIndex={-1} autoComplete="off" />
                  </div>
                </>
              )}

              {!isLogin && (
                <BoxReveal width="100%" duration={0.35}>
                  <Label htmlFor="name">Full name</Label>
                  <SpotlightInput
                    id="name"
                    name="name"
                    placeholder="Full name"
                    autoComplete="name"
                    required
                    className="mt-2"
                  />
                </BoxReveal>
              )}

              <BoxReveal width="100%" duration={0.35}>
                <Label htmlFor="email">Email address</Label>
                <SpotlightInput
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                />
              </BoxReveal>

              <BoxReveal width="100%" duration={0.35}>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-2">
                  <SpotlightInput
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Password" : "Password (min. 10 characters)"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                    minLength={isLogin ? 1 : 10}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center rounded-control px-3.5 text-text-muted transition-colors hover:text-text-secondary"
                  >
                    <EyeIcon off={!showPassword} />
                  </button>
                </div>
              </BoxReveal>
            </>
          )}

          {reset && !state.error && !state.notice && (
            <p className="text-sm text-success">
              Password updated — sign in with your new password.
            </p>
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

          <BoxReveal width="100%" duration={0.35} overflow="visible">
            <button
              type="submit"
              disabled={pending}
              // aria-busy tells a screen reader the control is working, which is
              // the half of the Task 9 fix that is not visual.
              aria-busy={pending}
              className="group/btn relative flex h-11 w-full items-center justify-center gap-2 rounded-control bg-ink text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover disabled:opacity-70"
            >
              {pending && <Spinner />}
              {pending ? pendingLabel : idleLabel}
              {!pending && <span aria-hidden="true">→</span>}
              <BottomGradient />
            </button>
          </BoxReveal>
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
                <Link
                  href="/forgot-password"
                  className="font-medium text-text-primary hover:underline"
                >
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
      </div>
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      {off && (
        <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

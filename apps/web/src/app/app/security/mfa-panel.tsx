"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
/* eslint-disable @next/next/no-img-element -- QR code is a generated data URL */
import {
  startMfaSetup,
  confirmMfa,
  disableMfa,
  type MfaSetup,
  type MfaState,
} from "./actions";

const inputClass =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] placeholder:text-text-muted focus:border-ink focus:outline-none";
const buttonClass =
  "h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover disabled:opacity-60";

export function MfaPanel({
  mfaEnabled,
  mandatory,
  returnTo = "/app",
}: {
  mfaEnabled: boolean;
  mandatory: boolean;
  /** Where the viewer was headed when the MFA gate stopped them. */
  returnTo?: string;
}) {
  const router = useRouter();
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();
  const [confirmState, confirmAction, confirming] = useActionState<MfaState, FormData>(
    confirmMfa,
    {},
  );
  const [disableState, disableAction, disabling] = useActionState<MfaState, FormData>(
    disableMfa,
    {},
  );

  // Enrolling changes what this account may reach, so re-render the server
  // components (sidebar, guards) instead of leaving a stale shell on screen.
  useEffect(() => {
    if (confirmState.done) router.refresh();
  }, [confirmState.done, router]);

  /*
   * Open the QR immediately when MFA is required but not yet enrolled.
   *
   * MFA is mandatory for privileged roles, so hiding the setup behind a "Set up"
   * button meant a Founder could be bounced here and still not obviously be told
   * to scan anything. startMfaSetup() reuses a pending secret, so this is safe to
   * run on every mount — it will not invalidate a QR already scanned.
   */
  const needsEnrolment = !mfaEnabled && mandatory;
  const requested = useRef(false);

  const beginSetup = () => {
    setSetupError(null);
    requested.current = true;
    startTransition(async () => {
      const res = await startMfaSetup();
      if (res.setup) setSetup(res.setup);
      else if (res.error) setSetupError(res.error);
    });
  };

  useEffect(() => {
    if (!needsEnrolment || setup || requested.current) return;
    beginSetup();
  }, [needsEnrolment, setup]);

  if (mfaEnabled && !disableState.done) {
    return (
      <div>
        <p className="text-[15px] text-success">
          Two-factor authentication is enabled.
        </p>
        {mandatory ? (
          <p className="mt-2 text-sm text-text-muted">
            MFA is mandatory for administrator accounts and cannot be disabled.
          </p>
        ) : (
          <form action={disableAction} className="mt-4 flex max-w-sm gap-3">
            <input
              name="code"
              inputMode="numeric"
              placeholder="6-digit code"
              required
              className={inputClass}
            />
            <button type="submit" disabled={disabling} className={buttonClass}>
              Disable
            </button>
          </form>
        )}
        {disableState.error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {disableState.error}
          </p>
        )}
      </div>
    );
  }

  if (confirmState.done) {
    return (
      <div>
        <p className="text-[15px] text-success">
          Two-factor authentication is now enabled. You&apos;ll be asked for a code
          at every sign-in — and every privileged surface is now open to you.
        </p>
        <Link
          href={returnTo}
          className={`mt-4 inline-flex items-center ${buttonClass}`}
        >
          Continue to {returnTo}
        </Link>
      </div>
    );
  }

  if (!setup) {
    // Mandatory-MFA accounts get the QR opened for them (effect above); show the
    // in-flight state rather than a button they would have to discover — unless
    // starting failed, in which case show why and offer a retry (never a blank).
    if (needsEnrolment) {
      if (setupError) {
        return (
          <div>
            <p role="alert" className="text-[15px] text-danger">
              {setupError}
            </p>
            <button
              type="button"
              disabled={starting}
              onClick={beginSetup}
              className={`mt-4 ${buttonClass}`}
            >
              {starting ? "Retrying…" : "Try again"}
            </button>
          </div>
        );
      }
      return (
        <p className="text-[15px] text-text-secondary">
          Preparing your authenticator setup…
        </p>
      );
    }

    return (
      <div>
        <p className="max-w-lg text-[15px] leading-relaxed text-text-secondary">
          Protect your account with a 6-digit code from an authenticator app
          (Google Authenticator, 1Password, Aegis…).
        </p>
        <button
          type="button"
          disabled={starting}
          onClick={beginSetup}
          className={`mt-4 ${buttonClass}`}
        >
          {starting ? "Generating…" : "Set up two-factor authentication"}
        </button>
        {setupError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {setupError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <ol className="list-decimal space-y-2 pl-5 text-[15px] text-text-secondary">
        <li>Scan this QR code with your authenticator app.</li>
        <li>Enter the 6-digit code it shows to confirm.</li>
      </ol>
      <div className="mt-5 flex flex-wrap items-start gap-6">
        <img
          src={setup.qrDataUrl}
          alt="TOTP QR code for authenticator apps"
          width={220}
          height={220}
          className="rounded-lg border border-border-subtle bg-white p-2"
        />
        <div className="text-sm text-text-secondary">
          <p className="font-medium text-text-primary">Can&apos;t scan?</p>
          <p className="mt-1">Enter this key manually:</p>
          <code className="mt-2 block max-w-[16rem] break-all rounded-control bg-surface-overlay px-3 py-2 font-mono text-[13px]">
            {setup.manualKey}
          </code>
        </div>
      </div>
      <form action={confirmAction} className="mt-6 flex max-w-sm gap-3">
        <input
          name="code"
          inputMode="numeric"
          placeholder="6-digit code"
          required
          className={inputClass}
        />
        <button type="submit" disabled={confirming} className={buttonClass}>
          Confirm
        </button>
      </form>
      {confirmState.error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {confirmState.error}
        </p>
      )}
    </div>
  );
}

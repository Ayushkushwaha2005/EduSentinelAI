"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
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
    return (
      <div>
        <p className="max-w-lg text-[15px] leading-relaxed text-text-secondary">
          Protect your account with a 6-digit code from an authenticator app
          (Google Authenticator, 1Password, Aegis…).
          {mandatory && (
            <span className="mt-2 block font-medium text-warning">
              MFA is mandatory for your role — set it up now to keep admin access.
            </span>
          )}
        </p>
        <button
          type="button"
          disabled={starting}
          onClick={() =>
            startTransition(async () => {
              const res = await startMfaSetup();
              if (res.setup) setSetup(res.setup);
            })
          }
          className={`mt-4 ${buttonClass}`}
        >
          {starting ? "Generating…" : "Set up two-factor authentication"}
        </button>
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

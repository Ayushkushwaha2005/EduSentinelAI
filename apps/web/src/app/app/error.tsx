"use client";

import { useEffect } from "react";

/*
 * Error boundary for the whole authenticated workspace.
 *
 * Without one, an error thrown while rendering any /app page unmounts the React
 * tree to a BLANK page (and, with client retries, a request flood). This catches
 * it and shows a recoverable message instead — the MFA enrolment page in
 * particular must never be able to strand a privileged account on a white screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the Vercel runtime logs so the real cause is diagnosable.
    console.error("[/app] render error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 py-16">
      <h1 className="text-xl font-semibold tracking-[-0.01em]">
        Something went wrong
      </h1>
      <p className="text-[15px] leading-relaxed text-text-secondary">
        This page hit an unexpected error. Try again — if it keeps happening, sign
        out and back in, or contact support.
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover"
      >
        Try again
      </button>
    </div>
  );
}

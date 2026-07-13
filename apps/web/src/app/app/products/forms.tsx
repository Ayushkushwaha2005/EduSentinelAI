"use client";

import { useActionState } from "react";
import { uploadReleaseAction, type PublishState } from "./actions";

const inputClass =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] placeholder:text-text-muted focus:border-ink focus:outline-none";
const buttonClass =
  "h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover disabled:opacity-60";

function Feedback({ state }: { state: PublishState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.ok) return <p className="text-sm text-success">{state.ok}</p>;
  return null;
}

export function UploadReleaseForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(uploadReleaseAction, {});
  return (
    <form action={action} className="mt-4 space-y-3 border-t border-border-subtle pt-4">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex gap-3">
        <input name="version" placeholder="Version (1.0.0)" required className={inputClass} />
        <input
          name="file"
          type="file"
          required
          className="w-full text-sm text-text-secondary file:mr-3 file:h-11 file:rounded-control file:border-0 file:bg-surface-overlay file:px-4 file:text-sm file:font-medium"
        />
      </div>
      <input name="notes" placeholder="Release notes (optional)" className={inputClass} />
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Uploading…" : "Upload to quarantine"}
      </button>
    </form>
  );
}

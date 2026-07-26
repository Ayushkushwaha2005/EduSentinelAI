"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { askAssistant, type AssistantReply } from "@/app/app/sentinel-action";

/*
 * Sentinel Mini — the portal assistant, in the top bar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS A RELOCATION, NOT A NEW ASSISTANT.
 *
 * It calls `askAssistant` — the same server action the guide page used, with the
 * same signature and the same guarantees: the server re-derives who is asking,
 * the capability filter runs before ranking, and nothing here touches a
 * database. Retrieval, permissions and the backend are untouched; what changed
 * is where the question is typed.
 *
 * It still sends the CURRENT PATH, so "how does this work" asked while standing
 * on the leave page finds the leave article. The path is a ranking hint only and
 * is never trusted for access.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Dark mode comes for free: every surface below is a `ws-` or semantic token,
 * and those are already redefined under [data-theme="dark"] (globals.css). There
 * is not one `dark:` variant in this file, and there must not be.
 */

export function SentinelMini() {
  const pathname = usePathname();

  /*
   * Open state is the PATH IT WAS OPENED ON, not a boolean.
   *
   * Navigating away has to close it — an answer about the page you just left is
   * worse than no answer. Doing that with an effect means setState inside an
   * effect and a cascading render; deriving it means the popup simply is not
   * open any more the moment the path changes, with no effect at all.
   */
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const close = () => setOpenPath(null);

  const [reply, action, pending] = useActionState<AssistantReply | null, FormData>(
    askAssistant,
    null,
  );

  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Escape closes and returns focus to the trigger — a popup you can only leave
     with the mouse is a trap for anyone using a keyboard. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpenPath(open ? null : pathname)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Sentinel Mini — ask how the portal works"
        title="Sentinel Mini"
        className={`group flex h-[46px] items-center gap-2 rounded-full border border-ws-line px-4 text-[15px] font-medium text-ws-ink transition-all duration-[--duration-fast] hover:border-ws-ink sm:px-5 ${
          open ? "border-ws-ink bg-ws-mint" : "bg-white"
        }`}
      >
        <SparkIcon />
        <span className="hidden lg:inline">Sentinel Mini</span>
      </button>

      {/*
       * The popup.
       *
       * Anchored to the trigger from `lg` up; below that it is a sheet pinned
       * across the bar, because a 400px right-anchored popover needs 400px of
       * room to its left and does not have it on a narrow screen.
       *
       * The breakpoint is `lg`, not `sm`. Measured at 768px: the top bar's
       * search field and support pill compress the trigger leftwards, so a
       * right-anchored 400px panel resolved to x = -91…309 — ninety pixels off
       * the left edge of the viewport. `lg` is the first width where the bar has
       * settled and there is genuinely space for it.
       */}
      <div
        id={panelId}
        role="dialog"
        aria-label="Sentinel Mini"
        aria-modal="false"
        hidden={!open}
        className={`sentinel-pop fixed left-2 right-2 top-[76px] z-50 origin-top lg:absolute lg:left-auto lg:right-0 lg:top-[calc(100%+10px)] lg:w-[400px] ${
          open ? "sentinel-pop-open" : ""
        }`}
      >
        {/* `sentinel-surface` opts this one surface out of dark mode's glass
            translucency — see globals.css. A popover you can read the page
            through is not a popover. */}
        <div className="sentinel-surface flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-[22px] border border-ws-line bg-surface-raised shadow-ws-pop">
          {/* header */}
          <div className="flex items-center gap-3 border-b border-ws-line px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ws-mint text-ws-ink">
              <SparkIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold tracking-[-0.01em] text-text-primary">
                Sentinel Mini
              </span>
              <span className="block text-[11px] text-text-muted">
                Answers from the Portal Guide
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                close();
                triggerRef.current?.focus();
              }}
              aria-label="Close Sentinel Mini"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* answers */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
            {!reply && (
              <p className="text-[14px] leading-relaxed text-text-secondary">
                Ask how something works and it answers from the guide, filtered to
                what your account can actually do. It explains the portal — it has
                no access to company data and cannot report on it.
              </p>
            )}

            {reply?.empty && (
              <p className="text-[14px] leading-relaxed text-text-secondary">
                Nothing in the guide covers that. If it is about your own account
                or work, a{" "}
                <Link href="/app/support" prefetch className="font-medium text-brand-cyan hover:text-brand-teal">
                  support request
                </Link>{" "}
                reaches the people who can help.
              </p>
            )}

            {reply && !reply.empty && (
              <ul className="flex flex-col gap-3">
                {reply.answers.map((a, i) => (
                  <li
                    key={i}
                    className="rounded-[14px] border border-border-subtle bg-surface-overlay/50 p-3.5"
                  >
                    <p className="text-[14px] font-semibold tracking-[-0.01em] text-text-primary">
                      {a.title}
                    </p>
                    {a.passages.slice(0, 2).map((p, j) => (
                      <p key={j} className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">
                        {p}
                      </p>
                    ))}
                    {a.links.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {a.links.map((l) => (
                          <Link
                            key={l.href + l.label}
                            href={l.href}
                            prefetch
                            className="inline-flex h-7 items-center rounded-full border border-border-subtle px-2.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ask */}
          <form action={action} className="border-t border-ws-line p-3">
            <input type="hidden" name="pathname" value={pathname} />
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`${panelId}-q`}>
                Your question
              </label>
              <input
                ref={inputRef}
                id={`${panelId}-q`}
                name="question"
                maxLength={300}
                autoComplete="off"
                placeholder="How do I request leave?"
                className="h-10 min-w-0 flex-1 rounded-full border border-border-subtle bg-surface-raised px-4 text-[14px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-cyan"
              />
              <button
                type="submit"
                disabled={pending}
                aria-busy={pending}
                aria-label="Ask Sentinel Mini"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ws-ink text-white transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
              >
                {pending ? (
                  <span className="sentinel-spin block h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h13m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-2 px-1 text-[10.5px] text-text-muted">
              Filtered to your permissions ·{" "}
              <Link href="/app/guide" prefetch className="underline underline-offset-2 hover:text-text-secondary">
                open the full guide
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l1.9 5.3L19 10.2l-5.1 1.9L12 17.4l-1.9-5.3L5 10.2l5.1-1.9L12 3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" fill="currentColor" />
    </svg>
  );
}

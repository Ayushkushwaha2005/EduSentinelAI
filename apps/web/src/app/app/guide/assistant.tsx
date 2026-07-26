"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/dashboard/widgets";
import { askAssistant, type AssistantReply } from "./assistant-action";

/*
 * The Portal Assistant.
 *
 * Sends the question and the CURRENT PATH — so "how does this work" asked while
 * standing on the leave page finds the leave article without the person having
 * to name the feature. The server re-derives who is asking; the path is only a
 * ranking hint and is never trusted for access.
 *
 * Works without JavaScript: it is a form posting to a server action, and the
 * answer renders server-side.
 */
export function PortalAssistant() {
  const pathname = usePathname();
  const [reply, action, pending] = useActionState<AssistantReply | null, FormData>(
    askAssistant,
    null,
  );

  return (
    <Panel>
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
        Ask the portal
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Ask how something works and it answers from this guide, filtered to what
        your account can actually do. It has no access to company data — it
        explains the portal, it does not report on it.
      </p>

      <form action={action} className="mt-5 flex flex-wrap gap-2">
        <input type="hidden" name="pathname" value={pathname} />
        <label className="sr-only" htmlFor="assistant-q">
          Your question
        </label>
        <input
          id="assistant-q"
          name="question"
          maxLength={300}
          placeholder="How do I request leave? Who can publish a release?"
          className="h-11 min-w-0 flex-1 rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] outline-none transition-colors placeholder:text-text-muted focus:border-brand-cyan"
        />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-11 shrink-0 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover disabled:opacity-60"
        >
          {pending ? "Looking…" : "Ask"}
        </button>
      </form>

      {reply && (
        <div className="mt-5" aria-live="polite">
          {reply.empty ? (
            <p className="text-[15px] leading-relaxed text-text-secondary">
              Nothing in the guide covers that. If it is about your own account or
              work, a{" "}
              <Link href="/app/support" prefetch className="text-brand-cyan hover:text-brand-teal">
                support request
              </Link>{" "}
              reaches the people who can help. This assistant only knows how the
              portal works.
            </p>
          ) : (
            <>
              {reply.question && (
                <p className="mb-4 text-sm text-text-muted">
                  Answering: <span className="text-text-secondary">{reply.question}</span>
                </p>
              )}
              <ul className="flex flex-col gap-4">
                {reply.answers.map((a, i) => (
                  <li key={i} className="rounded-card border border-border-subtle p-4">
                    <p className="text-[15px] font-semibold tracking-[-0.01em]">{a.title}</p>
                    {a.passages.map((p, j) => (
                      <p key={j} className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                        {p}
                      </p>
                    ))}
                    {a.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {a.links.map((l) => (
                          <Link
                            key={l.href + l.label}
                            href={l.href}
                            prefetch
                            className="inline-flex h-8 items-center rounded-full border border-border-subtle px-3 text-xs font-medium transition-colors hover:bg-surface-overlay"
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

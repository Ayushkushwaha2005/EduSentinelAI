"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  sendMessageAction,
  startConversationAction,
  type MessageState,
} from "./actions";
import { ROLE_LABELS, type Role } from "@/lib/roles";

const EMPTY: MessageState = {};

export function Composer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(sendMessageAction, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex items-center gap-3 border-t border-border-subtle p-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <label className="sr-only" htmlFor="body">
        Write your message
      </label>
      <input
        id="body"
        name="body"
        autoComplete="off"
        placeholder="Write your message ..."
        className="h-11 min-w-0 flex-1 rounded-full border border-border-subtle bg-surface-raised px-5 text-[15px] outline-none transition-colors duration-[--duration-fast] placeholder:text-text-muted focus:border-brand-cyan"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-11 shrink-0 rounded-full bg-brand-cyan px-4 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-brand-teal disabled:opacity-60 sm:px-6"
      >
        {pending ? "Sending…" : "Send"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function NewConversation({
  contacts,
}: {
  contacts: { id: string; name: string; role: string }[];
}) {
  const [state, action, pending] = useActionState(startConversationAction, EMPTY);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.conversationId) {
      router.push(`/app/messages?c=${state.conversationId}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-1 flex-col gap-4 p-6">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em]">New conversation</h2>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-secondary">To</span>
        <select
          name="userId"
          required
          className="h-11 rounded-control border border-border-subtle bg-surface-raised px-3 text-[15px] outline-none focus:border-brand-cyan"
        >
          {contacts.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {ROLE_LABELS[u.role as Role] ?? u.role}
            </option>
          ))}
        </select>
        {contacts.length === 0 && (
          <span className="text-sm text-text-muted">
            There is nobody you can start a conversation with yet.
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-secondary">Subject (optional)</span>
        <input
          name="subject"
          maxLength={120}
          className="h-11 rounded-control border border-border-subtle bg-surface-raised px-3 text-[15px] outline-none focus:border-brand-cyan"
        />
      </label>

      <label className="flex flex-1 flex-col gap-1.5">
        <span className="text-sm text-text-secondary">Message</span>
        <textarea
          name="body"
          required
          rows={6}
          className="flex-1 resize-none rounded-control border border-border-subtle bg-surface-raised p-3 text-[15px] leading-relaxed outline-none focus:border-brand-cyan"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || contacts.length === 0}
        className="h-11 self-start rounded-control bg-ink px-6 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

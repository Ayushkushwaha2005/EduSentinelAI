"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "./avatar";
import { ChatIcon } from "./icons";

export type PeekItem = {
  id: string;
  title: string;
  preview: string;
  time: string;
  unread: boolean;
};

/*
 * The message dropdown from reference screen 2: recent threads plus a
 * "View in message center" call to action. Read-only — every real action
 * happens on /app/messages, behind the participant check.
 */
export function MessagePeek({ items, unread }: { items: PeekItem[]; unread: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread ? `Messages, ${unread} unread` : "Messages"}
        className="relative text-text-secondary transition-colors duration-[--duration-fast] hover:text-text-primary"
      >
        <ChatIcon size={22} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand-cyan" />
        )}
      </button>

      {open && (
        <>
          {/* click-away */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-3 w-[340px] rounded-card bg-surface-raised p-5 shadow-lg ring-1 ring-border-subtle">
            <p className="text-[17px] font-semibold tracking-[-0.01em]">Message</p>

            <ul className="mt-4 flex flex-col">
              {items.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/app/messages?c=${m.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-0"
                  >
                    <Avatar name={m.title} size={38} online />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[15px] font-medium">{m.title}</span>
                        <span className="shrink-0 text-xs text-text-muted">{m.time}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-sm text-text-muted">
                          {m.preview || "No messages yet"}
                        </span>
                        {m.unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-cyan" />
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {items.length === 0 && (
                <li className="py-6 text-center text-sm text-text-muted">
                  No conversations yet.
                </li>
              )}
            </ul>

            <Link
              href="/app/messages"
              onClick={() => setOpen(false)}
              className="mt-4 flex h-11 items-center justify-center rounded-control bg-brand-cyan text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-brand-teal"
            >
              View in message center
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellIcon } from "./icons";

export type BellItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  unread: boolean;
  time: string;
};

/*
 * The notification bell (Phase 9).
 *
 * Phase 6.1 DELETED the reference's bell, because it was a <button> with no
 * handler wearing a permanently-lit unread dot — it announced notifications that
 * did not exist and could not be opened. It comes back now, and only now, because
 * it finally has something true to say: the count is real, the items are real
 * domain events, and every one of them goes somewhere.
 *
 * The dot appears only when `unread > 0`. That is the whole difference between a
 * control and a decoration.
 */
export function NotificationBell({
  items,
  unread,
}: {
  items: BellItem[];
  unread: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications, none unread"
        }
        className="relative flex text-text-secondary transition-colors duration-[--duration-fast] hover:text-text-primary"
      >
        <BellIcon size={22} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-cyan px-1 text-[10px] font-semibold text-surface-raised">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-[320px] rounded-card border border-border-subtle bg-surface-raised p-2 shadow-lg">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">
              Notifications
            </span>
            <Link
              href="/app/notifications"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-brand-cyan hover:text-brand-teal"
            >
              View all
            </Link>
          </div>

          {items.length === 0 ? (
            <p className="px-3 pb-4 pt-2 text-sm text-text-muted">
              Nothing yet. Notifications appear when something actually happens —
              a request waiting on you, a reply, a decision.
            </p>
          ) : (
            <ul className="flex max-h-[360px] flex-col overflow-y-auto">
              {items.map((n) => {
                const inner = (
                  <span className="block">
                    <span className="flex items-start gap-2">
                      {n.unread && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-cyan" />
                      )}
                      <span
                        className={`block flex-1 text-sm ${
                          n.unread ? "font-medium text-text-primary" : "text-text-secondary"
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="shrink-0 text-xs text-text-muted">{n.time}</span>
                    </span>
                    {n.body && (
                      <span className="mt-0.5 block truncate pl-3.5 text-xs text-text-muted">
                        {n.body}
                      </span>
                    )}
                  </span>
                );

                return (
                  <li key={n.id}>
                    {n.href ? (
                      // The link is a doorbell, not a door: the page behind it
                      // re-checks server-side (lib/guard.ts).
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-control px-3 py-2.5 transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <span className="block px-3 py-2.5">{inner}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

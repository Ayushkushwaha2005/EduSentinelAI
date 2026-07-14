"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoWordmark } from "@/components/logo";
import type { NavItem, NavIcon } from "./nav-config";
import {
  BoxIcon,
  CalendarIcon,
  ChatIcon,
  ClipboardIcon,
  GridIcon,
  KeyIcon,
  ReportIcon,
  ServerIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "./icons";

const ICONS: Record<NavIcon, (p: { size?: number }) => React.ReactElement> = {
  grid: GridIcon,
  user: UserIcon,
  users: UsersIcon,
  box: BoxIcon,
  server: ServerIcon,
  clipboard: ClipboardIcon,
  report: ReportIcon,
  shield: ShieldIcon,
  key: KeyIcon,
  chat: ChatIcon,
  calendar: CalendarIcon,
};

/*
 * Mobile navigation. The sidebar is desktop-only, so without this the whole
 * workspace is unreachable on a phone. Same items, same capability filtering —
 * the list is built server-side by navFor() and passed in, so a link the viewer
 * cannot use never reaches the client.
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Never leave the page scroll-locked behind a drawer that is gone.
  // (The drawer closes on link click, not in an effect on `pathname` — that
  // would set state during render and cascade.)
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-control border border-border-subtle text-text-secondary transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <nav
            aria-label="Workspace"
            className="relative flex h-full w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-surface-raised p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <Link href="/app" aria-label="EduSentinel AI">
                <LogoWordmark />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-control text-text-muted hover:bg-surface-overlay"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <p className="mt-8 text-sm font-medium text-text-secondary">Main</p>

            <ul className="mt-2 flex flex-col gap-0.5">
              {items.map((item) => {
                const Icon = ICONS[item.icon];
                const active =
                  item.href === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-[15px] font-medium transition-colors duration-[--duration-fast] ${
                        active
                          ? "bg-surface-overlay text-brand-cyan"
                          : "text-text-secondary hover:bg-surface-overlay/60 hover:text-text-primary"
                      }`}
                    >
                      <Icon size={19} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}

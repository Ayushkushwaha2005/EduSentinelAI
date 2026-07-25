"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoWordmark } from "@/components/logo";
import { Avatar } from "@/components/dashboard/avatar";
import { ThemeToggle } from "@/components/theme";
import { useDemo } from "@/lib/demo/store";
import { DEMO_VIEWER } from "@/lib/demo/data";
import {
  BellIcon,
  BoxIcon,
  ClipboardIcon,
  GridIcon,
  KeyIcon,
  ReportIcon,
  ServerIcon,
  UserIcon,
} from "@/components/dashboard/icons";

/*
 * DEMO FOUNDER MODE — the shell (Task 16).
 *
 * SEPARATE ON PURPOSE. This does not reuse components/dashboard/sidebar.tsx or
 * topbar.tsx, even though it looks like them, because those are production
 * components that read a real viewer, real capabilities, real presence and real
 * unread counts. Reaching into them from the demo would create exactly the
 * coupling this feature is supposed to avoid — and would mean a change made for
 * the demo could alter the Founder's actual workspace.
 *
 * What IS reused is the purely presentational layer: Panel, StatCard, Avatar,
 * the icon set. Those take props and nothing else — they cannot read or write
 * anything — so sharing them buys visual fidelity at zero risk. That distinction
 * (share presentation, never share data access) is the rule this whole feature
 * is built on.
 */

const DEMO_NAV = [
  { label: "Overview", href: "/demo", icon: GridIcon },
  { label: "People", href: "/demo/people", icon: UserIcon },
  { label: "Products", href: "/demo/products", icon: BoxIcon },
  { label: "Releases", href: "/demo/releases", icon: ServerIcon },
  { label: "Invitations", href: "/demo/invitations", icon: KeyIcon },
  { label: "Analytics", href: "/demo/analytics", icon: ReportIcon },
  { label: "Reports", href: "/demo/reports", icon: ClipboardIcon },
  { label: "Notifications", href: "/demo/notifications", icon: BellIcon },
  { label: "Settings", href: "/demo/settings", icon: KeyIcon },
];

/* ------------------------------------------------------------- banner ---- */

/**
 * The Demo Mode banner. Sticky, on every page, unmissable, and it names the two
 * things a visitor most needs to know: nothing is real, and nothing is saved.
 */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-panel border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
    >
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 8v5m0 3h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <span>
          <strong className="font-semibold text-text-primary">Demo Mode</strong>
          <span className="text-text-secondary">
            {" "}— every figure, person and product below is invented. Nothing you
            do here is saved, and nothing touches real data.
          </span>
        </span>
      </span>

      <Link
        href="/login"
        className="shrink-0 font-medium text-text-primary underline underline-offset-4 hover:no-underline"
      >
        Sign in to the real workspace →
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------- toasts ---- */

/** Feedback for simulated actions. Auto-dismisses so it never stacks up. */
export function DemoToasts() {
  const { toasts, dispatch } = useDemo();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => dispatch({ type: "dismissToast", id: t.id }), 4200),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,26rem)] flex-col gap-2.5"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-card border px-4 py-3 text-sm shadow-lg backdrop-blur ${
            t.kind === "blocked"
              ? "border-danger/30 bg-danger/10 text-text-primary"
              : "border-border-subtle bg-surface-raised text-text-primary"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- shell ---- */

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { notifications } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <div className="relative min-h-screen bg-surface-base p-3 md:p-4" data-accent="azure">
      <DemoBanner />

      <div className="relative z-10 mt-3 flex gap-4">
        {/* sidebar (desktop) */}
        {/* 264px + px-6, matching the production sidebar's proportions: at 248px
            the wordmark wrapped onto two lines. */}
        <aside className="hidden w-[264px] shrink-0 flex-col rounded-panel bg-surface-raised md:flex">
          <div className="px-6 pt-6">
            <Link href="/" aria-label="EduSentinel AI home">
              <LogoWordmark idle={false} />
            </Link>
            <p className="mt-3 inline-flex rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
              Demo sandbox
            </p>
          </div>

          <nav aria-label="Demo workspace" className="mt-7 flex flex-col gap-0.5 px-3 pb-6">
            {DEMO_NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/demo" ? pathname === "/demo" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* top bar */}
          <header className="flex h-[68px] items-center justify-between gap-2 rounded-panel bg-surface-raised px-3 sm:gap-4 sm:px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="Toggle demo navigation"
                className="flex h-10 w-10 items-center justify-center rounded-control border border-border-subtle text-text-secondary md:hidden"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
              <span className="text-[15px] font-medium text-text-secondary">
                Founder workspace{" "}
                <span className="text-text-muted">(simulated)</span>
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/demo/notifications"
                aria-label={`Notifications, ${unread} unread`}
                className="relative flex h-6 w-6 items-center justify-center text-text-secondary transition-colors hover:text-text-primary"
              >
                <BellIcon size={20} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-cyan px-1 text-[10px] font-semibold text-surface-raised">
                    {unread}
                  </span>
                )}
              </Link>
              <ThemeToggle />
              <span className="flex items-center gap-2.5 border-l border-border-subtle pl-2 sm:pl-3">
                <span className="hidden text-right leading-tight sm:block">
                  <span className="block text-[15px] font-semibold tracking-[-0.01em]">
                    {DEMO_VIEWER.name}
                  </span>
                  <span className="block text-xs text-text-muted">{DEMO_VIEWER.roleLabel}</span>
                </span>
                <Avatar name={DEMO_VIEWER.name} size={38} />
              </span>
            </div>
          </header>

          {/* mobile nav */}
          {menuOpen && (
            <nav
              aria-label="Demo workspace"
              className="flex flex-col gap-0.5 rounded-panel bg-surface-raised p-3 md:hidden"
            >
              {DEMO_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-control px-3 py-2.5 text-[15px] font-medium text-text-secondary hover:bg-surface-overlay/60 hover:text-text-primary"
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <main id="demo-content" tabIndex={-1} className="min-w-0">
            {children}
          </main>
        </div>
      </div>

      <DemoToasts />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";
import { LogoWordmark } from "./logo";
import { ThemeToggle } from "./theme";
import { EASE } from "./motion";

/*
 * Five links, in the order a visitor actually needs them: what we make, how to
 * get it, what it costs, who we are, how to reach us.
 *
 * Solutions, Documentation and Blog moved to the footer's Resources column.
 * They are not gone — nothing was deleted, and every route still exists and is
 * still crawlable from the footer of every page. They are reference material a
 * visitor goes looking for, and putting them beside the five decisions above
 * cost the whole bar its hierarchy: eight peers read as no priority at all.
 */
const links = [
  { href: "/products", label: "Products" },
  { href: "/downloads", label: "Downloads" },
  { href: "/pricing", label: "Pricing" },
  { href: "/company", label: "Company" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <motion.header
      className={`fixed inset-x-0 top-0 z-50 bg-surface-base/90 backdrop-blur-md transition-shadow ${
        scrolled ? "shadow-[0_1px_0_0_var(--color-border-subtle)]" : ""
      }`}
      initial={reduce ? false : { y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-20 max-w-[1360px] items-center px-6 md:px-10"
      >
        <Link href="/" aria-label="EduSentinel AI home" className="shrink-0">
          {/* Above the fold on every marketing page, so it is the one mark that
              asks for priority — and it carries the Task 2 idle. */}
          <LogoWordmark priority />
        </Link>

        {/*
         * Center links.
         *
         * BREAKPOINT: lg (1024px) — no longer xl (1280px), still not md (768px).
         *
         * It was xl because EIGHT links plus the wordmark plus a three-item
         * right cluster overflowed the container below 1280: "Solutions" ran
         * into the wordmark, "Contact" was clipped by the viewport edge, and the
         * theme toggle, Sign in and Get started were pushed entirely off-screen
         * — present in the DOM, unreachable by any pointer.
         *
         * Five links is roughly 440px of row; with the wordmark and the right
         * cluster that is ~930px, which fits inside 1024 and still does not fit
         * 768. So the desktop bar starts one breakpoint earlier and the
         * 1024–1280 range gets real navigation instead of a hamburger. gap-8,
         * up from gap-7 — the crowding that forced them together is gone.
         *
         * Nothing is lost at the widths still handed to the mobile menu: it
         * carries every link plus Sign in, the theme toggle and Get started.
         */}
        <div className="mx-auto hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-[16px] transition-colors ${
                pathname === l.href
                  ? "text-text-primary"
                  : "text-text-primary/75 hover:text-text-primary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-5 lg:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-[16px] text-text-primary/75 transition-colors hover:text-text-primary"
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center rounded-control bg-ink px-6 text-[15px] font-medium text-surface-raised transition-colors hover:bg-ink-hover"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="ml-auto p-2 lg:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="overflow-hidden border-t border-border-subtle bg-surface-base lg:hidden"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="flex flex-col p-4">
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.25, ease: EASE }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-control px-3 py-3 text-[15px] text-text-primary hover:bg-surface-overlay"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              {/* Sign in and the theme toggle live in the desktop-only cluster, so
                  the mobile menu carries them too — every navigation option and the
                  Light/Dark switch stays reachable on a phone. */}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-control px-3 py-3 text-[15px] text-text-primary hover:bg-surface-overlay"
              >
                Sign in
              </Link>
              <div className="mt-2 flex items-center justify-between px-3">
                <span className="text-[15px] text-text-secondary">Theme</span>
                <ThemeToggle />
              </div>
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="mt-3 flex h-11 items-center justify-center rounded-control bg-ink text-sm font-medium text-surface-raised"
              >
                Get started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

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
import { EASE } from "./motion";

const links = [
  { href: "/solutions", label: "Solutions" },
  { href: "/company", label: "Company" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50"
      initial={reduce ? false : { y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div
        className={`mx-auto flex h-16 max-w-6xl items-center justify-between rounded-2xl border px-5 transition-all duration-300 md:mt-4 md:px-6 ${
          scrolled || open
            ? "border-border-subtle bg-surface-base/75 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <Link href="/" aria-label="EduSentinel AI home" className="shrink-0">
          <LogoWordmark />
        </Link>

        <div
          className="hidden items-center gap-1 md:flex"
          onMouseLeave={() => setHovered(null)}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onMouseEnter={() => setHovered(l.href)}
              className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                pathname === l.href
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {hovered === l.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-surface-overlay"
                  transition={{ duration: 0.25, ease: EASE }}
                />
              )}
              <span className="relative">{l.label}</span>
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <Link
            href="/contact"
            className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-brand-cyan to-brand-teal px-5 text-sm font-semibold text-surface-base shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)] transition-shadow hover:shadow-[0_0_28px_-4px_rgba(34,211,238,0.7)]"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="p-2 md:hidden"
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
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mx-4 mt-2 overflow-hidden rounded-2xl border border-border-subtle bg-surface-base/95 backdrop-blur-xl md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="flex flex-col gap-1 p-4">
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.05, duration: 0.3, ease: EASE }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-4 py-3 text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.3, ease: EASE }}
              >
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="mt-2 block rounded-full bg-gradient-to-r from-brand-cyan to-brand-teal px-4 py-3 text-center font-semibold text-surface-base"
                >
                  Get Started
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

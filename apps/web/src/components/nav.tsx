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
  { href: "/products", label: "Products" },
  { href: "/downloads", label: "Downloads" },
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
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
          <LogoWordmark />
        </Link>

        {/* center links, reference-style */}
        <div className="mx-auto hidden items-center gap-10 md:flex">
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

        <div className="hidden shrink-0 items-center gap-7 md:flex">
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
          className="ml-auto p-2 md:hidden"
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
            className="overflow-hidden border-t border-border-subtle bg-surface-base md:hidden"
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

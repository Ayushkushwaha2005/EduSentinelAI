"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoWordmark } from "./logo";

const links = [
  { href: "/solutions", label: "Solutions" },
  { href: "/company", label: "Company" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-base/80 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
      >
        <Link href="/" aria-label="EduSentinel AI home">
          <LogoWordmark />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="rounded-control bg-gradient-to-r from-brand-cyan to-brand-teal px-4 py-2 text-sm font-semibold text-surface-base transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-border-subtle px-6 py-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-2 text-text-secondary"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="mt-2 block rounded-control bg-gradient-to-r from-brand-cyan to-brand-teal px-4 py-2 text-center text-sm font-semibold text-surface-base"
            onClick={() => setOpen(false)}
          >
            Get Started
          </Link>
        </div>
      )}
    </header>
  );
}

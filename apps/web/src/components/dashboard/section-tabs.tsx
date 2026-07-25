"use client";

import { useEffect, useRef, useState } from "react";

/*
 * The reference's pill tab row (Phase 10, Task 3).
 *
 * WHAT THEY ARE, AND WHY THEY ARE NOT FAKE. The reference shows a row of filter
 * chips — All · Activity · Protection · Update · Resources — with one of them
 * lit. Copying that as decoration would have meant shipping five buttons that do
 * nothing, and this codebase has an explicit rule against exactly that: "a
 * control that does nothing is deleted, not styled" (CLAUDE.md, Phase 6).
 *
 * So they are real. Each pill is an anchor to a panel that actually rendered on
 * this page, which means:
 *   - clicking one jumps to that section, with no JavaScript required;
 *   - the list is built from the panels the VIEWER can see, so a pill never
 *     points at something their capabilities did not render;
 *   - the lit pill is the section you are actually looking at, observed rather
 *     than hard-coded — an IntersectionObserver reports which panel currently
 *     owns the top of the viewport.
 *
 * The active state is the one piece that needs the client. Without JavaScript
 * the pills are still links and still work; they simply do not highlight.
 */

export type Section = { id: string; label: string };

export function SectionTabs({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<string | null>(null);
  // The observer callback fires for whichever panels crossed the line; we need to
  // pick the topmost currently-visible one, so keep a live map of what is on
  // screen rather than reacting to individual entries.
  const visible = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (sections.length === 0) return;

    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.current.add(entry.target.id);
          else visible.current.delete(entry.target.id);
        }
        // First in document order wins — that is the section the reader is in.
        const current = sections.find((s) => visible.current.has(s.id));
        setActive(current?.id ?? null);
      },
      {
        // A band across the upper middle of the viewport: a panel counts as "the
        // one you are reading" while its top third is in that band, which stops
        // the highlight flickering between two panels at a boundary.
        rootMargin: "-96px 0px -55% 0px",
        threshold: 0,
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null; // one section is not a tab row

  return (
    <nav aria-label="Dashboard sections" className="-mx-1 overflow-x-auto pb-1">
      <ul className="flex w-max items-center gap-2 px-1">
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-[--duration-fast] ${
                  isActive
                    ? "bg-ink text-surface-raised"
                    : "border border-border-subtle text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

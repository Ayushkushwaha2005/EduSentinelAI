"use client";

import { useRef } from "react";
import { Stagger, Item } from "./motion";

/*
 * Reference "Hear it from our users" pattern: heading row with square
 * prev/next controls, cards in a horizontal rail.
 */
export function CardRail({
  title,
  cards,
}: {
  title: string;
  cards: { tag: string; quote: string; name: string; role: string }[];
}) {
  const rail = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    rail.current?.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex items-end justify-between">
        <h2 className="max-w-3xl text-balance text-4xl font-medium leading-[1.06] tracking-[-0.03em] md:text-6xl">
          {title}
        </h2>
        <div className="hidden gap-2 md:flex">
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-label={d === -1 ? "Previous" : "Next"}
              onClick={() => scroll(d)}
              className="flex h-10 w-10 items-center justify-center rounded-control bg-surface-overlay text-text-primary transition-colors hover:bg-border-subtle"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d={d === -1 ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <Stagger className="mt-14">
        <div
          ref={rail}
          className="flex snap-x gap-5 overflow-x-auto pb-2 [scrollbar-width:none]"
        >
          {cards.map((c) => (
            <Item
              key={c.name + c.tag}
              className="flex w-[85vw] max-w-[420px] shrink-0 snap-start flex-col justify-between rounded-card border border-border-subtle bg-surface-overlay/50 p-8 md:min-h-[430px]"
            >
              <div>
                <span className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                  {c.tag}
                </span>
                <p className="mt-16 text-[17px] leading-relaxed text-text-primary md:mt-24">
                  “{c.quote}”
                </p>
              </div>
              <div className="mt-14 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-control bg-gradient-to-br from-brand-cyan to-brand-teal text-sm font-bold text-surface-raised"
                >
                  {c.name[0]}
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{c.name}</span>
                  <span className="block text-sm text-text-secondary">{c.role}</span>
                </span>
              </div>
            </Item>
          ))}
        </div>
      </Stagger>
    </div>
  );
}

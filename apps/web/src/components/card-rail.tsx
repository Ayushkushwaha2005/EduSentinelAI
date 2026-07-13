"use client";

import { useRef } from "react";
import { Stagger, Item } from "./motion";
import { TeamPhoto } from "./team-photo";

/*
 * Reference "Hear it from our users" pattern: heading row with square
 * prev/next controls, cards in a horizontal rail.
 *
 * Phase 6.5: the members come from the DATABASE (lib/org.ts), not from a constant
 * — the same records the Founder edits on /app/organization and the same ones the
 * company page renders. This component is deliberately given only what it needs
 * (a plain shape, already resolved and sanitized), so it cannot reach for a field
 * that would have to be kept in step somewhere else.
 */
export type RailMember = {
  id: string;
  name: string;
  designation: string;
  photoUrl: string | null;
  bio: string | null;
};

export function CardRail({
  title,
  members,
}: {
  title: string;
  members: RailMember[];
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
          {members.map((m) => (
            <Item
              key={m.id}
              className="flex w-[85vw] max-w-[400px] shrink-0 snap-start flex-col rounded-card border border-border-subtle bg-surface-overlay/50 p-7"
            >
              <div className="flex items-start gap-4">
                <TeamPhoto
                  name={m.name}
                  photo={m.photoUrl}
                  sizes="80px"
                  className="h-20 w-20 shrink-0 rounded-xl"
                />
                <div className="min-w-0">
                  <h3 className="text-[17px] font-semibold tracking-tight">
                    {m.name}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-brand-teal">
                    {m.designation}
                  </p>
                </div>
              </div>
              {m.bio && (
                <p className="mt-7 border-t border-border-subtle pt-6 text-[15px] leading-relaxed text-text-primary">
                  “{m.bio}”
                </p>
              )}
            </Item>
          ))}
        </div>
      </Stagger>
    </div>
  );
}

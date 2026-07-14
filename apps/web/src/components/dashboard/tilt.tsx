"use client";

import { useRef } from "react";

/*
 * Pointer tilt (Phase 9.4) — a fraction of a degree, and only where it belongs.
 *
 * `--tilt-max` is 0deg in light mode and under reduced motion (tokens.css and
 * globals.css), so this component compiles to nothing in both cases without a
 * single conditional here.
 *
 * WHERE IT DOES NOT GO: tables, lists, the audit log, anything you read rather
 * than glance at. Motion under text you are trying to parse is not premium, it is
 * an obstacle. It goes on the summary cards, which exist to be looked at.
 */
export function Tilt({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // −1..1 from the centre of the card.
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    // The sign is what makes it read as a physical object: the card leans TOWARD
    // the cursor, as if the pointer were pressing a corner of a pane of glass.
    el.style.setProperty("--tilt-y", `calc(var(--tilt-max) * ${(px * 2).toFixed(3)})`);
    el.style.setProperty("--tilt-x", `calc(var(--tilt-max) * ${(-py * 2).toFixed(3)})`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`tilt ${className}`}
    >
      {children}
    </div>
  );
}

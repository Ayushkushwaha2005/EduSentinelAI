"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

/*
 * The gate in front of the Sentinel engine console.
 *
 * Same three gates the Sentinel Agent uses (components/sentinel-agent.tsx),
 * for the same reasons:
 *
 *   1. `next/dynamic` with `ssr: false` — the console is its own chunk, so it
 *      is not in the products page's initial bundle and never renders on the
 *      server. It is an illustration; there is nothing in it to index.
 *
 *   2. An IntersectionObserver — the chunk is not requested until the panel is
 *      near the viewport.
 *
 *   3. Capability checks — not mounted under `prefers-reduced-motion` (it is
 *      six looping animations at once, which is exactly what that setting is
 *      asking us not to do), and not mounted below 1024px, where its fixed
 *      620px frame would be wider than the column.
 *
 * Every path that does not mount the console still explains the flow: the stage
 * list below is the content, and the animation is the flourish on it. `showConsole`
 * starts false, which is also what the server renders, so hydration has nothing
 * to reconcile.
 */

const SentinelPipeline = dynamic(() => import("./ui/ecosystem-pipeline"), {
  ssr: false,
  loading: () => <PipelineStages />,
});

const STAGES = [
  {
    step: "01",
    name: "Signal",
    detail: "A link, a message or a page you just opened.",
  },
  {
    step: "02",
    name: "Threat intel",
    detail: "Matched against known patterns before anything is trusted.",
  },
  {
    step: "03",
    name: "Sentinel engine",
    detail: "On-device models weigh the signal, in context.",
  },
  {
    step: "04",
    name: "Product action",
    detail: "The answer lands in the product you were already using.",
  },
];

/** The flow as plain content — shown wherever the console is not mounted. */
function PipelineStages() {
  return (
    <ol className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map((stage) => (
        <li
          key={stage.step}
          className="rounded-card border border-border-subtle bg-surface-raised p-5"
        >
          <span className="font-mono text-[12px] text-text-muted">{stage.step}</span>
          <p className="mt-2 text-[15px] font-medium">{stage.name}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            {stage.detail}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function EcosystemPipelinePanel() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [showConsole, setShowConsole] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 1024px. The console is now fluid (w-full, max 920px) rather than a fixed
    // 620px frame, so it can no longer overflow its column — but the schematic's
    // 9.5px node labels are set in a 580-unit viewBox, and below this width they
    // scale down past legibility. A diagram you cannot read is worse than the
    // stage list, so the gate stays exactly where it was.
    const roomy = window.matchMedia("(min-width: 1024px)").matches;

    if (reduce || !roomy) return; // the stage list stands

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowConsole(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      /*
       * The slot is reserved at the console's own height BEFORE the chunk
       * arrives, so mounting it swaps content without moving the page. The
       * reservation is `motion-safe` and `lg` — exactly the two conditions under
       * which the console can mount — so a reduced-motion or phone visitor gets
       * the stage list at its natural height and no empty space beneath it.
       *
       * 420px, up from 340: the console is 48% wider now, and its SVG is a
       * viewBox, so its height grew with it (920 × 172/580 ≈ 273px of diagram,
       * plus the header, message line and stats footer). `min-h` rather than a
       * fixed `h` — if a future edit makes the console a few pixels taller it
       * grows instead of clipping the stats row.
       */
      className="flex items-center justify-center motion-safe:lg:min-h-[420px]"
      /*
       * The console is decorative once the stages are described in text, and its
       * message line rewrites itself every 2.7s — which a screen reader would
       * announce, forever. The stage list is the accessible version, so only the
       * animated branch is hidden from the tree.
       */
      aria-hidden={showConsole || undefined}
    >
      {showConsole ? <SentinelPipeline /> : <PipelineStages />}
    </div>
  );
}

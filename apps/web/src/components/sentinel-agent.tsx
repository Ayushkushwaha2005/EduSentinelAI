"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LogoMark } from "./logo";

/*
 * The Sentinel Agent, gated (Phase 10, Task 4).
 *
 * TASK 4 ASKED FOR A 3D ROBOT. TASK 8 ASKED FOR INSTANT NAVIGATION. three.js +
 * @react-three/fiber + drei is roughly 600 KB gzipped — more than the rest of
 * this application put together — so the two briefs are only compatible if that
 * weight NEVER lands on anyone who is not looking at the agent. Three gates:
 *
 *   1. `next/dynamic` with `ssr: false`. The scene is its own chunk. Nothing in
 *      any initial bundle references three.js, and the server never renders it
 *      (WebGL has no meaning during SSR).
 *
 *   2. An IntersectionObserver. The chunk is not even requested until the
 *      section is close to the viewport. A visitor who reads the hero and leaves
 *      downloads exactly none of it.
 *
 *   3. Capability checks. Not mounted under `prefers-reduced-motion` — a floating,
 *      blinking, pointer-tracking character is precisely what that setting is
 *      asking us not to do — and not mounted on small screens, where a WebGL
 *      canvas is the difference between a warm phone and a cool one.
 *
 * Every path that does not mount the scene still renders the section: heading,
 * copy, capability list and the official mark. The agent is the flourish on that
 * content, never the content itself.
 */

const SentinelAgentScene = dynamic(() => import("./sentinel-agent-scene"), {
  ssr: false,
  loading: () => <SceneSkeleton />,
});

function SceneSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center"
    >
      <div className="h-28 w-28 rounded-full bg-gradient-to-b from-surface-overlay to-transparent opacity-60 blur-xl" />
    </div>
  );
}

/** The still frame shown wherever the scene is deliberately not mounted. */
function AgentStill() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-b from-surface-overlay/80 to-transparent">
        <LogoMark size={72} />
      </div>
    </div>
  );
}

export function SentinelAgent() {
  const ref = useRef<HTMLDivElement | null>(null);
  /*
   * Starts false, which is also what the server renders — so the still frame is
   * the agreed markup on both sides and hydration has nothing to reconcile.
   *
   * It is only ever flipped from INSIDE the IntersectionObserver callback. The
   * cases that keep the still (reduced motion, small screen) return without
   * touching state at all, because the still is already on screen: there is
   * nothing to set. That is what keeps this out of the cascading-render trap of
   * deciding-then-setting in the effect body.
   */
  const [showScene, setShowScene] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 1024px: the same breakpoint the section uses to give the canvas a column
    // of its own. Below it the scene would be small, cropped and expensive.
    const roomy = window.matchMedia("(min-width: 1024px)").matches;

    if (reduce || !roomy) return; // the still frame stands

    // 300px of runway so the chunk is fetched and compiled just before it is
    // wanted, rather than popping in after the section is already on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowScene(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-[420px] w-full lg:h-[520px]">
      {showScene ? <SentinelAgentScene /> : <AgentStill />}
    </div>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

/*
 * The meteor field, gated (Phase 10, Task 8).
 *
 * WHAT CHANGED AND WHY. The starfield is a ~500-line particle system: glow
 * sprite rasterisation, four parallax layers, meteors, sparks, pointer
 * response. It is also DARK-MODE-ONLY — it returns null in light mode and under
 * reduced motion, and has always done so correctly.
 *
 * The problem was that "returns null" is a runtime decision. The code still
 * shipped, parsed and hydrated on every single page of the site for every
 * visitor — and since Light Mode is now the default (commit c6e4bba), the
 * common case was downloading a starfield that would never draw a pixel.
 *
 * This wrapper keeps the decision but moves it in front of the download. The
 * heavy implementation lives in meteor-canvas.tsx behind `next/dynamic`, so the
 * chunk is requested only once the environment has actually asked for it: dark
 * theme, and no reduced-motion preference. Light-mode and reduced-motion
 * visitors now pay for this file — a subscription and a branch — and nothing
 * else.
 *
 * The subscription stays here rather than moving into the lazy chunk because it
 * is what decides whether to fetch that chunk, and because the theme can change
 * at any moment: flipping to dark loads the field, flipping back unmounts it.
 */

const MeteorCanvas = dynamic(() => import("./meteor-canvas"), {
  ssr: false, // a canvas has no server rendering, and the theme is client state
});

function subscribeToEnvironment(onChange: () => void): () => void {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  motion.addEventListener("change", onChange);
  // The theme toggle sets `data-theme` on <html>; watching the attribute is how
  // this stays in step without the toggle needing to know the field exists.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => {
    motion.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

function readEnvironment(): boolean {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return dark && !reduced;
}

export function MeteorField() {
  const enabled = useSyncExternalStore(
    subscribeToEnvironment,
    readEnvironment,
    () => false, // the server cannot know the theme; assume no field
  );

  if (!enabled) return null;
  return <MeteorCanvas />;
}

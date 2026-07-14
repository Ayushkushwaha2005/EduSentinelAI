"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/*
 * The meteor field (Phase 9.4).
 *
 * Ambience, and ambience has exactly one job: to be there without ever being in
 * the way. Every decision here follows from that.
 *
 *   - ONE canvas, one animation frame loop. Not fifty animated divs — that is what
 *     makes a background field expensive, and an expensive background is a
 *     background that steals frames from someone's typing.
 *   - It does not run when nobody is looking: the loop stops on `visibilitychange`
 *     and when the theme is light (the canvas is not even mounted).
 *   - UNDER `prefers-reduced-motion` IT IS NOT DRAWN AT ALL. Not slowed, not
 *     frozen — absent. A frozen starfield is still a field of dots that somebody
 *     told us they did not want.
 *   - Depth comes from parallax, not from stacking: three layers drift at
 *     different rates, and the pointer moves them by a few pixels. That is the
 *     whole 3D effect, and it costs nothing.
 *   - Meteors are RARE. A shower every second is a screensaver; one every few
 *     seconds, crossing a corner of the eye, is atmosphere.
 */

type Star = {
  x: number;
  y: number;
  z: number; // 0.35–1: depth. Drives size, brightness and parallax together.
  r: number;
  twinkle: number;
  phase: number;
};

type Meteor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  len: number;
  hue: number;
};

const STAR_DENSITY = 1 / 14000; // stars per px² — sparse on purpose
const MAX_STARS = 140;

/*
 * "Should the field exist at all?" — read from the document, not from React state.
 *
 * The answer depends on two things that live outside React: the `data-theme`
 * attribute the theme script writes on <html>, and the OS reduced-motion setting.
 * Both can change while the page is open. useSyncExternalStore is exactly the tool
 * for a value React does not own: it subscribes, it re-renders on change, and it
 * returns a stable server snapshot (false — the server has no theme and no
 * preference, and guessing would be the flash we are avoiding).
 */
function subscribeToEnvironment(onChange: () => void): () => void {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  motion.addEventListener("change", onChange);

  // The theme toggle writes an attribute on <html>; watch it rather than plumbing
  // a prop through half the component tree.
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const enabled = useSyncExternalStore(
    subscribeToEnvironment,
    readEnvironment,
    () => false, // server: never render a sky nobody asked for
  );

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: Star[] = [];
    const meteors: Meteor[] = [];
    let frame = 0;
    let running = true;

    // Pointer parallax, eased. The field leans a few pixels toward the cursor —
    // enough to feel like depth, far too little to notice as movement.
    let targetX = 0;
    let targetY = 0;
    let panX = 0;
    let panY = 0;

    const resize = () => {
      // Cap the device pixel ratio at 2: a 3x retina canvas costs 2.25x the fill
      // rate of a 2x one and looks identical for a field of soft dots.
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(MAX_STARS, Math.round(width * height * STAR_DENSITY));
      stars = Array.from({ length: count }, () => {
        const z = 0.35 + Math.random() * 0.65;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          r: 0.4 + z * 1.1,
          twinkle: 0.004 + Math.random() * 0.012,
          phase: Math.random() * Math.PI * 2,
        };
      });
    };

    const onPointer = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2; // −1..1
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const spawnMeteor = () => {
      // From the upper-left quadrant, falling right and down — one direction, so
      // the field reads as weather rather than as noise.
      const x = Math.random() * width * 0.7 - width * 0.1;
      const y = Math.random() * height * 0.4 - height * 0.15;
      const speed = 5.5 + Math.random() * 4;
      const angle = Math.PI / 4.6 + (Math.random() - 0.5) * 0.18; // ~40°, jittered
      meteors.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        max: 70 + Math.random() * 40,
        len: 90 + Math.random() * 120,
        // Cyan through teal, with the occasional violet — the brand, plus one
        // colour the brand does not own, so the sky is not a logo.
        hue: Math.random() < 0.22 ? 265 : 178 + Math.random() * 14,
      });
    };

    const draw = () => {
      if (!running) return;
      frame++;

      ctx.clearRect(0, 0, width, height);

      // Ease the parallax. The lerp is what turns a jittery mouse into drift.
      panX += (targetX * 14 - panX) * 0.035;
      panY += (targetY * 10 - panY) * 0.035;

      // ---- stars ----
      for (const s of stars) {
        s.phase += s.twinkle;
        // Deeper stars (low z) move less: that is the parallax, and it is the
        // entire illusion of a third dimension.
        const px = s.x + panX * s.z;
        const py = s.y + panY * s.z;

        // Never fully off and never fully on — a star that blinks out reads as a
        // dead pixel.
        const alpha = (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(s.phase))) * s.z;

        const glow = ctx.createRadialGradient(px, py, 0, px, py, s.r * 4.5);
        glow.addColorStop(0, `rgba(190, 240, 255, ${alpha})`);
        glow.addColorStop(0.4, `rgba(120, 220, 240, ${alpha * 0.22})`);
        glow.addColorStop(1, "rgba(120, 220, 240, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, s.r * 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(226, 248, 255, ${Math.min(1, alpha + 0.15)})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- meteors ----
      // Roughly one every ~2.5s at 60fps, and never more than three at once.
      if (meteors.length < 3 && frame % 8 === 0 && Math.random() < 0.06) {
        spawnMeteor();
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life++;

        // Fade in fast, out slow — a streak that arrives softly looks like a
        // smear; one that leaves abruptly looks like a bug.
        const t = m.life / m.max;
        const alpha = t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.88);

        const tailX = m.x - (m.vx / Math.hypot(m.vx, m.vy)) * m.len;
        const tailY = m.y - (m.vy / Math.hypot(m.vx, m.vy)) * m.len;

        const trail = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        trail.addColorStop(0, `hsla(${m.hue}, 100%, 78%, ${alpha * 0.9})`);
        trail.addColorStop(0.35, `hsla(${m.hue}, 95%, 65%, ${alpha * 0.28})`);
        trail.addColorStop(1, `hsla(${m.hue}, 90%, 60%, 0)`);

        ctx.strokeStyle = trail;
        ctx.lineWidth = 1.7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // The head: a small bright core in a soft halo. This is the "sparkle".
        const head = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 9);
        head.addColorStop(0, `hsla(${m.hue}, 100%, 92%, ${alpha})`);
        head.addColorStop(0.35, `hsla(${m.hue}, 100%, 72%, ${alpha * 0.45})`);
        head.addColorStop(1, `hsla(${m.hue}, 100%, 70%, 0)`);
        ctx.fillStyle = head;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 9, 0, Math.PI * 2);
        ctx.fill();

        if (m.life > m.max || m.x > width + m.len || m.y > height + m.len) {
          meteors.splice(i, 1);
        }
      }

      requestAnimationFrame(draw);
    };

    // Nobody is looking at a hidden tab. Stopping the loop there is the difference
    // between a background and a battery drain.
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        requestAnimationFrame(draw);
      }
    };

    resize();
    requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  // In light mode, or under reduced motion, there is no canvas in the document at
  // all — not a hidden one, not an empty one.
  if (!enabled) return null;

  return <canvas ref={canvasRef} className="meteor-field" aria-hidden="true" />;
}

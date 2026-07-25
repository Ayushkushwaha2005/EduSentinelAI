"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/*
 * The animated EduSentinel mark (Phase 10, Task 2).
 *
 * THE SEQUENCE, as briefed:
 *   particles appear -> the logo assembles -> glow -> an outline sweep ->
 *   the mark stabilises -> the nav mark carries on with a subtle idle.
 *
 * WHY PARTICLES ARE SAMPLED, NOT DRAWN. The obvious way to build a logo-assembly
 * animation is to redraw the mark as clean vector paths and stroke them on. The
 * EduSentinel mark cannot be redrawn responsibly — it is a raster that was traced
 * into 886 contours, and any hand-authored approximation would be a slightly
 * wrong version of a company's logo shipped to production. So the particles are
 * SAMPLED from the real artwork: the mark is drawn once into an offscreen canvas,
 * its opaque pixels become particle targets carrying their own colour, and what
 * assembles is the actual logo, pixel for pixel. It is also how this effect is
 * really done — the assembly reads as the logo because it IS the logo.
 *
 * WHY THERE IS NO REACT STATE HERE. Both layers — the finished <Image> and the
 * <canvas> — are always in the tree, and the effect drives their visibility by
 * touching `style` directly. That is the "synchronise with an external system"
 * shape React actually wants for canvas work: no setState in an effect, no
 * cascading render, no hydration mismatch from reading matchMedia or
 * sessionStorage during render, and the animation costs React nothing at all
 * while it runs.
 *
 * COST. One offscreen 88x88 sample, ~1,200 particles drawn as 1px rects, and the
 * whole thing tears down the moment it finishes — `cancelAnimationFrame`, canvas
 * hidden, crisp <Image> left in its place. Nothing runs afterwards. Under
 * `prefers-reduced-motion` it is NOT SLOWED, it is ABSENT: no canvas context is
 * ever created (project rule, CLAUDE.md).
 *
 * ONCE PER SESSION. A brand intro that replays on every navigation stops being an
 * intro and becomes a stutter, so the fact that it has played is kept in
 * sessionStorage.
 */

const PLAYED_KEY = "edusentinel-logo-intro";

/* Timeline, in ms. Total is deliberately under a second and a half — a logo
   animation that outstays that is in the user's way. */
const T_ASSEMBLE = 900;
const T_GLOW = 260;
const T_SWEEP = 420;
const T_SETTLE = 240;
const T_TOTAL = T_ASSEMBLE + T_GLOW + T_SWEEP + T_SETTLE;

type Particle = {
  x: number;
  y: number;
  tx: number; // target
  ty: number;
  r: number;
  g: number;
  b: number;
  delay: number; // 0..1 through the assemble phase
  size: number;
};

/* Slight overshoot on arrival — particles settle INTO place rather than stopping
   dead on it, which is the difference between "assembled" and "pasted". */
const easeOutBack = (t: number) => {
  const c = 1.32;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export function LogoIntro({
  size = 128,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const imageLayer = imageRef.current;
    if (!canvas || !imageLayer) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadyPlayed = (() => {
      try {
        return sessionStorage.getItem(PLAYED_KEY) === "1";
      } catch {
        return false; // private mode — play it; it is only decoration
      }
    })();

    // Nothing to do: the markup already shows the finished mark.
    if (reduce || alreadyPlayed) return;

    try {
      sessionStorage.setItem(PLAYED_KEY, "1");
    } catch {
      /* ignore */
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let cancelled = false;

    /** Hand off to the crisp <Image> and stop dead. */
    const finish = () => {
      cancelAnimationFrame(raf);
      canvas.style.opacity = "0";
      imageLayer.style.opacity = "1";
    };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Hide the finished mark and reveal the canvas — the animation is starting.
    imageLayer.style.opacity = "0";
    canvas.style.opacity = "1";

    const img = new window.Image();
    // Same-origin asset, so the canvas is never tainted and getImageData works.
    img.src = "/logo-mark.png";

    img.onload = () => {
      if (cancelled) return;

      /* ---- sample the real artwork ---- */
      const GRID = 88; // ~1,200 opaque pixels at step 2
      const off = document.createElement("canvas");
      off.width = GRID;
      off.height = GRID;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return finish();
      octx.drawImage(img, 0, 0, GRID, GRID);

      let data: Uint8ClampedArray;
      try {
        data = octx.getImageData(0, 0, GRID, GRID).data;
      } catch {
        // Any sampling failure at all: show the logo, skip the theatre.
        return finish();
      }

      const particles: Particle[] = [];
      const scale = size / GRID;
      const cx = size / 2;
      const cy = size / 2;
      const step = 2;

      for (let y = 0; y < GRID; y += step) {
        for (let x = 0; x < GRID; x += step) {
          const i = (y * GRID + x) * 4;
          if (data[i + 3] < 40) continue; // transparent corner of the hexagon

          const tx = x * scale;
          const ty = y * scale;

          // Start scattered on a ring around the mark, so the assembly reads as
          // the logo pulling itself together rather than a fade-in.
          const angle = Math.random() * Math.PI * 2;
          const dist = size * (0.55 + Math.random() * 0.75);

          particles.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            tx,
            ty,
            r: data[i],
            g: data[i + 1],
            b: data[i + 2],
            // Particles nearer the centre land first: the mark grows outward from
            // its middle instead of arriving as one flat sheet.
            delay:
              (Math.hypot(tx - cx, ty - cy) / (size * 0.72)) * 0.45 +
              Math.random() * 0.12,
            size: scale * step * 1.15,
          });
        }
      }

      const start = performance.now();

      const frame = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        ctx.clearRect(0, 0, size, size);

        /* ---- 1 + 2: particles appear and assemble ---- */
        const aP = Math.min(elapsed / T_ASSEMBLE, 1);

        for (const p of particles) {
          // Each particle runs its own clock inside the assemble window.
          const local = Math.max(0, Math.min((aP - p.delay) / (1 - p.delay), 1));
          if (local <= 0) continue;

          const e = easeOutBack(local);
          ctx.globalAlpha = Math.min(local * 2.2, 1);
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          ctx.fillRect(
            p.x + (p.tx - p.x) * e,
            p.y + (p.ty - p.y) * e,
            p.size,
            p.size,
          );
        }
        ctx.globalAlpha = 1;

        /* ---- 3: the glow — a pulse, not a lamp left on ---- */
        if (elapsed > T_ASSEMBLE - 160) {
          const gP = Math.min((elapsed - (T_ASSEMBLE - 160)) / (T_GLOW + 160), 1);
          const strength = Math.sin(gP * Math.PI);
          if (strength > 0.01) {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.62);
            grad.addColorStop(0, `rgba(34, 211, 238, ${0.42 * strength})`);
            grad.addColorStop(0.55, `rgba(13, 148, 136, ${0.16 * strength})`);
            grad.addColorStop(1, "rgba(13, 148, 136, 0)");
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, size, size);
            ctx.globalCompositeOperation = "source-over";
          }
        }

        /* ---- 4: the outline sweep ---- */
        const sweepStart = T_ASSEMBLE + T_GLOW;
        if (elapsed > sweepStart) {
          const sP = Math.min((elapsed - sweepStart) / T_SWEEP, 1);
          // A narrow diagonal band of light travelling across the mark, masked to
          // the artwork with `source-atop` so it lights the logo and never the
          // transparent space around it.
          const band = size * 0.42;
          const travel = -band + sP * (size + band * 2);
          const grad = ctx.createLinearGradient(travel - band, 0, travel + band, size);
          grad.addColorStop(0, "rgba(255,255,255,0)");
          grad.addColorStop(0.5, `rgba(255,255,255,${0.5 * Math.sin(sP * Math.PI)})`);
          grad.addColorStop(1, "rgba(255,255,255,0)");
          ctx.globalCompositeOperation = "source-atop";
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, size, size);
          ctx.globalCompositeOperation = "source-over";
        }

        if (elapsed < T_TOTAL) raf = requestAnimationFrame(frame);
        else finish(); /* ---- 5: stabilise ---- */
      };

      raf = requestAnimationFrame(frame);
    };

    img.onerror = finish;

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [size]);

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/*
       * The finished mark, rendered from the first frame. Server and client agree
       * on this markup; the effect only ever adjusts `opacity`, so a visitor with
       * reduced motion, a replayed session, or no JavaScript at all sees the logo
       * and never a blank square.
       */}
      <span
        ref={imageRef}
        className="absolute inset-0 transition-opacity duration-500 ease-[--ease-brand]"
      >
        <Image
          src="/logo-mark.png"
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          sizes={`${size}px`}
          priority
        />
      </span>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ width: size, height: size, opacity: 0 }}
        className="absolute inset-0 transition-opacity duration-300 ease-[--ease-brand]"
      />
    </span>
  );
}

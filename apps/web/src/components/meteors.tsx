"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/*
 * The meteor field (Phase 9.4) — atmosphere, not an animation.
 *
 * The difference between the two is entirely in the restraint:
 *
 *   - SLOW. A meteor crosses in three to five seconds, not half of one. Fast
 *     streaks read as a screensaver; slow ones read as weather, and weather is
 *     something you stop noticing, which is the point.
 *   - LAYERED. Three depths, drifting at different rates, sized and dimmed by
 *     depth. Parallax is the entire 3D effect and it costs one multiply.
 *   - RARE. Never more than three meteors alive; long, random gaps between them.
 *   - THE TRIAD, and only the triad. Violet, azure, amber — the same three colours
 *     the interface assigns meaning to. The sky is not allowed its own palette.
 *   - ONE canvas, one loop. Not fifty animated divs: an expensive background is a
 *     background that steals frames from someone's typing.
 *
 * It stops when the tab is hidden. Under `prefers-reduced-motion` it is not
 * drawn at all — not slowed, not frozen. Absent.
 */

type Star = {
  x: number;
  y: number;
  z: number; // 0.25–1 — depth: drives size, brightness, drift and parallax
  r: number;
  twinkle: number;
  phase: number;
  drift: number;
  hue: number;
};

type Sparkle = {
  x: number;
  y: number;
  life: number;
  max: number;
  r: number;
  hue: number;
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
  z: number; // near meteors are brighter, thicker and faster
};

/* The interface's three accents, as hues. The sky speaks the same language. */
const VIOLET = 268;
const AZURE = 190;
const AMBER = 38;

const STAR_DENSITY = 1 / 9000;
const MAX_STARS = 220;

function subscribeToEnvironment(onChange: () => void): () => void {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  motion.addEventListener("change", onChange);

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
    () => false, // the server has no theme and no preference; it renders no sky
  );

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    const meteors: Meteor[] = [];
    const sparkles: Sparkle[] = [];
    let running = true;
    let raf = 0;

    // Time-based, not frame-based: the field must run at the same speed on a
    // 144 Hz monitor as on a 60 Hz one. A frame-counted animation is a different
    // animation on every machine.
    let last = performance.now();
    let nextMeteorIn = 1200 + Math.random() * 2600;

    let targetX = 0;
    let targetY = 0;
    let panX = 0;
    let panY = 0;

    const resize = () => {
      // DPR capped at 2: a 3× canvas costs 2.25× the fill rate of a 2× one and
      // looks identical for soft dots.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(MAX_STARS, Math.round(width * height * STAR_DENSITY));
      stars = Array.from({ length: count }, () => {
        const z = 0.25 + Math.random() * 0.75;
        // Most stars are white-ish; a few carry one of the three accents, which is
        // what stops the sky looking monochrome without ever looking colourful.
        const tinted = Math.random() < 0.28;
        const hue = !tinted
          ? AZURE
          : [VIOLET, AZURE, AMBER][Math.floor(Math.random() * 3)];
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          r: 0.35 + z * 1.15,
          twinkle: 0.4 + Math.random() * 1.1, // cycles per second
          phase: Math.random() * Math.PI * 2,
          drift: (6 + Math.random() * 10) * z, // px per second, downward-right
          hue: tinted ? hue : 200,
        };
      });
    };

    const onPointer = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const spawnMeteor = () => {
      // Spawn ANYWHERE along the top and left edges, so the whole viewport gets
      // weather — not just one favoured corner.
      const fromTop = Math.random() < 0.62;
      const z = 0.45 + Math.random() * 0.55;

      const x = fromTop ? Math.random() * width * 1.25 - width * 0.25 : -80;
      const y = fromTop ? -60 : Math.random() * height * 0.75;

      // SLOW. 90–150 px/s: three to five seconds to cross a laptop screen.
      const speed = (90 + Math.random() * 60) * z;
      const angle = Math.PI / 4.4 + (Math.random() - 0.5) * 0.22;

      meteors.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        max: 3.4 + Math.random() * 2.2, // seconds
        len: (120 + Math.random() * 170) * z,
        hue: [VIOLET, AZURE, AZURE, AMBER][Math.floor(Math.random() * 4)],
        z,
      });
    };

    const draw = (now: number) => {
      if (!running) return;
      // Clamp dt: coming back from a background tab must not teleport the sky.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      ctx.clearRect(0, 0, width, height);

      // Eased parallax — the lerp is what turns a jittery mouse into drift.
      panX += (targetX * 18 - panX) * Math.min(1, dt * 2.4);
      panY += (targetY * 12 - panY) * Math.min(1, dt * 2.4);

      // ---- stars ----
      ctx.globalCompositeOperation = "lighter";

      for (const s of stars) {
        s.phase += s.twinkle * dt * Math.PI;
        // Slow downward drift, faster the nearer the star: the field is falling,
        // very gently, and that is what makes it feel like sky rather than dots.
        s.y += s.drift * dt;
        if (s.y > height + 4) {
          s.y = -4;
          s.x = Math.random() * width;
        }

        const px = s.x + panX * s.z;
        const py = s.y + panY * s.z;

        // Never fully off, never fully on — a star that blinks out reads as a dead
        // pixel rather than as a star.
        const alpha = (0.22 + 0.5 * (0.5 + 0.5 * Math.sin(s.phase))) * s.z;

        const glow = ctx.createRadialGradient(px, py, 0, px, py, s.r * 5);
        glow.addColorStop(0, `hsla(${s.hue}, 90%, 88%, ${alpha})`);
        glow.addColorStop(0.35, `hsla(${s.hue}, 90%, 70%, ${alpha * 0.18})`);
        glow.addColorStop(1, `hsla(${s.hue}, 90%, 70%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, s.r * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${s.hue}, 60%, 97%, ${Math.min(1, alpha + 0.2)})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- meteors ----
      nextMeteorIn -= dt * 1000;
      if (nextMeteorIn <= 0) {
        if (meteors.length < 3) spawnMeteor();
        // Long, random gaps. Regular spacing is the tell that turns atmosphere
        // back into an animation.
        nextMeteorIn = 2200 + Math.random() * 5200;
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life += dt;

        const t = m.life / m.max;
        // In fast, out slow: a streak that arrives softly is a smear; one that
        // leaves abruptly is a bug.
        const alpha = (t < 0.1 ? t / 0.1 : Math.max(0, 1 - (t - 0.1) / 0.9)) * m.z;

        const norm = Math.hypot(m.vx, m.vy) || 1;
        const tailX = m.x - (m.vx / norm) * m.len;
        const tailY = m.y - (m.vy / norm) * m.len;

        const trail = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        trail.addColorStop(0, `hsla(${m.hue}, 100%, 82%, ${alpha * 0.95})`);
        trail.addColorStop(0.3, `hsla(${m.hue}, 95%, 66%, ${alpha * 0.3})`);
        trail.addColorStop(1, `hsla(${m.hue}, 90%, 60%, 0)`);

        ctx.strokeStyle = trail;
        ctx.lineWidth = 1 + m.z * 1.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // The head: a bright core inside a soft halo.
        const headR = 6 + m.z * 6;
        const head = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, headR);
        head.addColorStop(0, `hsla(${m.hue}, 100%, 95%, ${alpha})`);
        head.addColorStop(0.3, `hsla(${m.hue}, 100%, 75%, ${alpha * 0.5})`);
        head.addColorStop(1, `hsla(${m.hue}, 100%, 70%, 0)`);
        ctx.fillStyle = head;
        ctx.beginPath();
        ctx.arc(m.x, m.y, headR, 0, Math.PI * 2);
        ctx.fill();

        // Sparks shed along the trail. This is the "sparkle" — embers falling off a
        // meteor, not glitter sprinkled over the page.
        if (Math.random() < dt * 26 * m.z) {
          sparkles.push({
            x: m.x - (m.vx / norm) * Math.random() * m.len * 0.5,
            y: m.y - (m.vy / norm) * Math.random() * m.len * 0.5,
            life: 0,
            max: 0.5 + Math.random() * 0.9,
            r: 0.6 + Math.random() * 1.1,
            hue: m.hue,
          });
        }

        if (m.life > m.max || m.x - m.len > width || m.y - m.len > height) {
          meteors.splice(i, 1);
        }
      }

      // ---- sparks ----
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.life += dt;
        const a = Math.max(0, 1 - s.life / s.max);
        if (a <= 0) {
          sparkles.splice(i, 1);
          continue;
        }
        // They hang, and fade, and fall a little — embers cooling.
        s.y += 8 * dt;

        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        g.addColorStop(0, `hsla(${s.hue}, 100%, 92%, ${a * 0.9})`);
        g.addColorStop(1, `hsla(${s.hue}, 100%, 70%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

    // Nobody is looking at a hidden tab. Stopping there is the difference between
    // a background and a battery drain.
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    raf = requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  // In light mode, or under reduced motion, there is no canvas in the document at
  // all — not a hidden one, not an empty one.
  if (!enabled) return null;

  return (
    <div className="meteor-field" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* The glass reflection: a single wide, very faint sheen across the sky, so
          the whole page reads as being seen THROUGH something. It is CSS, so it
          costs the canvas nothing. */}
      <span className="meteor-sheen" />
    </div>
  );
}

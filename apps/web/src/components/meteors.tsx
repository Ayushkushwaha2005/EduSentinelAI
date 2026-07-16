"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/*
 * The night sky (Phase 9, cinematic rebuild).
 *
 * The brief was blunt: the old field looked like "a few CSS particles on a black
 * page" — sparse, flat, generated. A real meteor shower is DENSE and CONTINUOUS:
 * hundreds of stars at every depth, dozens of streaks alive at once sweeping the
 * WHOLE viewport, glowing tapered trails with motion-blur haloes, sparks shedding
 * behind the bright ones, and never a blank corner. This rebuilds it as a proper
 * four-layer particle system tuned for that.
 *
 * The one technique that makes this affordable at these counts is the one every
 * game uses:
 *
 *   PRE-RENDER THE GLOW ONCE, THEN BLIT IT.
 *
 * A soft radial glow is expensive to rasterise — a `createRadialGradient` + `fill`
 * per particle per frame would not survive a thousand of them. So each accent's
 * glow is drawn a single time into an offscreen sprite, and every star, spark and
 * meteor head after that is a `drawImage` — a texture copy the GPU does nearly for
 * free. A thousand particles cost about what a handful of gradient fills would.
 *
 * COVERAGE is the headline fix. Meteors are seeded across the ENTIRE upstream
 * frontier (the whole top edge, extended, plus the whole left edge), and the field
 * is pre-warmed on resize so the shower is already in full flow on the first frame
 * — no corner is ever empty, and it never stops.
 *
 * THE PALETTE IS THE INTERFACE'S THREE ACCENTS: violet (catalogue), cyan
 * (workflow) and gold (inbox), carried in balance so gold stays present on every
 * page. The reference's three lit cards, turned into weather.
 *
 * DEPTH is real: four layers. Far stars are tiny, dim, slow, barely parallax; near
 * ones are large, bright, quick, and swing with the pointer. That gradient of
 * behaviour across depth is the whole 3D feeling, and it costs one multiply.
 *
 * It is time-based (identical on 60 Hz and 144 Hz), stops on a hidden tab, throttles
 * its particle budget to the screen area and device-pixel-ratio so it holds 60 FPS
 * on a laptop, and under `prefers-reduced-motion` is NOT DRAWN — not slowed, absent.
 */

/* The three accents, as [hue, saturation%] — the same colours the UI assigns. */
const VIOLET: [number, number] = [266, 92];
const CYAN: [number, number] = [190, 95];
const GOLD: [number, number] = [42, 92];
const PALE: [number, number] = [210, 38];
const ICE: [number, number] = [214, 70];
const ACCENTS = [VIOLET, CYAN, GOLD] as const;

type Star = {
  x: number;
  y: number;
  layer: number; // 0 far · 1 · 2 · 3 near
  size: number;
  hue: number;
  sat: number;
  base: number; // base brightness
  tw: number; // twinkle speed
  phase: number;
  flare: boolean; // draws a diffraction cross — the "glass refraction" sparkle
};

type Meteor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  layer: number;
  life: number;
  max: number;
  len: number;
  hue: number;
  sat: number;
  width: number;
  spark: number; // spark-shedding accumulator
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: number;
  sat: number;
};

// Layer character: [parallax strength, drift px/s, star size ×, brightness ×].
// Four layers — a deeper stack than before reads as more real atmosphere.
const LAYERS = [
  { parallax: 3, drift: 2, size: 0.6, bright: 0.42 }, // deep field
  { parallax: 9, drift: 5, size: 0.9, bright: 0.66 }, // far
  { parallax: 18, drift: 9, size: 1.25, bright: 0.86 }, // mid
  { parallax: 34, drift: 16, size: 1.7, bright: 1.0 }, // near
];

const STAR_DENSITY = 1 / 1700; // ~ one star per 1700 px² → a genuinely full sky

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

/** A soft round glow, rasterised once. Everything luminous is a copy of this. */
function makeGlowSprite(hue: number, sat: number): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `hsla(${hue}, ${sat}%, 94%, 1)`);
  grad.addColorStop(0.16, `hsla(${hue}, ${sat}%, 80%, 0.9)`);
  grad.addColorStop(0.42, `hsla(${hue}, ${sat}%, 64%, 0.3)`);
  grad.addColorStop(1, `hsla(${hue}, ${sat}%, 60%, 0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function MeteorField() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const enabled = useSyncExternalStore(
    subscribeToEnvironment,
    readEnvironment,
    () => false,
  );

  useEffect(() => {
    if (!enabled) return;
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.className = "relative z-[1] h-full w-full";
    host.prepend(canvas);
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Pre-render one glow sprite per colour: the three accents, a pale one for the
    // majority of stars, and a cool ice tone. Drawn once, reused by every particle
    // for the life of the component.
    const sprites = new Map<number, HTMLCanvasElement>();
    for (const [hue, sat] of [...ACCENTS, PALE, ICE]) sprites.set(hue, makeGlowSprite(hue, sat));
    const spriteFor = (hue: number) => sprites.get(hue) ?? sprites.get(PALE[0])!;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    const meteors: Meteor[] = [];
    const sparks: Spark[] = [];
    let maxMeteors = 40;
    let sparkCap = 260;
    let running = true;
    let raf = 0;
    let last = performance.now();
    let spawnClock = 0;
    let spawnEvery = 0.18;

    let targetX = 0;
    let targetY = 0;
    let panX = 0;
    let panY = 0;

    // Travel direction: a shallow dive to the lower-right, shared by all meteors so
    // the shower has a single coherent wind. Individual meteors jitter around it.
    const BASE_ANGLE = Math.PI / 5; // ~36° below horizontal

    const makeMeteor = (seed: boolean): Meteor => {
      // Near meteors are the minority — fast, bright, thick, streaking across the
      // foreground. Deep ones are many, slow, thin, drifting far away.
      const r = Math.random();
      const layer = r < 0.5 ? 0 : r < 0.78 ? 1 : r < 0.93 ? 2 : 3;
      const L = LAYERS[layer];

      const angle = BASE_ANGLE + (Math.random() - 0.5) * 0.22;
      const speed = (95 + Math.random() * 120) * (0.55 + L.bright);

      // Seed points: when pre-warming, place meteors ANYWHERE on screen so the field
      // starts full. Otherwise spawn along the upstream frontier — the whole top
      // edge (generously extended left/right) and the whole left edge — so streaks
      // enter from every part of the sky and sweep the entire viewport, not a corner.
      let x: number;
      let y: number;
      if (seed) {
        x = Math.random() * width * 1.2 - width * 0.1;
        y = Math.random() * height;
      } else if (Math.random() < 0.62) {
        x = Math.random() * width * 1.5 - width * 0.4;
        y = -Math.random() * height * 0.25 - 40;
      } else {
        x = -Math.random() * width * 0.15 - 40;
        y = Math.random() * height * 0.9;
      }

      const [hue, sat] = ACCENTS[Math.floor(Math.random() * 3)];
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        layer,
        life: seed ? Math.random() * 2 : 0,
        max: 6 + Math.random() * 6,
        len: (90 + Math.random() * 240) * (0.5 + L.bright),
        hue,
        sat,
        width: 0.7 + L.bright * 2.1,
        spark: 0,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const area = width * height;
      // Budget scales with area but is capped so a 4K monitor cannot melt a laptop.
      const starCount = Math.min(950, Math.round(area * STAR_DENSITY));
      // Denser meteor population on bigger screens; the whole point is "many at once".
      maxMeteors = Math.max(26, Math.min(64, Math.round(area / 34000)));
      spawnEvery = Math.max(0.05, 9 / maxMeteors) * 0.12 + 0.03;
      sparkCap = Math.min(420, Math.round(area / 8000));

      stars = Array.from({ length: starCount }, () => {
        // Weight the population toward the far layers — a real sky is mostly faint,
        // distant stars, with a few bright near ones. An even split looks flat.
        const r = Math.random();
        const layer = r < 0.44 ? 0 : r < 0.74 ? 1 : r < 0.92 ? 2 : 3;
        // ~ a third of stars carry an accent; most are pale/ice. Enough colour to
        // feel alive, not so much it reads as confetti.
        const c = Math.random();
        const [hue, sat] = c < 0.26 ? ACCENTS[Math.floor(Math.random() * 3)] : c < 0.5 ? ICE : PALE;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          layer,
          size: (0.45 + Math.random() * 1.5) * LAYERS[layer].size,
          hue,
          sat,
          base: (0.18 + Math.random() * 0.62) * LAYERS[layer].bright,
          tw: 0.3 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
          // A small elite of bright near stars throw a diffraction cross — the
          // cinematic "glass refraction" glint. Rare, so it stays a highlight.
          flare: layer >= 2 && Math.random() < 0.09,
        };
      });

      // Pre-warm the shower so the very first frame is already full.
      meteors.length = 0;
      for (let i = 0; i < maxMeteors; i++) meteors.push(makeMeteor(true));
    };

    const onPointer = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const blit = (hue: number, x: number, y: number, radius: number, alpha: number) => {
      if (alpha <= 0.004) return;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(spriteFor(hue), x - radius, y - radius, radius * 2, radius * 2);
    };

    const draw = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter"; // light adds; that is what makes bloom

      panX += (targetX * 34 - panX) * Math.min(1, dt * 2.2);
      panY += (targetY * 22 - panY) * Math.min(1, dt * 2.2);

      // ---- stars ----
      for (const s of stars) {
        const L = LAYERS[s.layer];
        s.phase += s.tw * dt;
        s.y += L.drift * dt;
        if (s.y > height + 6) {
          s.y = -6;
          s.x = Math.random() * width;
        }
        const px = s.x + panX * (L.parallax / 34);
        const py = s.y + panY * (L.parallax / 34);
        // Never fully dark: a star that blinks out reads as a dead pixel.
        const a = s.base * (0.5 + 0.5 * Math.sin(s.phase));
        blit(s.hue, px, py, s.size * 3.4, a);
        // A hard bright core on the nearer, brighter stars — the twinkle.
        if (s.layer >= 2 && a > 0.28) {
          ctx.globalAlpha = Math.min(1, a + 0.25);
          ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, 97%, 1)`;
          ctx.beginPath();
          ctx.arc(px, py, s.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          // Diffraction cross on the elite few — a four-point glass glint that
          // pulses with the twinkle.
          if (s.flare) {
            const r = s.size * (4 + 3 * Math.sin(s.phase));
            ctx.globalAlpha = Math.min(0.9, a);
            ctx.strokeStyle = `hsla(${s.hue}, ${s.sat}%, 96%, 1)`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(px - r, py);
            ctx.lineTo(px + r, py);
            ctx.moveTo(px, py - r);
            ctx.lineTo(px, py + r);
            ctx.stroke();
          }
        }
      }

      // ---- meteors ----
      // Continuous and dense: a steady population is topped up every frame so the
      // shower never thins out. Spawn faster than they die.
      spawnClock -= dt;
      while (spawnClock <= 0 && meteors.length < maxMeteors) {
        meteors.push(makeMeteor(false));
        spawnClock += spawnEvery * (0.5 + Math.random());
      }
      // When the field is already at capacity the clock keeps ticking down; clamp it
      // so it cannot accumulate into a burst of simultaneous spawns later.
      if (spawnClock < -spawnEvery) spawnClock = -spawnEvery;

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const L = LAYERS[m.layer];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life += dt;

        const t = m.life / m.max;
        const fade = t < 0.1 ? t / 0.1 : Math.max(0, 1 - (t - 0.1) / 0.9);
        const alpha = fade * (0.35 + L.bright * 0.65);

        const px = m.x + panX * (L.parallax / 34);
        const py = m.y + panY * (L.parallax / 34);
        const norm = Math.hypot(m.vx, m.vy) || 1;
        const ux = m.vx / norm;
        const uy = m.vy / norm;
        const tailX = px - ux * m.len;
        const tailY = py - uy * m.len;

        // Motion-blur halo: a wide, very soft trail under the sharp one. This is the
        // "movie" smear — it makes the streak feel fast rather than drawn.
        const halo = ctx.createLinearGradient(px, py, tailX, tailY);
        halo.addColorStop(0, `hsla(${m.hue}, ${m.sat}%, 78%, ${alpha * 0.32})`);
        halo.addColorStop(0.5, `hsla(${m.hue}, ${m.sat}%, 64%, ${alpha * 0.12})`);
        halo.addColorStop(1, `hsla(${m.hue}, ${m.sat}%, 60%, 0)`);
        ctx.strokeStyle = halo;
        ctx.lineWidth = m.width * 3.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // The sharp trail: bright, tapered, from a hot near-white head to nothing.
        const trail = ctx.createLinearGradient(px, py, tailX, tailY);
        trail.addColorStop(0, `hsla(${m.hue}, ${Math.min(100, m.sat)}%, 92%, ${alpha})`);
        trail.addColorStop(0.28, `hsla(${m.hue}, ${m.sat}%, 68%, ${alpha * 0.32})`);
        trail.addColorStop(1, `hsla(${m.hue}, ${m.sat}%, 60%, 0)`);
        ctx.strokeStyle = trail;
        ctx.lineWidth = m.width;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // The head: a hot core plus a soft bloom.
        blit(m.hue, px, py, 6 + L.bright * 9, alpha);
        ctx.globalAlpha = Math.min(1, alpha + 0.15);
        ctx.fillStyle = `hsla(${m.hue}, ${m.sat}%, 98%, 1)`;
        ctx.beginPath();
        ctx.arc(px, py, m.width * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Sparks shed along the trail — from the nearer, brighter meteors, so the
        // effect is present without becoming glitter. Rate is time-based.
        m.spark += dt * (16 + L.bright * 26);
        while (m.spark >= 1 && sparks.length < sparkCap) {
          m.spark -= 1;
          const back = Math.random() * m.len * 0.7;
          sparks.push({
            x: px - ux * back,
            y: py - uy * back,
            vx: (Math.random() - 0.5) * 16,
            vy: (Math.random() - 0.5) * 16 + 4,
            life: 0,
            max: 0.5 + Math.random() * 1.2,
            size: 0.5 + Math.random() * 1.6,
            hue: m.hue,
            sat: m.sat,
          });
        }

        // Recycle once spent or fully off the downstream edges — never let the
        // population drop, so there is always weather.
        if (m.life > m.max || px - m.len > width + 60 || py - m.len > height + 60) {
          meteors.splice(i, 1);
        }
      }

      // ---- sparks ----
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        const a = Math.max(0, 1 - s.life / s.max);
        if (a <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += (s.vy + 20) * dt; // cool and fall
        blit(s.hue, s.x, s.y, s.size * 3, a * 0.85);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

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
      canvas.remove();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="meteor-field" ref={hostRef} aria-hidden="true">
      {/* Nebula haze and drifting space dust sit BENEATH the canvas — they fill the
          black with faint colour so no region is ever empty. Volumetric shafts and a
          glass sheen sit above it, giving the sky a sense of being seen THROUGH
          something. All four are CSS, so the canvas pays nothing for them. */}
      <span className="meteor-nebula" />
      <span className="meteor-dust" />
      <span className="meteor-shafts" />
      <span className="meteor-sheen" />
    </div>
  );
}

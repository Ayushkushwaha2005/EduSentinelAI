"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/*
 * The night sky (Phase 9.4, redesigned).
 *
 * The brief was blunt and correct: two lonely meteors on a black field looks
 * generated, not designed. A real sky is DENSE — hundreds of stars at every
 * depth, a steady drift of meteors near and far, embers, and a faint colour to
 * the dark. So this is rebuilt as a proper particle system, and the thing that
 * makes density affordable is the one technique every game uses:
 *
 *   PRE-RENDER THE GLOW ONCE, THEN BLIT IT.
 *
 * A soft radial glow is expensive to rasterise — a `createRadialGradient` + `fill`
 * per particle per frame will not survive four hundred of them. So we draw the
 * glow a single time per accent colour into an offscreen sprite, and every star,
 * ember and meteor head after that is a `drawImage` — a texture copy the GPU does
 * for free. Four hundred particles cost about what four used to.
 *
 * THE PALETTE IS THE INTERFACE'S THREE ACCENTS, IN EQUAL THIRDS: violet, cyan,
 * gold. That is deliberate — the workspace assigns those three colours by meaning
 * (catalogue / workflow / inbox), and the sky carrying all three in balance is
 * what keeps gold present on every page, not only the amber ones. The reference's
 * three lit cards, turned into weather.
 *
 * DEPTH is real: three layers. Far stars are small, dim, slow and barely parallax;
 * near ones are large, bright, quick and swing with the pointer. That gradient of
 * behaviour across depth is the whole 3D feeling, and it costs one multiply.
 *
 * It is time-based (identical on 60 Hz and 144 Hz), stops on a hidden tab, and
 * under `prefers-reduced-motion` is NOT DRAWN — not slowed, absent.
 */

/* The three accents, as [hue, saturation%] — the same colours the UI assigns. */
const VIOLET: [number, number] = [266, 92];
const CYAN: [number, number] = [190, 95];
const GOLD: [number, number] = [42, 92];
const PALE: [number, number] = [210, 40];
const ACCENTS = [VIOLET, CYAN, GOLD] as const;

type Star = {
  x: number;
  y: number;
  layer: number; // 0 far · 1 mid · 2 near
  size: number;
  hue: number;
  sat: number;
  base: number; // base brightness
  tw: number; // twinkle speed
  phase: number;
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
};

type Ember = {
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
const LAYERS = [
  { parallax: 4, drift: 3, size: 0.7, bright: 0.55 }, // far
  { parallax: 12, drift: 7, size: 1.0, bright: 0.8 }, // mid
  { parallax: 26, drift: 13, size: 1.5, bright: 1.0 }, // near
];

const STAR_DENSITY = 1 / 2600; // ~ one star per 2600 px² → a genuinely full sky

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
  grad.addColorStop(0, `hsla(${hue}, ${sat}%, 92%, 1)`);
  grad.addColorStop(0.18, `hsla(${hue}, ${sat}%, 78%, 0.85)`);
  grad.addColorStop(0.45, `hsla(${hue}, ${sat}%, 62%, 0.28)`);
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
    canvas.className = "h-full w-full";
    host.prepend(canvas);
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Pre-render one glow sprite per accent, plus a pale one for the majority of
    // stars. Four textures, drawn once, reused by every particle for the life of
    // the component.
    const sprites = new Map<number, HTMLCanvasElement>();
    for (const [hue, sat] of [...ACCENTS, PALE]) sprites.set(hue, makeGlowSprite(hue, sat));
    const spriteFor = (hue: number) => sprites.get(hue) ?? sprites.get(PALE[0])!;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    const meteors: Meteor[] = [];
    const embers: Ember[] = [];
    let running = true;
    let raf = 0;
    let last = performance.now();
    let spawnClock = 0;

    let targetX = 0;
    let targetY = 0;
    let panX = 0;
    let panY = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(560, Math.round(width * height * STAR_DENSITY));
      stars = Array.from({ length: count }, () => {
        // Weight the population toward the far layer — a real sky is mostly faint,
        // distant stars, with a few bright near ones. An even split looks flat.
        const r = Math.random();
        const layer = r < 0.55 ? 0 : r < 0.85 ? 1 : 2;
        // ~ a third of stars carry an accent; the rest are pale. Enough colour to
        // feel alive, not so much it reads as confetti.
        const tinted = Math.random() < 0.34;
        const [hue, sat] = tinted ? ACCENTS[Math.floor(Math.random() * 3)] : PALE;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          layer,
          size: (0.5 + Math.random() * 1.4) * LAYERS[layer].size,
          hue,
          sat,
          base: (0.2 + Math.random() * 0.6) * LAYERS[layer].bright,
          tw: 0.3 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
        };
      });
    };

    const onPointer = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const spawnMeteor = () => {
      // Near meteors are the minority — fast, bright, thick, streaking across the
      // foreground. Far ones are many, slow, thin, drifting deep in the field.
      const r = Math.random();
      const layer = r < 0.6 ? 0 : r < 0.87 ? 1 : 2;
      const L = LAYERS[layer];

      // Spawn along the top and left edges together, biased to the top, so the
      // whole viewport gets weather rather than one corner.
      const fromTop = Math.random() < 0.7;
      const x = fromTop ? Math.random() * width * 1.3 - width * 0.2 : -100;
      const y = fromTop ? Math.random() * height * 0.3 - height * 0.2 : Math.random() * height * 0.8;

      const speed = (70 + Math.random() * 70) * (0.5 + L.bright);
      const angle = Math.PI / 4.3 + (Math.random() - 0.5) * 0.28;
      const [hue, sat] = ACCENTS[Math.floor(Math.random() * 3)];

      meteors.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        layer,
        life: 0,
        max: 4 + Math.random() * 3,
        len: (60 + Math.random() * 160) * (0.6 + L.bright),
        hue,
        sat,
        width: 0.6 + L.bright * 1.6,
      });
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

      panX += (targetX * 30 - panX) * Math.min(1, dt * 2.2);
      panY += (targetY * 20 - panY) * Math.min(1, dt * 2.2);

      // ---- stars ----
      for (const s of stars) {
        const L = LAYERS[s.layer];
        s.phase += s.tw * dt;
        s.y += L.drift * dt;
        if (s.y > height + 6) {
          s.y = -6;
          s.x = Math.random() * width;
        }
        const px = s.x + panX * (L.parallax / 26);
        const py = s.y + panY * (L.parallax / 26);
        // Never fully dark: a star that blinks out reads as a dead pixel.
        const a = s.base * (0.55 + 0.45 * Math.sin(s.phase));
        blit(s.hue, px, py, s.size * 3.4, a);
        // A hard bright core on the nearer, brighter stars — the twinkle.
        if (s.layer > 0 && a > 0.3) {
          ctx.globalAlpha = Math.min(1, a + 0.2);
          ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, 96%, 1)`;
          ctx.beginPath();
          ctx.arc(px, py, s.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- meteors ----
      // Continuous, layered, dense: a steady population rather than the occasional
      // lonely streak. Aim for ~ two dozen alive across the three depths.
      spawnClock -= dt;
      if (spawnClock <= 0 && meteors.length < 26) {
        spawnMeteor();
        spawnClock = 0.12 + Math.random() * 0.5;
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const L = LAYERS[m.layer];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life += dt;

        const t = m.life / m.max;
        const alpha = (t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.88)) * (0.4 + L.bright * 0.6);

        const px = m.x + panX * (L.parallax / 26);
        const py = m.y + panY * (L.parallax / 26);
        const norm = Math.hypot(m.vx, m.vy) || 1;
        const tailX = px - (m.vx / norm) * m.len;
        const tailY = py - (m.vy / norm) * m.len;

        const trail = ctx.createLinearGradient(px, py, tailX, tailY);
        trail.addColorStop(0, `hsla(${m.hue}, ${m.sat}%, 82%, ${alpha * 0.9})`);
        trail.addColorStop(0.3, `hsla(${m.hue}, ${m.sat}%, 66%, ${alpha * 0.28})`);
        trail.addColorStop(1, `hsla(${m.hue}, ${m.sat}%, 60%, 0)`);
        ctx.strokeStyle = trail;
        ctx.lineWidth = m.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        blit(m.hue, px, py, 5 + L.bright * 7, alpha);

        // Embers shed along the trail — only from the nearer, brighter meteors, so
        // the effect is present without becoming glitter.
        if (m.layer > 0 && Math.random() < dt * 22 * L.bright && embers.length < 140) {
          embers.push({
            x: px - (m.vx / norm) * Math.random() * m.len * 0.6,
            y: py - (m.vy / norm) * Math.random() * m.len * 0.6,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12 + 6,
            life: 0,
            max: 0.6 + Math.random() * 1.1,
            size: 0.6 + Math.random() * 1.4,
            hue: m.hue,
            sat: m.sat,
          });
        }

        if (m.life > m.max || m.x - m.len > width || m.y - m.len > height) {
          meteors.splice(i, 1);
        }
      }

      // ---- embers ----
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt;
        const a = Math.max(0, 1 - e.life / e.max);
        if (a <= 0) {
          embers.splice(i, 1);
          continue;
        }
        e.x += e.vx * dt;
        e.y += (e.vy + 14) * dt; // cool and fall
        blit(e.hue, e.x, e.y, e.size * 3, a * 0.8);
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
      {/* Volumetric shafts and a glass sheen sit above the canvas, giving the sky
          a sense of atmosphere it is being seen THROUGH. Both are CSS, so the
          canvas pays nothing for them. */}
      <span className="meteor-shafts" />
      <span className="meteor-sheen" />
    </div>
  );
}

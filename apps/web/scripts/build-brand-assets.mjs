/*
 * Brand asset pipeline (Phase 10, Task 8).
 *
 * WHY THIS EXISTS
 *
 * The mark shipped as a 578 KB SVG — a bitmap auto-traced into 886 paths — and
 * that file was being served, `unoptimized priority`, behind every nav bar,
 * sidebar, mobile drawer and auth screen, AND again as the favicon. A 24px logo
 * was costing more than the rest of the page. Alongside it: a 1.3 MB Open Graph
 * card at a non-standard 1698x926, a 2.1 MB unused master, and a 264 KB favicon.
 *
 * WHAT THIS DOES NOT DO: redraw the mark. The logo is the logo. Every output
 * below is the same artwork, resampled with Lanczos and compressed properly.
 *
 * Run: node scripts/build-brand-assets.mjs
 */

import sharp from "sharp";
import { statSync } from "fs";
import path from "path";

const SRC = "public/logo-tile.png"; // 512x512 master tile — the cleanest source

/*
 * ⚠ THE PADDING CORRECTION — do not remove.
 *
 * logo-tile.png carries roughly 13% transparent margin on every side. The SVG it
 * replaced carried almost none: rasterised, the SVG's artwork filled 90.5% of its
 * viewBox while the tile's filled only 73.3%.
 *
 * Resampling the tile naively therefore shipped a mark that rendered 19% SMALLER
 * than the one it replaced — at 36px in the nav, a visibly shrunken logo. Caught
 * by scripts/verify-logo-parity.mjs, which measures both content bounding boxes.
 *
 * So every derived asset below is TRIMMED to its artwork and then re-padded to a
 * target fill fraction, rather than being resized as-is. FILL matches what the
 * SVG actually did.
 */
/*
 * Measured empirically against the original, not guessed.
 *
 * Rasterised in a 400px box, the original SVG's solid artwork measured 362 wide
 * by 380 TALL — so it filled 95% of the box vertically and 90.5% horizontally.
 *
 * This constant is the HEIGHT fraction, because `fit: "inside"` constrains by the
 * larger dimension and the hexagon is taller than it is wide. Setting it to the
 * width fraction instead lands the mark 5% small. Verified by
 * scripts/verify-logo-parity.mjs, which measures both against the original.
 */
const SVG_FILL = 0.95;

/**
 * The bounding box of the SOLID artwork.
 *
 * `sharp.trim()` is not usable here: it trims on any non-transparent pixel, and
 * the tile carries a wide soft drop shadow. Trimming to the shadow leaves the
 * hexagon itself ~8% undersized however the fill fraction is tuned, because the
 * shadow's extent is not proportional to the artwork's.
 *
 * Alpha > 128 finds the hexagon and ignores both the shadow and the antialiased
 * fringe, which is the same threshold verify-logo-parity.mjs measures with — so
 * the two agree on what "the mark" is.
 */
async function solidBounds(src) {
  const { data, info } = await sharp(src).raw().ensureAlpha().toBuffer({
    resolveWithObject: true,
  });

  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Extract the solid artwork and centre it on a square canvas so it occupies
 * exactly `fill` of the box. `fit: "inside"` preserves the mark's aspect ratio —
 * the hexagon is very slightly taller than it is wide and must stay that way.
 */
async function refit(size, fill) {
  const box = await solidBounds(SRC);
  const inner = Math.round(size * fill);

  const art = await sharp(SRC)
    .extract(box)
    .resize(inner, inner, {
      fit: "inside",
      kernel: "lanczos3",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toBuffer();
}

function kb(f) {
  return (statSync(f).size / 1024).toFixed(0);
}

async function report(label, file, before) {
  console.log(
    `${label.padEnd(28)} ${String(before).padStart(5)} KB -> ${String(kb(file)).padStart(5)} KB  ${path.basename(file)}`,
  );
}

const jobs = [];

/*
 * The UI mark. Rendered at 28-64 px across the product, so 256 px covers a 4x
 * device-pixel-ratio and nothing more. next/image resizes and re-encodes from
 * here to AVIF/WebP at the exact width each surface asks for.
 */
jobs.push(async () => {
  const out = "public/logo-mark.png";
  // SVG_FILL, so the mark occupies exactly the share of its box that the SVG did.
  const buf = await refit(256, SVG_FILL);
  await sharp(buf)
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
    .toFile(out);
  await report("UI mark", out, 0);
});

/*
 * The favicon. Browsers draw this at 16-32 px; 512 px of it was 264 KB of
 * bandwidth to render sixteen pixels. 96 px is generous.
 */
jobs.push(async () => {
  const out = "src/app/icon.png";
  const before = kb(out);
  // A favicon is drawn at 16px; it should fill its box almost completely, so it
  // gets a tighter fit than the in-page mark.
  const buf = await refit(96, 0.98);
  await sharp(buf)
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toFile(out);
  await report("favicon", out, before);
});

/* Apple touch icon — 180 px is the size iOS actually requests. */
jobs.push(async () => {
  const out = "src/app/apple-icon.png";
  // iOS rounds the corners and expects breathing room, so this one keeps a
  // deliberate margin rather than matching SVG_FILL.
  const buf = await refit(180, 0.76);
  await sharp(buf)
    .flatten({ background: "#0b0e14" }) // iOS does not honour transparency here
    .png({ compressionLevel: 9, quality: 92, effort: 10 })
    .toFile(out);
  await report("apple touch icon", out, 0);
});

/*
 * Open Graph card. The spec size is 1200x630; 1698x926 was being downscaled by
 * every consumer anyway. Re-encoded as JPEG-quality PNG is wasteful for a photo-
 * like card, so this goes out as an optimised PNG at the right dimensions.
 */
jobs.push(async () => {
  const out = "public/og.png";
  const before = kb(out);
  const buf = await sharp(out)
    .resize(1200, 630, { kernel: "lanczos3", fit: "cover" })
    .png({ compressionLevel: 9, palette: true, quality: 88, effort: 10 })
    .toBuffer();
  await sharp(buf).toFile(out);
  await report("open graph card", out, before);
});

/* The 2.1 MB master is not referenced by any component; keep it as the
   large-format asset but at a sane weight. */
jobs.push(async () => {
  const out = "public/logo.png";
  const before = kb(out);
  const buf = await sharp(out)
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
    .toBuffer();
  await sharp(buf).toFile(out);
  await report("large master", out, before);
});

for (const job of jobs) await job();
console.log("\nDone. The traced 332 KB logo.svg stays as the print/large-format master.");

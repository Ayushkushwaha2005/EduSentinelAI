/*
 * SVG minifier for the brand master (Phase 10, Task 8).
 *
 * public/logo.svg is a bitmap that was auto-traced into vector: 886 paths, 137
 * near-identical fills and 46,524 coordinates carried to six decimal places. It
 * weighed 578 KB and was being served — unoptimized, priority — behind every nav
 * bar, sidebar and auth screen on the site, and again as a 578 KB favicon.
 *
 * This is a LOSSLESS-BY-EYE pass, not a redraw. It only:
 *   - rounds coordinates to 2dp (the mark renders at 24-64px; the 3rd decimal is
 *     a ten-thousandth of a pixel),
 *   - drops `opacity="1"` and `stroke="none"`, which are the defaults,
 *   - collapses whitespace between elements.
 *
 * The path topology, the fills and the viewBox are untouched, so the mark that
 * comes out is the mark that went in. Run: node scripts/optimize-svg.mjs
 */

import { readFileSync, writeFileSync, statSync } from "fs";
import path from "path";

const PRECISION = 2;

function round(n) {
  // Number() drops the trailing zeros toFixed leaves behind ("12.30" -> "12.3").
  return String(Number(Number(n).toFixed(PRECISION)));
}

function optimize(svg) {
  return (
    svg
      // Coordinates: every run of digits with a fractional part.
      .replace(/-?\d+\.\d+/g, (m) => round(m))
      // Attributes whose value is already the SVG default.
      .replace(/\s+opacity="1(\.0+)?"/g, "")
      .replace(/\s+stroke="none"/g, "")
      .replace(/\s+xml:space="preserve"/g, "")
      // Inter-element whitespace and the XML prolog (the file is served as
      // image/svg+xml; the declaration buys nothing).
      .replace(/<\?xml[^>]*\?>\s*/g, "")
      .replace(/>\s+</g, "><")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("usage: node scripts/optimize-svg.mjs <file.svg> [...]");
  process.exit(1);
}

for (const file of targets) {
  const before = statSync(file).size;
  const out = optimize(readFileSync(file, "utf8"));
  writeFileSync(file, out);
  const after = statSync(file).size;
  const saved = (((before - after) / before) * 100).toFixed(1);
  console.log(
    `${path.basename(file)}: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB (-${saved}%)`,
  );
}

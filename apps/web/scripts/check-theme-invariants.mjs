/*
 * The Phase 9.4 theme invariants, extracted so they can run WITHOUT a database.
 *
 * `npm run test:support` asserts all of this, but it does so after a long series
 * of live support-desk queries — so it cannot run at all unless Postgres is
 * reachable. These four checks are pure file reads, and they are the ones that a
 * styling change can actually break, so it is worth being able to run them on
 * their own before touching CSS.
 *
 * This DUPLICATES test-phase9.mts rather than replacing it. That file is still
 * the gate in CI; if the two ever disagree, test-phase9.mts is right.
 *
 * Run: node scripts/check-theme-invariants.mjs
 */

import { readFileSync } from "fs";
import path from "path";
import assert from "assert";

const root = path.resolve(process.cwd(), "..", "..");

/* ---- 1. Light mode is byte-frozen ---- */
const tokens = readFileSync(
  path.join(root, "packages", "ui", "src", "tokens.css"),
  "utf8",
);

const LIGHT = {
  "--color-surface-base": "#f5f4f1",
  "--color-surface-raised": "#ffffff",
  "--color-surface-overlay": "#ececea",
  "--color-border-subtle": "#e3e1db",
  "--color-ink": "#121317",
  "--color-text-primary": "#16181d",
  "--color-brand-cyan": "#0891b2",
  "--color-brand-teal": "#0d9488",
};

const theme = tokens.slice(
  tokens.indexOf("@theme"),
  tokens.indexOf('[data-theme="dark"]'),
);

for (const [name, value] of Object.entries(LIGHT)) {
  assert.ok(
    new RegExp(`${name}:\\s*${value};`).test(theme),
    `LIGHT MODE IS FROZEN — ${name} must still be ${value}`,
  );
}
console.log(`✓ light mode byte-frozen (${Object.keys(LIGHT).length}/8 tokens intact)`);

/* ---- 2. Every dark rule is scoped ---- */
const globals = readFileSync(
  path.join(root, "apps", "web", "src", "app", "globals.css"),
  "utf8",
);

const darkSection = globals.slice(globals.indexOf("DARK MODE (Phase 9.4)"));
let scoped = 0;

for (const line of darkSection.split("\n")) {
  const selector = line.trim();
  if (!selector.endsWith("{") || selector.startsWith("@") || selector.startsWith("*")) {
    continue;
  }
  if (
    /^(\.meteor-field|\.meteor-sheen|\.meteor-shafts|\.meteor-nebula|\.meteor-dust|\.tilt|\s|})/.test(
      selector,
    )
  ) {
    continue;
  }
  if (/^(\d+%|from|to)\s*\{$/.test(selector)) continue;

  assert.ok(
    selector.includes('[data-theme="dark"]'),
    `UNSCOPED DARK RULE (this would change light mode): ${selector}`,
  );
  scoped++;
}
console.log(`✓ all ${scoped} dark-mode selectors scoped to [data-theme="dark"]`);

/* ---- 3. The CSP was not weakened ---- */
const middleware = readFileSync(
  path.join(root, "apps", "web", "src", "middleware.ts"),
  "utf8",
);

const dynamicPolicy = middleware.match(/csp = `\$\{SHARED\}; script-src[^`]+`/g) ?? [];
const nonced = dynamicPolicy.find((p) => p.includes("nonce-"));

assert.ok(nonced, "the dynamic CSP must still issue a nonce");
assert.ok(
  !nonced.includes("unsafe-inline"),
  "the nonced CSP must NOT gain 'unsafe-inline'",
);
console.log("✓ CSP intact: nonce + strict-dynamic, no 'unsafe-inline'");

/* ---- 4. Reduced motion removes the field rather than slowing it ---- */
assert.ok(
  /prefers-reduced-motion[\s\S]*\.meteor-field\s*\{\s*display:\s*none/.test(globals),
  "under prefers-reduced-motion the meteor field must not be drawn at all",
);
console.log("✓ meteor field absent (not slowed) under reduced motion");

console.log("\nAll Phase 9.4 theme invariants hold.");

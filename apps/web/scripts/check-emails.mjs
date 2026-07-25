/*
 * The single-source-of-truth check for organisation email addresses
 * (Phase 10, Task 12).
 *
 * WHAT IT ENFORCES: no file under src/ may contain a literal @edusentinel.ai
 * address. They all come from src/lib/org-email.ts.
 *
 * WHY IT IS A CHECK AND NOT A CONVENTION: before this, `hello@` and `security@`
 * were typed by hand into eight components and the From: address was a default
 * buried in a `??` expression in two different modules. Nobody did that on
 * purpose — it is just what happens to a string that is easier to type than to
 * import. A convention would decay the same way; a failing build does not.
 *
 * WHAT IT DELIBERATELY DOES NOT COVER:
 *   - content/**.mdx — repo-authored prose, PR-reviewed, and MDX cannot import a
 *     TypeScript constant. Those documents name `security@` in running text,
 *     which is a confirmed address.
 *   - public/.well-known/security.txt — a static file consumed by scanners, not
 *     by our code, and required by RFC 9116 to contain a literal address.
 *   - .env.example — documentation of a variable's shape.
 *
 * Run: node scripts/check-emails.mjs
 */

import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

const SRC = path.resolve(process.cwd(), "src");
const REGISTRY = path.join("lib", "org-email.ts");

/* The literal we are hunting for: any local-part at the org domain. */
const ADDRESS = /[a-zA-Z0-9._%+-]+@edusentinel\.ai/g;

const offences = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) continue;

    // The registry is the one place that is allowed to spell them out.
    if (full.endsWith(REGISTRY)) continue;

    const source = readFileSync(full, "utf8");
    source.split("\n").forEach((line, i) => {
      const found = line.match(ADDRESS);
      if (found) {
        offences.push({
          file: path.relative(process.cwd(), full),
          line: i + 1,
          text: found.join(", "),
        });
      }
    });
  }
}

walk(SRC);

if (offences.length > 0) {
  console.error(
    "\n✗ Hard-coded organisation email addresses found.\n" +
      "  Import them from src/lib/org-email.ts instead — that file is the only\n" +
      "  place an address is written, so changing where mail goes is one edit.\n",
  );
  for (const o of offences) {
    console.error(`  ${o.file}:${o.line}  ${o.text}`);
  }
  console.error("");
  process.exit(1);
}

console.log(
  "✓ no hard-coded @edusentinel.ai addresses in src/ — all routed through lib/org-email.ts",
);

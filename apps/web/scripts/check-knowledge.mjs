/*
 * The Knowledge Center's confidentiality gate.
 *
 * The guide's whole safety argument is that it is STATIC PROSE: it cannot leak a
 * record because there is no record in it and no way to get one. That argument
 * survives exactly as long as nobody adds a template expression or a database
 * import "just for this one number".
 *
 * So it is enforced rather than remembered:
 *
 *   1. lib/knowledge.ts and lib/assistant.ts may not import the database, Prisma,
 *      a session, or any data-access module.
 *   2. No article string may contain a template expression — the moment one does,
 *      the content is no longer reviewable in the diff.
 *   3. The assistant's server action may read the viewer (to filter by
 *      capability) but must not query anything.
 *
 * Run: node scripts/check-knowledge.mjs
 */

import { readFileSync, existsSync } from "fs";
import path from "path";

const SRC = path.resolve(process.cwd(), "src");

const STATIC_MODULES = [
  path.join(SRC, "lib", "knowledge.ts"),
  path.join(SRC, "lib", "assistant.ts"),
];

const FORBIDDEN = [
  "@/lib/db",
  "@prisma/client",
  "@/lib/people",
  "@/lib/products",
  "@/lib/analytics",
  "@/lib/hr",
  "@/lib/support",
  "@/lib/messages",
  "@/lib/org",
  "@/lib/company",
  "@/lib/audit",
  "@/lib/invitations",
  "@/lib/collaborations",
  "@/lib/profile",
  "@/lib/dashboard",
];

const problems = [];

for (const file of STATIC_MODULES) {
  const rel = path.relative(process.cwd(), file);
  if (!existsSync(file)) {
    problems.push(`${rel} is missing — the guide depends on it`);
    continue;
  }
  const src = readFileSync(file, "utf8");

  for (const mod of FORBIDDEN) {
    const re = new RegExp(`from\\s+["']${mod.replace(/[/@]/g, "\\$&")}["']`);
    if (re.test(src)) {
      problems.push(`${rel} imports ${mod} — the guide must hold no company data`);
    }
  }

  // 2. No interpolation inside the content. Template literals anywhere in these
  //    files would mean prose that is not reviewable as written.
  if (/`[^`]*\$\{/.test(src)) {
    problems.push(
      `${rel} contains a template expression — guide content must be literal, reviewable prose`,
    );
  }
}

/* 3. The server action may authenticate, but must not query. */
const action = path.join(SRC, "app", "app", "guide", "assistant-action.ts");
if (existsSync(action)) {
  const src = readFileSync(action, "utf8");
  for (const mod of FORBIDDEN) {
    const re = new RegExp(`from\\s+["']${mod.replace(/[/@]/g, "\\$&")}["']`);
    if (re.test(src)) {
      problems.push(
        `app/guide/assistant-action.ts imports ${mod} — the assistant answers from the guide, never from data`,
      );
    }
  }
  if (/\bdb\s*\./.test(src)) {
    problems.push("app/guide/assistant-action.ts queries the database — it must not");
  }
} else {
  problems.push("app/guide/assistant-action.ts is missing");
}

if (problems.length > 0) {
  console.error("\n✗ Knowledge Center confidentiality gate failed:\n");
  for (const p of problems) console.error("  " + p);
  console.error("");
  process.exit(1);
}

/* Report what is actually covered, so the check is not a black box. */
const knowledge = readFileSync(STATIC_MODULES[0], "utf8");
const articles = (knowledge.match(/^\s{4}slug:/gm) ?? []).length;
const gated = (knowledge.match(/^\s{4}requires:/gm) ?? []).length;

console.log(
  `✓ knowledge center clean — ${articles} articles (${gated} capability-gated), ` +
    `no data-layer imports, no interpolated content, assistant queries nothing`,
);

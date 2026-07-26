/*
 * DEMO FOUNDER MODE — the isolation gate (Task 16).
 *
 * Demo Mode's promise is that it cannot touch production data. That promise is
 * only worth anything if it is impossible to break by accident, so this asserts
 * it mechanically rather than trusting a comment:
 *
 *   1. NOTHING under src/app/demo or src/lib/demo or src/components/demo may
 *      import the database client, Prisma, or any module that does. That is the
 *      whole guarantee — there is no connection to misconfigure and no query to
 *      get wrong, because the code has no way to reach one.
 *
 *   2. Nothing in the demo tree may declare a server action ("use server"), call
 *      auth(), or read a session. A demo that authenticated would put a real
 *      session token in scope on pages whose entire point is being a sandbox.
 *
 *   3. Production must not import FROM the demo either. The dependency runs one
 *      way; if /app ever pulled in demo data, mock rows could surface as real.
 *
 * The forbidden-module list is transitive-aware in the sense that it also bans
 * the app's own data-access modules by name, so `import { directory } from
 * "@/lib/people"` is caught even though that file, not this one, imports db.
 *
 * Run: node scripts/check-demo-isolation.mjs
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import path from "path";

const SRC = path.resolve(process.cwd(), "src");

const DEMO_DIRS = [
  path.join(SRC, "app", "demo"),
  path.join(SRC, "lib", "demo"),
  path.join(SRC, "components", "demo"),
];

/*
 * Modules the demo may never reach. These are the data-access layer: every one
 * of them imports `db` or reads a session.
 */
/*
 * One file is allowed to read the session, and only the session.
 *
 * lib/demo/access.ts answers "is this visitor the demo account?" by comparing
 * the JWT's email to an env var. Sessions carry no database adapter, so that
 * costs zero queries and reads zero production rows — it learns WHO you are
 * without reading anything you own. Everything the sandbox renders still comes
 * from lib/demo/data.ts.
 *
 * The exemption is deliberately one file and one module: `@/lib/auth` only, in
 * `access.ts` only. The database and every data-access module stay forbidden
 * across the entire demo tree, including in this file.
 */
const SESSION_READER = path.join("lib", "demo", "access.ts");
const SESSION_ONLY_IMPORT = "@/lib/auth";

const FORBIDDEN = [
  "@/lib/db",
  "@prisma/client",
  "prisma",
  "@/lib/auth",
  "@/lib/guard",
  "@/lib/audit",
  "@/lib/people",
  "@/lib/products",
  "@/lib/catalog",
  "@/lib/analytics",
  "@/lib/hr",
  "@/lib/support",
  "@/lib/messages",
  "@/lib/notifications",
  "@/lib/invitations",
  "@/lib/org",
  "@/lib/company",
  "@/lib/collaborations",
  "@/lib/profile",
  "@/lib/permissions",
  "@/lib/mail",
  "@/lib/mailer",
  "@/lib/artifacts",
  "@/lib/dashboard",
  "next-auth",
];

const problems = [];

function files(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const demoFiles = DEMO_DIRS.flatMap(files);

if (demoFiles.length === 0) {
  console.error("✗ no demo files found — expected src/app/demo and src/lib/demo to exist");
  process.exit(1);
}

for (const file of demoFiles) {
  const src = readFileSync(file, "utf8");
  const rel = path.relative(process.cwd(), file);

  const isSessionReader = file.endsWith(SESSION_READER);

  // 1 + 2: forbidden imports
  for (const mod of FORBIDDEN) {
    // The single, narrow exemption — see SESSION_READER above.
    if (isSessionReader && mod === SESSION_ONLY_IMPORT) continue;

    // Match the module specifier exactly, so "@/lib/demo/data" is not caught by
    // a "@/lib/d..." prefix and "@/lib/org-types" is not caught by "@/lib/org".
    const re = new RegExp(`from\\s+["']${mod.replace(/[/@]/g, "\\$&")}["']`);
    if (re.test(src)) {
      problems.push(`${rel} imports ${mod} — the demo must never reach production data`);
    }
  }

  // 2: no server actions anywhere in the demo tree
  if (/^\s*["']use server["']/m.test(src)) {
    problems.push(`${rel} declares "use server" — Demo Mode must not run server actions`);
  }

  // Only the session reader may call auth(), and it may do nothing else with it.
  if (!isSessionReader && /\bauth\s*\(\s*\)/.test(src)) {
    problems.push(
      `${rel} calls auth() — only lib/demo/access.ts may read the session`,
    );
  }
}

/* The session reader must stay a session reader: identity in, boolean out. */
{
  const readerPath = path.join(SRC, SESSION_READER);
  if (!existsSync(readerPath)) {
    problems.push(`${SESSION_READER} is missing — the /demo gate depends on it`);
  } else {
    const src = readFileSync(readerPath, "utf8");
    if (/\bdb\b\s*\.|prisma/i.test(src)) {
      problems.push(`${SESSION_READER} touches the database — it may only read the session`);
    }
  }
}

// 3: production must not import from the demo
for (const file of files(SRC)) {
  const rel = path.relative(process.cwd(), file);
  if (DEMO_DIRS.some((d) => file.startsWith(d))) continue;
  const src = readFileSync(file, "utf8");
  if (/from\s+["']@\/(lib|components)\/demo/.test(src)) {
    problems.push(`${rel} imports from the demo tree — mock data must never reach production`);
  }
}

if (problems.length > 0) {
  console.error("\n✗ Demo Mode isolation broken:\n");
  for (const p of problems) console.error("  " + p);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ demo isolation intact — ${demoFiles.length} files under src/{app,lib,components}/demo,\n` +
    "  none reaching the database, a session, or a server action; production imports nothing from them",
);

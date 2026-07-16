// Bring the production database up to date on Vercel — migrate, then seed once.
//
// Runs from `prebuild` (not postinstall) so it executes on EVERY build, even
// when Vercel restores the install cache and skips postinstall. That matters
// because Neon's serverless compute auto-suspends when idle: this step's first
// connection wakes it, so `next build`'s page-data queries reach a live database
// instead of failing with "Can't reach database server". Running it under the
// project's Root Directory (apps/web) also keeps Next.js output detection intact.
//
// Locally and in CI (`VERCEL` unset) this is a no-op, so a normal build never
// touches a database.
import { execSync } from "node:child_process";

if (!process.env.VERCEL) {
  console.log("[vercel-db] not on Vercel — skipping migrate/seed");
  process.exit(0);
}

// Schema changes and seed writes go over the DIRECT (unpooled) connection; the
// pooled DATABASE_URL is for the serverless runtime only.
const direct =
  process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
const env = direct ? { ...process.env, DATABASE_URL: direct } : process.env;

// `migrate deploy` is also our "wake Neon" step. A suspended compute can miss the
// first connection's timeout while it cold-starts, so retry a few times.
let migrated = false;
for (let attempt = 1; attempt <= 4 && !migrated; attempt++) {
  try {
    console.log(`[vercel-db] applying migrations (attempt ${attempt})…`);
    execSync("prisma migrate deploy", { stdio: "inherit", env });
    migrated = true;
  } catch (e) {
    console.log(`[vercel-db] migrate attempt ${attempt} failed: ${e.message}`);
    if (attempt < 4) await new Promise((r) => setTimeout(r, 4000));
  }
}
if (!migrated) {
  console.error("[vercel-db] could not apply migrations after retries");
  process.exit(1);
}

// Seed only when the database is empty, so this is a one-time cost on the first
// deploy against a fresh database and a no-op on every deploy after. The seeds are
// themselves idempotent; the emptiness check just avoids re-running them.
//   - seed-catalog: the product catalogue (drives /products, home grid, sitemap)
//   - seed-org:     the org roster + company profile (drives /company, footer)
//   - seed-hr:      leave types (configuration)
//   - seed:         the Founder account — self-skips unless FOUNDER_EMAIL /
//                   FOUNDER_PASSWORD are set in the Vercel environment.
let empty = false;
try {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    empty = (await db.product.count()) === 0;
  } finally {
    await db.$disconnect();
  }
} catch (e) {
  console.log("[vercel-db] could not check catalogue count:", e.message);
}

if (!empty) {
  console.log("[vercel-db] database already has data — skipping seed");
  process.exit(0);
}

console.log("[vercel-db] empty database — seeding initial data…");
for (const script of ["seed-catalog.mjs", "seed-org.mjs", "seed-hr.mjs", "seed.mjs"]) {
  try {
    execSync(`node prisma/${script}`, { stdio: "inherit", env });
  } catch (e) {
    // Non-fatal: a seed failure must never fail the production build.
    console.log(`[vercel-db] seed ${script} did not complete: ${e.message}`);
  }
}

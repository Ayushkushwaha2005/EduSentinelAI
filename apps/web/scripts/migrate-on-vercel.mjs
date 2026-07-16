// Bring the production database up to date on Vercel — migrate, then seed once.
//
// Runs from `postinstall`, so on Vercel the schema is created and the public
// catalogue/org data is populated during install, before `next build` collects
// page data. Doing it here (rather than overriding vercel.json `buildCommand`)
// keeps Vercel's monorepo Next.js output detection intact.
//
// Locally and in CI (`VERCEL` unset) this is a no-op, so `npm install` never
// touches a database and offline installs keep working.
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

console.log("[vercel-db] applying migrations…");
execSync("prisma migrate deploy", { stdio: "inherit", env });

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

// Apply pending Prisma migrations, but ONLY on Vercel.
//
// Runs from `postinstall`, so on Vercel the database schema is brought up to date
// during the install phase — before `next build` collects page data and queries
// the catalogue. Doing it here (rather than by overriding vercel.json
// `buildCommand`) keeps Vercel's monorepo Next.js output detection intact.
//
// Locally and in CI (`VERCEL` unset) this is a no-op, so `npm install` never
// touches a database and offline installs keep working. `migrate deploy` is
// idempotent — when the schema is already current it simply reports nothing to do.
import { execSync } from "node:child_process";

if (!process.env.VERCEL) {
  console.log("[migrate-on-vercel] not on Vercel — skipping prisma migrate deploy");
  process.exit(0);
}

console.log("[migrate-on-vercel] applying database migrations…");
execSync("prisma migrate deploy", { stdio: "inherit" });

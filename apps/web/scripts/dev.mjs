/*
 * `npm run dev` — the whole local environment, in one command.
 *
 * Starts a real PostgreSQL if you do not already have one, brings the schema up
 * to date, bootstraps a founder account on first run, and then runs `next dev`.
 * Shuts the database down again when you stop the server.
 *
 * IF YOU ALREADY HAVE A DATABASE — set DATABASE_URL to any `postgres://` or
 * `postgresql://` connection string (Neon, a local install, a container) and
 * this script uses it and never starts the embedded one. Nothing is imposed on
 * a developer who has already made that choice.
 *
 * See scripts/local-db.mjs for why local development runs real PostgreSQL
 * rather than the SQLite file the .env used to point at.
 */

import { spawn, spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isPostgresUrl, startLocalDb, LOCAL_DB_URL, LOCAL_DB_PORT } from "./local-db.mjs";

const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Read .env by hand: we need to know what DATABASE_URL *would* be before Next
   or Prisma load it, so we can decide whether to start a database at all. */
function envFileValue(key) {
  const file = path.join(WEB_DIR, ".env");
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split("\n")
    .find((l) => new RegExp(`^\\s*${key}\\s*=`).test(l));
  if (!line) return undefined;
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

function run(cmd, args, env, { capture = false } = {}) {
  return spawnSync(cmd, args, {
    cwd: WEB_DIR,
    shell: true,
    env,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
  });
}

const existing = process.env.DATABASE_URL ?? envFileValue("DATABASE_URL");

/*
 * "Points at OUR local cluster" is not the same as "is an external database the
 * developer runs themselves", and conflating the two is a trap: .env ships
 * pointing at localhost:54329, so treating any valid postgres URL as external
 * would skip starting the very server that URL describes, and `prisma db push`
 * would fail with P1001 "can't reach database server". Recognise our own port
 * and start the cluster for it.
 */
function isOurLocalDb(url) {
  if (!isPostgresUrl(url)) return false;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    return (
      Number(u.port) === LOCAL_DB_PORT &&
      (host === "localhost" || host === "127.0.0.1" || host === "::1")
    );
  } catch {
    return false;
  }
}

const usingOwnDb = isPostgresUrl(existing) && !isOurLocalDb(existing);

console.log("\nEduSentinel — local development\n");

let pg = null;
let databaseUrl;

if (usingOwnDb) {
  databaseUrl = existing;
  console.log("  database: using the DATABASE_URL you configured");
} else {
  if (existing && !isPostgresUrl(existing)) {
    // The exact situation this script was written for. Name it, so the reader
    // understands what happened instead of wondering why a database appeared.
    console.log(
      `  note: DATABASE_URL in apps/web/.env is "${existing}", which this schema\n` +
        "        cannot use — it is a PostgreSQL schema. Starting a local PostgreSQL\n" +
        "        instead and using that for this session.\n",
    );
  }
  try {
    pg = await startLocalDb();
  } catch (err) {
    console.error(`\n  Could not start the local database.\n  ${err.message}\n`);
    process.exit(1);
  }
  databaseUrl = LOCAL_DB_URL;
}

/*
 * The environment every child gets. Setting DATABASE_URL here takes precedence
 * over the .env file for both Prisma and Next, so a stale value in .env cannot
 * reintroduce the original error.
 */
const ENV = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DATABASE_URL_UNPOOLED: databaseUrl,
  APP_URL: process.env.APP_URL ?? envFileValue("APP_URL") ?? "http://localhost:3000",
};

/* ---- schema ---- */
console.log("  schema: syncing…");
const push = run("npx", ["prisma", "db", "push", "--skip-generate"], ENV, { capture: true });
if (push.status !== 0) {
  console.error("\n  prisma db push failed:\n");
  console.error(((push.stdout ?? "") + (push.stderr ?? "")).trim());
  if (pg) await pg.stop();
  process.exit(1);
}
console.log("  schema: up to date");

/* ---- founder bootstrap ---- */
/*
 * Only on an empty database. Re-seeding an existing one would be a surprise, and
 * the seed script itself is idempotent but noisy.
 */
const FOUNDER = {
  FOUNDER_EMAIL: process.env.FOUNDER_EMAIL ?? envFileValue("FOUNDER_EMAIL") ?? "founder@edusentinel.ai",
  FOUNDER_NAME: process.env.FOUNDER_NAME ?? envFileValue("FOUNDER_NAME") ?? "Founder",
  FOUNDER_PASSWORD: process.env.FOUNDER_PASSWORD ?? envFileValue("FOUNDER_PASSWORD") ?? "local-dev-founder-pw",
};

const count = run(
  "npx",
  ["tsx", "-e", "import{PrismaClient}from'@prisma/client';const d=new PrismaClient();console.log(await d.user.count());await d.$disconnect()"],
  ENV,
  { capture: true },
);
const userCount = Number((count.stdout ?? "").trim().split("\n").pop());

if (Number.isFinite(userCount) && userCount === 0) {
  console.log("  seed: empty database — creating the founder account…");
  const seed = run("node", ["prisma/seed.mjs"], { ...ENV, ...FOUNDER }, { capture: true });
  if (seed.status === 0) {
    run("node", ["prisma/seed-catalog.mjs"], ENV, { capture: true });
    run("node", ["prisma/seed-org.mjs"], ENV, { capture: true });
    console.log(
      `\n  ┌─ Sign in with ───────────────────────────────────────────\n` +
        `  │  email:    ${FOUNDER.FOUNDER_EMAIL}\n` +
        `  │  password: ${FOUNDER.FOUNDER_PASSWORD}\n` +
        `  │  (local only — change FOUNDER_* in apps/web/.env)\n` +
        `  └──────────────────────────────────────────────────────────\n`,
    );
  } else {
    console.log("  seed: skipped — " + ((seed.stdout ?? "") + (seed.stderr ?? "")).trim().split("\n")[0]);
  }
} else {
  console.log(`  seed: ${userCount} account(s) already present — not reseeding`);
}

/* ---- next dev ---- */
console.log("\n  starting Next.js…\n");
const next = spawn("npx", ["next", "dev"], { cwd: WEB_DIR, shell: true, env: ENV, stdio: "inherit" });

let shuttingDown = false;
async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  try { next.kill(); } catch {}
  if (pg) {
    console.log("\n  stopping local database…");
    try { await pg.stop(); } catch {}
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
next.on("exit", (code) => shutdown(code ?? 0));

/*
 * A real PostgreSQL for local development, with no setup.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 *
 * `prisma/schema.prisma` declares `provider = "postgresql"`, because production
 * runs on Neon. But `apps/web/.env` still carried `DATABASE_URL="file:./dev.db"`
 * from before that migration, so every local request died with:
 *
 *     PrismaClientInitializationError
 *     Error validating datasource `db`: the URL must start with the protocol
 *     `postgresql://` or `postgres://`
 *
 * The fix is not to point the schema back at SQLite — developing against a
 * different database engine than you deploy to is how subtle differences
 * (case sensitivity, transactions, `citext`, JSON operators) reach production
 * undetected. The fix is to give local development a real PostgreSQL.
 *
 * `embedded-postgres` downloads the official PostgreSQL binaries and runs them
 * as a normal child process. No Docker, no system install, no service to
 * configure, no account, no API key, nothing to pay for.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The cluster is PERSISTENT: it lives in apps/web/.local-db and survives
 * restarts, so your local accounts, products and audit history are still there
 * tomorrow. Delete that directory to start clean (or run `npm run db:local:reset`).
 */

import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const LOCAL_DB_DIR = path.join(WEB_DIR, ".local-db");
export const LOCAL_DB_PORT = Number(process.env.LOCAL_DB_PORT ?? 54329);
export const LOCAL_DB_NAME = "edusentinel";
export const LOCAL_DB_URL = `postgresql://postgres:postgres@localhost:${LOCAL_DB_PORT}/${LOCAL_DB_NAME}`;

/** A DATABASE_URL Prisma will actually accept for this schema. */
export function isPostgresUrl(url) {
  return typeof url === "string" && /^postgres(ql)?:\/\//.test(url.trim());
}

/**
 * Start the local cluster, creating it on first run.
 *
 * Returns the handle so the caller can stop it again — the dev server shuts it
 * down on exit so you are not left with an orphaned postgres process holding a
 * port.
 */
export async function startLocalDb({ quiet = false } = {}) {
  const log = (m) => !quiet && console.log(m);
  const firstRun = !existsSync(LOCAL_DB_DIR);

  if (firstRun) {
    mkdirSync(LOCAL_DB_DIR, { recursive: true });
    log("  local database: first run — downloading and initialising PostgreSQL…");
  }

  const pg = new EmbeddedPostgres({
    databaseDir: LOCAL_DB_DIR,
    user: "postgres",
    password: "postgres",
    port: LOCAL_DB_PORT,
    // Keep the data between runs. This is a development database, not a
    // throwaway fixture — losing the founder account on every restart would
    // make it useless.
    persistent: true,
  });

  if (firstRun) await pg.initialise();

  try {
    await pg.start();
  } catch (err) {
    // The overwhelmingly common cause is a previous run that was killed without
    // shutting the cluster down. Say so plainly rather than surfacing a libpq
    // error the reader has to decode.
    const msg = String(err?.message ?? err);
    if (/already|lock|in use|EADDRINUSE/i.test(msg)) {
      throw new Error(
        `Local PostgreSQL is already running on port ${LOCAL_DB_PORT}, or a previous ` +
          `run did not shut down cleanly.\n` +
          `  Fix: stop the other process, or delete ${path.relative(process.cwd(), LOCAL_DB_DIR)} ` +
          `and let it rebuild.\n  Original error: ${msg}`,
      );
    }
    throw err;
  }

  // createDatabase throws if it already exists; on every run after the first
  // that is the expected outcome, not a problem.
  try {
    await pg.createDatabase(LOCAL_DB_NAME);
    log(`  local database: created "${LOCAL_DB_NAME}"`);
  } catch {
    /* already there */
  }

  log(`  local database: ready on port ${LOCAL_DB_PORT}`);
  return pg;
}

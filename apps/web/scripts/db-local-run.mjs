/*
 * Run the local PostgreSQL on its own, without the dev server.
 *
 * Useful when you want to point something else at it — the phase invariant
 * suites, a seed script, `prisma studio`, or a psql client. It prints the URL
 * and stays in the foreground until you stop it with Ctrl-C.
 *
 *   npm run db:local
 *   # then, in another terminal:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:54329/edusentinel" npm run test:permissions
 */

import { describeError, startLocalDb, LOCAL_DB_URL } from "./local-db.mjs";

let pg;
try {
  pg = await startLocalDb();
} catch (err) {
  console.error(`\n  Could not start the local database.\n\n  ${describeError(err)}\n`);
  process.exit(1);
}

console.log(`\n  DATABASE_URL="${LOCAL_DB_URL}"\n`);
if (pg.reused) {
  console.log("  This server was already running — Ctrl-C here will leave it up.\n");
} else {
  console.log("  Ctrl-C to stop.\n");
}

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  if (pg.reused) {
    console.log("\n  leaving the database running (it was already up).");
    process.exit(0);
  }
  console.log("\n  stopping…");
  try {
    await pg.stop();
  } catch {
    /* already down */
  }
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

// Hold the process open.
setInterval(() => {}, 1 << 30);

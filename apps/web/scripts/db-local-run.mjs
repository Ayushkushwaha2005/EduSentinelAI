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

import { startLocalDb, LOCAL_DB_URL } from "./local-db.mjs";

const pg = await startLocalDb();

console.log(`\n  DATABASE_URL="${LOCAL_DB_URL}"\n`);
console.log("  Ctrl-C to stop.\n");

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
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

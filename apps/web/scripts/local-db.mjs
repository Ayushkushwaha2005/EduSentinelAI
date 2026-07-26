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
import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const LOCAL_DB_DIR = path.join(WEB_DIR, ".local-db");
export const LOCAL_DB_PORT = Number(process.env.LOCAL_DB_PORT ?? 54329);
export const LOCAL_DB_NAME = "edusentinel";
export const LOCAL_DB_URL = `postgresql://postgres:postgres@localhost:${LOCAL_DB_PORT}/${LOCAL_DB_NAME}`;
export const PID_FILE = path.join(LOCAL_DB_DIR, "postmaster.pid");

/** A DATABASE_URL Prisma will actually accept for this schema. */
export function isPostgresUrl(url) {
  return typeof url === "string" && /^postgres(ql)?:\/\//.test(url.trim());
}

/* ────────────────────────────────────────────────────────────────────────────
 * Rendering an unknown thrown value.
 *
 * `embedded-postgres` rejects its start promise with NO ARGUMENT when the
 * postmaster exits early (dist/index.js: `this.process.on('close', () =>
 * reject())`). So `err` here is genuinely `undefined`, and any error path that
 * reaches for `err.message` crashes *while reporting the original failure* —
 * which is how a recoverable "database already running" turned into
 * `TypeError: Cannot read properties of undefined (reading 'message')`.
 *
 * Nothing in this file may assume a thrown value is an Error.
 * ──────────────────────────────────────────────────────────────────────────── */
export function describeError(err) {
  try {
    if (err instanceof Error) return err.stack ? err.message : String(err);
    if (err === undefined) return "(the underlying library threw no error value)";
    if (err === null) return "(null)";
    if (typeof err === "string") return err || "(empty message)";
    if (typeof err === "object") {
      const m = err.message ?? err.error ?? err.code;
      if (typeof m === "string" && m) return m;
      return JSON.stringify(err);
    }
    return String(err);
  } catch {
    // describeError itself must never be the thing that throws.
    return "(unprintable error)";
  }
}

/* ─────────────────────────────────────────────────────── liveness probes ──── */

/** Is `pid` a live process? `signal 0` tests without signalling. */
function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: it exists, we simply may not signal it. That still counts as alive.
    return err?.code === "EPERM";
  }
}

/**
 * Parse PostgreSQL's postmaster.pid.
 *
 * Line 1 is the PID, line 2 the data directory, line 4 the port. Anything we
 * cannot parse is reported as absent rather than guessed at.
 */
export function readPostmasterPid() {
  if (!existsSync(PID_FILE)) return null;
  try {
    const lines = readFileSync(PID_FILE, "utf8").split("\n");
    const pid = Number((lines[0] ?? "").trim());
    const dataDir = (lines[1] ?? "").trim();
    const port = Number((lines[3] ?? "").trim());
    return {
      pid: Number.isInteger(pid) && pid > 0 ? pid : null,
      dataDir,
      port: Number.isFinite(port) ? port : null,
      /* Is this file describing OUR cluster? Compared case-insensitively with
         separators normalised, because postgres writes the path with forward
         slashes on Windows while path.join gives backslashes. */
      isOurs:
        dataDir.replace(/[\\/]+/g, "/").toLowerCase() ===
        LOCAL_DB_DIR.replace(/[\\/]+/g, "/").toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Ask whatever is on the port whether it speaks PostgreSQL.
 *
 * An SSLRequest (int32 length 8, int32 code 80877103) is the cheapest legal
 * thing you can say to a postmaster before authenticating; it answers with a
 * single byte, 'S' or 'N'. A TCP connect alone would only prove *something* is
 * listening — and starting a postmaster against a port held by an unrelated
 * process, or pushing our schema into a stranger's cluster, are both worse than
 * saying so.
 *
 * Zero dependencies: this is a raw socket and eight bytes.
 */
export function probePostgres(port = LOCAL_DB_PORT, host = "127.0.0.1", timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      resolve(result);
    };

    /* Every terminal outcome must settle this promise. A listener that accepts
       the connection and hangs up without replying is a real case (any
       non-PostgreSQL service will do it), and leaving `close`/`end` unhandled
       meant the probe never resolved — the caller then waited forever and node
       exited silently with status 0, which is a worse failure than the one this
       function exists to diagnose. `connected` distinguishes "nothing there"
       from "something there that would not talk to us". */
    let connected = false;

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => done({ listening: connected, postgres: false }));
    socket.once("error", () => done({ listening: false, postgres: false }));
    socket.once("end", () => done({ listening: connected, postgres: false }));
    socket.once("close", () => done({ listening: connected, postgres: false }));

    socket.connect(port, host, () => {
      connected = true;
      const packet = Buffer.alloc(8);
      packet.writeInt32BE(8, 0);
      packet.writeInt32BE(80877103, 4);
      socket.write(packet);
    });

    socket.once("data", (chunk) => {
      const reply = chunk[0];
      // 0x53 'S' = SSL available, 0x4e 'N' = not available. Either proves a
      // postmaster answered. 0x45 'E' is an error response — also PostgreSQL.
      done({ listening: true, postgres: reply === 0x53 || reply === 0x4e || reply === 0x45 });
    });
  });
}

/**
 * What is the state of the local cluster right now?
 *
 * Two independent signals — is anything answering on the port, and what does
 * the pid file claim — because either one alone is ambiguous:
 *   - a pid file with no listener is the classic unclean-shutdown leftover;
 *   - a listener with no pid file is something that is not ours.
 */
export async function inspectLocalDb() {
  const { listening, postgres } = await probePostgres();
  const pidFile = readPostmasterPid();
  return {
    listening,
    postgres,
    pidFile,
    pidAlive: pidFile?.pid ? isProcessAlive(pidFile.pid) : false,
  };
}

/** A handle for a server we did NOT start, and therefore must not stop. */
function adoptedHandle(pid) {
  return {
    reused: true,
    pid,
    // Deliberately inert. Another dev session (or a deliberate `npm run
    // db:local`) owns this postmaster; stopping it here would pull the database
    // out from under it when this process happens to exit first.
    async stop() {},
  };
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

  /*
   * ── Look before spawning ──────────────────────────────────────────────────
   *
   * This used to go straight to pg.start(), which spawns `postgres -D .local-db`
   * unconditionally. If a postmaster was already up, the new one found the lock
   * file, printed
   *
   *     FATAL: lock file "postmaster.pid" already exists
   *     HINT:  Is another postmaster (PID nnnnn) running…
   *
   * and exited — correct behaviour from PostgreSQL, fatal to us, and entirely
   * avoidable: a running cluster is the thing we wanted, not an obstacle.
   */
  if (!firstRun) {
    const state = await inspectLocalDb();

    if (state.postgres) {
      const pid = state.pidFile?.pid ?? null;

      /* Something is serving our port. Only adopt it if the pid file confirms
         it is OUR data directory — pushing this schema into a cluster we did
         not recognise would be a far worse outcome than refusing to start. */
      if (state.pidFile?.isOurs && state.pidAlive) {
        log(
          `  local database: already running on port ${LOCAL_DB_PORT}` +
            (pid ? ` (PID ${pid})` : "") + " — reusing it",
        );
        return adoptedHandle(pid);
      }

      throw new Error(
        `Port ${LOCAL_DB_PORT} is already serving PostgreSQL, but it is not the cluster in\n` +
          `  ${path.relative(process.cwd(), LOCAL_DB_DIR)}` +
          (state.pidFile
            ? `\n  (postmaster.pid names ${state.pidFile.dataDir || "an unreadable path"}` +
              `${state.pidFile.pid ? `, PID ${state.pidFile.pid}` : ""}${state.pidAlive ? "" : ", not running"})`
            : "\n  (there is no postmaster.pid here at all)") +
          `\n\n  Refusing to run the schema against a database this script does not own.\n` +
          `  Fix: stop whatever holds port ${LOCAL_DB_PORT}, or set LOCAL_DB_PORT to a free port.`,
      );
    }

    if (state.listening) {
      throw new Error(
        `Port ${LOCAL_DB_PORT} is in use by something that is not PostgreSQL.\n` +
          `  Fix: stop it, or set LOCAL_DB_PORT to a free port.`,
      );
    }

    /*
     * Nothing is listening. If a pid file survives, the previous run was killed
     * without a clean shutdown. Removing it is exactly what the PostgreSQL
     * manual prescribes once you have established no postmaster is running —
     * and we have established it twice over: the port is silent AND the PID in
     * the file is dead. Both guards, or we leave the file alone and say why.
     */
    if (state.pidFile) {
      if (state.pidAlive) {
        throw new Error(
          `postmaster.pid names PID ${state.pidFile.pid}, which is still running, but nothing\n` +
            `  is answering on port ${LOCAL_DB_PORT}. The server may still be starting up, or that\n` +
            `  PID now belongs to an unrelated process.\n\n` +
            `  Fix: wait a moment and retry. If it persists, stop PID ${state.pidFile.pid} and\n` +
            `  delete ${path.relative(process.cwd(), PID_FILE)}.`,
        );
      }
      try {
        rmSync(PID_FILE, { force: true });
        log(
          `  local database: cleared a stale postmaster.pid (PID ${state.pidFile.pid ?? "?"} is not running)`,
        );
      } catch (err) {
        throw new Error(
          `Could not remove the stale lock file ${path.relative(process.cwd(), PID_FILE)}.\n` +
            `  ${describeError(err)}\n  Fix: delete it by hand and run this again.`,
        );
      }
    }
  }

  /*
   * Capture the postmaster's stderr.
   *
   * The library's default onLog is console.log, and its start() promise rejects
   * with `undefined` — so without this the FATAL line that explains the failure
   * scrolls past as loose output and the error we throw carries nothing. Held
   * here, it becomes the body of the error message.
   */
  const output = [];
  const pg = new EmbeddedPostgres({
    databaseDir: LOCAL_DB_DIR,
    user: "postgres",
    password: "postgres",
    port: LOCAL_DB_PORT,
    // Keep the data between runs. This is a development database, not a
    // throwaway fixture — losing the founder account on every restart would
    // make it useless.
    persistent: true,
    onLog: (message) => {
      const text = String(message ?? "").trim();
      if (text) output.push(text);
    },
  });

  if (firstRun) await pg.initialise();

  try {
    await pg.start();
  } catch (err) {
    // `err` is very often `undefined` here — see describeError. The postmaster's
    // own words are in `output`, and they are what the reader actually needs.
    const captured = output.join("\n").trim();
    const detail = captured || describeError(err);

    if (/lock file .*postmaster\.pid|another postmaster|already exists/i.test(captured)) {
      throw new Error(
        `Local PostgreSQL is already running in ${path.relative(process.cwd(), LOCAL_DB_DIR)}.\n` +
          `  This should have been detected and reused; if you are seeing this, a server\n` +
          `  started in between the check and the spawn. Simply run the command again.\n\n` +
          `  PostgreSQL said:\n${indent(detail)}`,
      );
    }
    if (/EADDRINUSE|address already in use|could not bind/i.test(detail)) {
      throw new Error(
        `Port ${LOCAL_DB_PORT} is already in use.\n` +
          `  Fix: stop whatever holds it, or set LOCAL_DB_PORT to a free port.\n\n` +
          `  PostgreSQL said:\n${indent(detail)}`,
      );
    }

    // Always an Error, never a bare rethrow: `throw err` here would propagate
    // the library's `undefined` and crash the caller's error handler.
    throw new Error(`The local PostgreSQL server did not start.\n\n${indent(detail)}`);
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
  pg.reused = false;
  return pg;
}

function indent(text) {
  return String(text)
    .split("\n")
    .map((l) => "    " + l)
    .join("\n");
}

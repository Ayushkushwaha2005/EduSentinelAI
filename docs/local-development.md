# Running EduSentinel locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. That is the whole setup — there is nothing to
install, configure or sign up for.

On the first run you will see it download PostgreSQL, create the database, sync
the schema, and print the founder credentials to sign in with.

---

## What `npm run dev` actually does

1. **Starts a real PostgreSQL** on port `54329`, unless you already have one
   (see below). The official binaries, run as a child process — no Docker, no
   system service, no account.
2. **Syncs the schema** (`prisma db push`).
3. **Creates a founder account**, but only if the database is empty. It also
   seeds the product catalogue and org chart so the workspace has something in
   it.
4. **Runs `next dev`.**
5. **Shuts the database down** when you stop the server.

The database lives in `apps/web/.local-db` and is **persistent** — your local
accounts, products and audit history survive a restart. It is gitignored.

---

## The error this replaced

Before this setup existed, `apps/web/.env` shipped with:

```
DATABASE_URL="file:./dev.db"
```

left over from before the project moved to PostgreSQL. Because
`prisma/schema.prisma` declares `provider = "postgresql"`, every request failed:

```
PrismaClientInitializationError
Error validating datasource `db`: the URL must start with the protocol
`postgresql://` or `postgres://`
```

and localhost returned HTTP 500 on every page.

The fix was **not** to point the schema back at SQLite. Developing against a
different database engine than you deploy to is how differences in case
sensitivity, transaction behaviour and JSON handling reach production
undetected. Local development now runs the same engine production does.

---

## Using your own database instead

Set `DATABASE_URL` in `apps/web/.env` to any `postgres://` or `postgresql://`
connection string — Neon, a local install, a container, anything:

```
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

The dev server detects it and will not start the embedded database. Nothing is
imposed on you if you have already made that choice.

---

## Signing in

The founder account is created from `FOUNDER_*` in `apps/web/.env`, defaulting
to:

| | |
|---|---|
| email | `founder@edusentinel.ai` |
| password | `local-dev-founder-pw` |

Change those values and delete `apps/web/.local-db` to bootstrap a different
account.

**The Founder is a privileged role, so it requires two-factor authentication.**
Signing in takes you straight to `/app/security` to enrol an authenticator —
that is the production behaviour, working correctly, not an error. Scan the QR
code and enter a code to reach the rest of the workspace.

To explore the Founder dashboard without any of that, open
<http://localhost:3000/demo> — a sandbox with invented data that needs no
account at all.

---

## Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Everything above |
| `npm run dev:next` | `next dev` alone, against whatever `DATABASE_URL` you have |
| `npm run db:local` | Run the local database on its own, in the foreground |
| `npm run db:local:reset` | Delete the local database; the next `npm run dev` rebuilds it |
| `npm run db:seed:workspace` | Demo staff, teams and tasks (refuses to run against a non-SQLite database — see note) |

Running a suite against the local database while it is up:

```bash
npm run db:local          # terminal 1
# terminal 2:
cd apps/web
DATABASE_URL="postgresql://postgres:postgres@localhost:54329/edusentinel" npm run test:permissions
```

---

## Known local-only notes

- **`npm run test:pipeline` fails locally.** `public/signing-key.pem` is the
  *production* public key, which matches the private key held in Vercel — not
  the one in your local `.env`, so signatures cannot verify here. CI generates a
  throwaway keypair for this test. Do not run `npm run gen:signing-key` to
  "fix" it: that overwrites the published production key.
- **`npm run test:e2e` needs a server on port 3000.** Start `npm run dev` first.
- **React logs one warning about a `<script>` tag in a component** on a dark-mode
  first load. That is the no-flash theme script, which must be inline to run
  before first paint. It works correctly; the warning is React 19 advice and is
  development-only.
- **Development uses a relaxed CSP.** `next dev` needs `'unsafe-eval'` for React
  Refresh and a websocket for hot reload, which the production policy forbids.
  The relaxation is gated on `NODE_ENV === "development"` in
  `src/middleware.ts` and cannot be reached by a deployed response.

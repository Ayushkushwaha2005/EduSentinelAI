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

**There are no default credentials.** Both accounts come from `apps/web/.env`,
and if those variables are absent no account is created at all.

| Variable | Purpose |
|---|---|
| `FOUNDER_EMAIL` / `FOUNDER_NAME` / `FOUNDER_PASSWORD` | The real Founder account — full production workspace |
| `DEMO_FOUNDER_EMAIL` / `DEMO_FOUNDER_NAME` / `DEMO_FOUNDER_PASSWORD` | The sandbox account — `/demo` only |

To change either, edit `.env`, then `npm run db:local:reset` and `npm run dev`
to rebuild from scratch.

### The demo account

`/demo` is **not public**. It is reachable only by the address in
`DEMO_FOUNDER_EMAIL`, and only where that variable is set — which is local
development and nowhere else. A signed-out visitor, or the Founder, or anybody
else gets redirected to `/login`. It is not linked from the site.

The demo address **must not be on an EduSentinel domain**. Both
`prisma/seed-demo.mjs` and `lib/demo/access.ts` refuse `@edusentinel.ai`,
`@edusentinel.tech` and `@edusentinel.com` outright — a fake account on a real
company domain is exactly the confusion this feature must not create. Use
something like `demo-founder@local.dev`.

The demo account is created with role `USER`, the bottom of the ladder. Sandbox
access comes from identity, not from a role, so **no role was added and none was
widened**.

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

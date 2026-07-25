# EduSentinel AI Platform

Privacy-first technology ecosystem — cybersecurity, AI/ML, cloud, developer tools, and education.

Planning documents: [ROADMAP.md](./ROADMAP.md) (master phase plan, security-integrated) · [SECURITY-ROADMAP.md](./SECURITY-ROADMAP.md) (security architecture review, Founder Trust Model, launch checklist) · [SECURITY-NOTES.md](./SECURITY-NOTES.md) (accepted risks).

## Monorepo layout

- `apps/web` — Next.js 15 (App Router, TypeScript, Tailwind v4) — marketing site & app shell
- `packages/ui` — design tokens (`src/tokens.css`) and shared UI primitives
- `assets/brand` — logo and brand imagery masters

## Development

```bash
npm install          # install all workspaces (run at repo root)
npm run dev          # everything: local database + dev server
```

Then open <http://localhost:3000>. That is the entire setup.

`npm run dev` starts a real PostgreSQL for you (official binaries — no Docker,
no service, no account), syncs the schema, creates a founder account on an empty
database and prints the credentials, then runs `next dev`. The database is
persistent and lives in `apps/web/.local-db`.

Already have a database? Put its URL in `apps/web/.env` as `DATABASE_URL` and
the dev server will use it instead of starting its own.

**Full guide, including how to sign in and the known local-only quirks:
[docs/local-development.md](./docs/local-development.md).**

```bash
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

> **Note:** `DATABASE_URL` must be a `postgres://` / `postgresql://` URL —
> `prisma/schema.prisma` declares `provider = "postgresql"`. A SQLite path such
> as `file:./dev.db`, which earlier versions of `.env.example` suggested, makes
> every request fail with `PrismaClientInitializationError`.

Auth: Auth.js v5 (credentials + argon2id), 8h JWT sessions, roles
USER/EMPLOYEE/ADMIN/FOUNDER, audit log on security-relevant actions.
Dev database is SQLite; production switches the Prisma datasource to
managed Postgres per the approved architecture.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, and build on every PR and push to `main`.

## Design rules

- All colors/type/spacing come from `packages/ui/src/tokens.css` — no hard-coded hex in app code.
- Dark-first. Brand accents (cyan/teal) are for accents and large text only, never small body text.
- Respect `prefers-reduced-motion` in all animations.

## Team

Founder: Ayush Kushwaha · Co-Founders: Ayush Maurya, Shalu Kumari · Core: Jujhar Singh, Vedansh, Aishika

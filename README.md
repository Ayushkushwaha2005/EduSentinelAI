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
npm run dev          # start apps/web dev server
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

First-time setup for the app/auth area (Phase 2):

```bash
cd apps/web
cp .env.example .env         # then fill in AUTH_SECRET (see file comments)
npx prisma db push           # creates the local SQLite dev database
npm run db:seed              # optional: bootstrap founder account from env vars
```

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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EduSentinel AI Platform — privacy-first technology ecosystem. npm-workspaces monorepo:

- `apps/web` — Next.js 16 (App Router, TypeScript, Tailwind v4, framer-motion)
- `packages/ui` — design tokens (`src/tokens.css`, Tailwind `@theme`) and future shared UI
- `assets/brand` — logo/mockup masters

## Commands (run at repo root)

- `npm run dev` / `build` / `lint` / `typecheck` — all proxy to `apps/web`
- In `apps/web`: `npm run db:push` (sync SQLite dev DB), `npm run db:seed` (founder bootstrap from env), `npm run test:security` (Phase 2.1 security invariants — also runs in CI)
- CI (`.github/workflows/ci.yml`) runs lint + typecheck + build on PRs and `main`

## Auth architecture (Phase 2)

- Auth.js v5 credentials + argon2id (`src/lib/auth.ts`), JWT sessions (8h), role carried in token.
- Route groups: `(marketing)` has Nav/Footer; `(auth)` is bare (login/signup); `/app` is the authenticated shell.
- `src/middleware.ts` is only a cookie-presence UX gate — real enforcement is `auth()` in `app/app/layout.tsx` and per-page role checks (`isAdminRole`). Keep it that way: argon2 is Node-only and must not enter the Edge bundle.
- Roles are strings (SQLite has no enums) validated by `src/lib/roles.ts`. Audit via `src/lib/audit.ts` on all security-relevant actions.
- Prisma is pinned to v6 (v7 moved datasource URLs out of schema files — do not upgrade casually).

## Rules

- All colors/type/spacing/motion come from `packages/ui/src/tokens.css`; never hard-code hex values or durations in app code. Brand cyan/teal is for accents and large text only (fails AA at body size on dark).
- Dark-first design; respect `prefers-reduced-motion`.
- Development proceeds in approved phases — `ROADMAP.md` is the source of truth, with security gates per phase from `SECURITY-ROADMAP.md` (Security-by-Design: a phase is not complete until its 🔒 gates pass; the Founder Trust Model is a permanent architectural principle). Each phase requires founder approval before starting. Changes to auth, payments, or release signing require two-person review.
- `npm audit` high/critical blocks merge; moderate findings must be logged in `SECURITY-NOTES.md`.
- Security headers are set in `apps/web/next.config.ts` — keep them when editing config.

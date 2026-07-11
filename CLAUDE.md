# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EduSentinel AI Platform — privacy-first technology ecosystem. npm-workspaces monorepo:

- `apps/web` — Next.js 16 (App Router, TypeScript, Tailwind v4, framer-motion)
- `packages/ui` — design tokens (`src/tokens.css`, Tailwind `@theme`) and future shared UI
- `assets/brand` — logo/mockup masters

## Commands (run at repo root)

- `npm run dev` / `build` / `lint` / `typecheck` — all proxy to `apps/web`
- CI (`.github/workflows/ci.yml`) runs lint + typecheck + build on PRs and `main`

## Rules

- All colors/type/spacing/motion come from `packages/ui/src/tokens.css`; never hard-code hex values or durations in app code. Brand cyan/teal is for accents and large text only (fails AA at body size on dark).
- Dark-first design; respect `prefers-reduced-motion`.
- Development proceeds in approved phases (see planning discussion): Phase 0 foundation is done; Phase 1 (marketing site) onward requires founder approval before starting. Changes to auth, payments, or release signing require two-person review.
- `npm audit` high/critical blocks merge; moderate findings must be logged in `SECURITY-NOTES.md`.
- Security headers are set in `apps/web/next.config.ts` — keep them when editing config.

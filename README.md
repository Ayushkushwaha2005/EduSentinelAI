# EduSentinel AI Platform

Privacy-first technology ecosystem — cybersecurity, AI/ML, cloud, developer tools, and education.

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

CI (`.github/workflows/ci.yml`) runs lint, typecheck, and build on every PR and push to `main`.

## Design rules

- All colors/type/spacing come from `packages/ui/src/tokens.css` — no hard-coded hex in app code.
- Dark-first. Brand accents (cyan/teal) are for accents and large text only, never small body text.
- Respect `prefers-reduced-motion` in all animations.

## Team

Founder: Ayush Kushwaha · Co-Founder: Ayush Maurya · Core: Jujhar Singh, Vedansh, Aishika

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EduSentinel AI Platform — privacy-first technology ecosystem. npm-workspaces monorepo:

- `apps/web` — Next.js 16 (App Router, TypeScript, Tailwind v4, framer-motion)
- `packages/ui` — design tokens (`src/tokens.css`, Tailwind `@theme`) and future shared UI
- `assets/brand` — logo/mockup masters

## Commands (run at repo root)

- `npm run dev` / `build` / `lint` / `typecheck` — all proxy to `apps/web`
- In `apps/web`: `npm run db:push` (sync SQLite dev DB), `npm run db:seed` (founder bootstrap), `npm run test:security` + `npm run test:pipeline` + `npm run test:content` + `npm run test:data` (security/release/content/real-data invariants — all run in CI), `npm run audit:verify` (audit hash chain), `npm run gen:signing-key` (new release-signing keypair)

## Content & user-submitted text (Phase 4)

Blog/docs are repo-authored MDX under `apps/web/content/` — trusted, PR-reviewed, rendered via `components/prose.tsx`. **Anything submitted by the public** (collaboration requests, abuse reports) goes through `lib/sanitize.ts` on write and is rendered as plain text only — never MDX, never HTML. Public forms carry bot defense (`lib/bot-defense.ts`: honeypot + signed timing token, no third-party CAPTCHA since that would be a tracker).
- At root: `npm run check:trackers` (no-tracker privacy invariant — also runs in CI)

## Release pipeline (Phase 3)

Upload (admin+MFA, own products only) → **quarantine** + magic-byte validation + scan → **founder-only** sign & publish (ed25519 over the SHA-256) → public download center via signed expiring URLs. Founder can revoke any release; revoked releases vanish from downloads and appear as public incident notices. All artifact access goes through `lib/products.ts` ownership-scoped helpers — never raw `db.product`/`db.release` queries in pages or actions.
- CI (`.github/workflows/ci.yml`) runs lint + typecheck + build on PRs and `main`

## Auth architecture (Phase 2)

- Auth.js v5 credentials + argon2id (`src/lib/auth.ts`), JWT sessions (8h), role carried in token.
- Route groups: `(marketing)` has Nav/Footer; `(auth)` is bare (login/signup); `/app` is the authenticated shell.
- `src/middleware.ts` is only a cookie-presence UX gate — real enforcement is `auth()` in `app/app/layout.tsx` and per-page role checks (`isAdminRole`). Keep it that way: argon2 is Node-only and must not enter the Edge bundle.
- Roles are strings (SQLite has no enums) validated by `src/lib/roles.ts`. Audit via `src/lib/audit.ts` on all security-relevant actions.
- **`AuditLog` has no foreign key to `User` by design** — it snapshots the actor (id + email). Never add a relation back: Prisma's `SetNull` would rewrite `actorId` when an account is deleted, and the R7b hash commits to it, so offboarding would break the chain and look like tampering.

## Workspace & permissions (Phase 5)

One website, one Sign In, **no separate admin portal** — `/app` dispatches on role (`src/app/app/page.tsx`) to the Founder/Co-Founder, Employee, Collaborator or Member dashboard. Role ladder (low→high): `USER · COLLABORATOR · EMPLOYEE · ADMIN · CO_FOUNDER · FOUNDER`; compare with `rankOf`/`outranks`, never string equality.
- Roles set *default* capabilities; the Founder grants/revokes them **per person** (`PermissionGrant`). Effective set comes from `effectiveCapabilities()` in `lib/permissions.ts` — the only answer to "what can this person do?".
- `FOUNDER_RESERVED` capabilities (release signing/revocation, role management, permission granting) are **non-delegable**: stripped in code on every check, so no grant row — forged or otherwise — can escalate. Proven by `npm run test:permissions` (runs in CI).
- Enforcement is `src/lib/guard.ts` (`requireViewer`/`requireCapability`/`requireFounder`/`assertCapability`) on every page and action. The sidebar (`components/dashboard/nav-config.ts`) only *hides* what you can't use — it is never the boundary.
- Founder bootstrap: `npm run db:seed`. Dev demo data: `npm run db:seed:workspace`.

## Product catalogue (Phase 5.5)

Products are **database records, not code**. The Founder adds/edits/publishes/archives them from `/app/products`; the public site (`/products`, home grid, `/products/<slug>`, sitemap) reads the same catalogue via `lib/catalog.ts`. Adding a product needs no code change — never hard-code one in a component again.
- Lifecycle DRAFT → PUBLISHED → ARCHIVED. Only PUBLISHED rows are ever public.
- `products.manage` (edit) and `products.publish` (go live) are grantable; `products.delete` is **founder-reserved** and refused while releases exist.
- The catalogue renders publicly, so it is treated as untrusted: icons are **keys into the fixed set in `lib/product-icons.tsx`** (never raw SVG/HTML), text is sanitized on write and rendered as plain text, and CTA links are restricted to internal paths or `https://` (`safeHref`).
- Migration seed for the original five products: `npm run db:seed:catalog`.
- Prisma is pinned to v6 (v7 moved datasource URLs out of schema files — do not upgrade casually).

## Real data, profiles & analytics (Phase 6)

- **No placeholders.** Nothing in `/app` may render a number, name or state that is not read from the database. A control that does nothing is deleted, not styled; a series with no data says so instead of drawing floor-height bars. Presence (`online`) must come from `lastSeenAt` via `lib/profile.ts` — `test:data` fails CI if a shell component hard-codes it again.
- **Profiles are self-service for every role** (`/app/profile`, gated on `requireViewer`, no capability). `PROFILE_FIELDS` in `lib/profile.ts` is the exhaustive allowlist of what an update may write: never add `role`, `passwordHash`, `mfaEnabled` or `sessionVersion` to it, and never build the Prisma `data` object by spreading `FormData`. Privilege changes happen in Access Control (founder-reserved) and nowhere else.
- **Avatars go through `lib/images.ts`, always.** Magic-byte validated (never the filename or claimed MIME), PNG/JPEG only — **SVG is script and is refused** — capped at 2 MB, metadata/EXIF stripped (a phone photo carries GPS), stored in `storage/avatars` under a generated name, served only by `/api/avatar` with a session. Persist the bytes the stripper *returns*, never the bytes you were handed.
- **Analytics are computed server-side from our own records** (`lib/analytics.ts`), gated on the grantable `analytics.read`. No third-party analytics SDK, ever — `npm run check:trackers` is the machine-enforced version of that promise. A metric that cannot be measured is reported as unmeasured, **never as zero**.

## Organization & company (Phase 6.5)

- **The organization is data.** The org chart (`OrgMember`), departments, the company profile and collaborations are database records the Founder edits at `/app/organization`, `/app/company` and `/app/collaborations`. `lib/team.ts` is **deleted** — never reintroduce a hard-coded roster. Migration seed: `npm run db:seed:org`.
- **`org.manage` and `company.manage` are FOUNDER-RESERVED.** Someone who can edit the org chart can publish themselves as CTO; someone who can edit the company profile can change the security contact address. Not delegable, ever.
- **One person, one record.** When an `OrgMember`/`Collaboration` is linked to a `User`, name/email/photo/bio **resolve from that account** (`lib/org.ts`, `lib/collaborations.ts`) — the row's own columns are ignored, not merged. Never add a second copy of a person's identity to any table.
- **`collab.view` ≠ `collab.manage`.** `collab.view` is the *collaborator's own* permission for their own thread. The staff console gates on `collab.manage`. Gating a staff surface on `collab.view` hands external collaborators the full partner list.
- **Client components must not import from `lib/org.ts` / `lib/collaborations.ts` / `lib/company.ts`** — those import `db`. Pure constants and types live in `lib/org-types.ts`.
- Org/company text is sanitized on write and rendered as plain text; social links go through `safeHref` (https or internal path only); photos and logos go through `lib/images.ts` (no SVG). The public roster shows `PUBLIC` members only and never a phone number.

## Invitations, mail & offboarding (Phase 7)

- **An invitation is a link in an email, so it must not be able to mint leadership.** `lib/invitations.ts` is the gate: FOUNDER and CO_FOUNDER are never invitable (by anyone), nobody invites a peer or superior, and reserved capabilities are refused on write *and* stripped on read. Tokens are single-use, expiring, and stored **only as a SHA-256 hash**.
- Acceptance (`/accept-invite`) takes the **role and email from the invitation row, never from the form** — it is the one place an unauthenticated request yields a role above USER.
- `people.invite` is grantable; **`people.offboard` is founder-reserved** (taking access away is, in the wrong hands, how you silence someone). Offboarding strips role/grants/sessions/ownership but **never deletes the account** — the audit chain snapshots the actor so a record survives the person, and it must still verify afterwards.
- **Grant expiry is real** (`expiresInDays` on the grant form). Temporary access that quietly becomes permanent is how a company stops knowing who can do what.
- **Mail goes through `lib/mail.ts`** — plain text only, **no tracking pixels, no click-redirects, no remote images**; an email tracker is a tracker. Dev writes to `storage/outbox`. Every attempt is recorded in `MailLog` and failures surface in Access Control; **bodies are never stored** (they contain live credentials).

## HR & workforce (Phase 8)

- **The role ladder did not change.** HR authority is four *grantable* capabilities — `attendance.manage`, `leave.approve`, `calendar.manage`, `hr.view`. An HR lead is an EMPLOYEE who has been granted them. Never add an `HR` role.
- **All attendance/leave reads go through `lib/hr.ts`.** It scopes by relationship (self · approver · HR · founder); there is no unscoped "all employees" read. Asking for a record you may not see returns `null`, even with the exact id.
- **A leave reason reaches only the person and their approver chain.** `hr.view` is *not* enough — it is the field most likely to hold a medical fact. Redaction happens in the query layer (`redactLeave`), never in a component, and the reason is **never written to the audit log** (`audit.read` is a wider circle than the approvers). The team calendar carries no reason **and no leave type**.
- **Leave maths is server-side**: weekends and holidays are not charged, pending days are held, balances cannot go negative, and each transition is one transaction. Approving leave writes the attendance days; cancelling releases them.
- **Attendance corrections are requested and approved, never applied silently** — and nobody decides their own correction or their own leave.
- Retention: 24 months (`purgeExpiredRecords()`). Bootstrap leave types with `npm run db:seed:hr`.

## Support & notifications (Phase 9)

- **Support threads are participant-scoped** (`lib/support.ts`): the requester, plus `support.respond` holders. No unscoped "get by id" — `openRequest(viewer, id)` returns `null` for a request you may not see, identical to one that does not exist. A collaborator never sees another collaborator's request.
- **Internal notes are filtered in the query layer**, never in a component. The requester's payload simply does not contain them.
- **Attachments go through `lib/attachments.ts`** — magic bytes, 10 MB cap, PNG/JPEG/PDF/ZIP only, **no SVG** (it is script, aimed at the person answering). Served by `/api/support-file` as a download with `nosniff` + sandbox CSP, asking the same access question as the thread page.
- **A notification must carry nothing its recipient could not already open.** It is written at the moment of the event, with the *actor's* data in hand — the easiest place in the codebase to leak a leave reason. Payload = title + one sentence (160-char cap is the guardrail) + an internal `/app` link that re-checks server-side. Never paste a record body into `notify()`.
- Audiences come from `holdersOf(capability)` so the people told about work are the people who can do it. `notifications.broadcast` is a capability; the R7b founder alerts (`lib/audit.ts`) stay separate and unmuteable.

## Dark Mode (Phase 9.4)

- **Light Mode is FROZEN.** Every dark rule is scoped to `[data-theme="dark"]` — `test:support` fails CI on an unscoped rule or a changed light token. Dark is a purely additive layer.
- **One rule makes the product glass**: dark mode redefines `.bg-surface-raised` (blur + hairline edge + internal `--glow-veil`), so every Panel/card/popover — including ones written later — is glass without a `dark:` variant anywhere.
- **The CSP is not weakened.** The no-flash theme script carries the nonce `src/middleware.ts` already issues. Never add `unsafe-inline` to make a theme work.
- **Reduced motion = absent, not slower.** The meteor canvas is not mounted; `--tilt-max` is `0deg`. Tilt goes on glanceable cards, never on tables.
- Theme is persisted in **localStorage, not the database** — it belongs to the device, not the account.

## Rules

- All colors/type/spacing/motion come from `packages/ui/src/tokens.css`; never hard-code hex values or durations in app code. Brand cyan/teal is for accents and large text only (fails AA at body size on dark).
- Respect `prefers-reduced-motion`.
- Development proceeds in approved phases — `ROADMAP.md` is the source of truth, with security gates per phase from `SECURITY-ROADMAP.md` (Security-by-Design: a phase is not complete until its 🔒 gates pass; the Founder Trust Model is a permanent architectural principle). Each phase requires founder approval before starting. Changes to auth, payments, or release signing require two-person review.
- `npm audit` high/critical blocks merge; moderate findings must be logged in `SECURITY-NOTES.md`.
- Security headers are set in `apps/web/next.config.ts` — keep them when editing config.

# EduSentinel AI — Master Roadmap

*Version 2.0 · 2026-07-12 · Security-integrated revision*

This is the single source of truth for phase planning. It supersedes the
roadmap from the original architecture review by integrating
[SECURITY-ROADMAP.md](./SECURITY-ROADMAP.md) under a **Security-by-Design**
rule: every phase lists its security tasks as exit criteria, and **a phase is
not complete until its security gates pass.** The
[Founder Trust Model](./SECURITY-ROADMAP.md#4-founder-trust-model-permanent-architectural-principle)
is a permanent architectural principle across all phases: no phase may
introduce a path that grants, demotes, or bypasses the FOUNDER role.

Legend: ✅ done · 🔒 security gate (blocking) · ⏳ pending

---

## Phase 0 — Foundation ✅ (frozen)

Monorepo, Next.js 16, design tokens, CI (lint/typecheck/build), brand assets.

Security delivered: security headers in `next.config.ts` · secrets hygiene
(`.env` ignored, `.env.example` only) · `SECURITY-NOTES.md` accepted-risk
policy · audit-severity merge rule (on paper — CI enforcement lands in
Phase 3 gates).

## Phase 1 — Public Marketing Site ✅ (frozen at v0.1.0-phase1 + approved polish)

Reference-matched marketing site, pricing, legal drafts, SEO, team, branding.

Security delivered: `security.txt` + responsible-disclosure policy (72h ack /
90-day coordinated) · plain-language privacy commitments · no third-party
trackers (to become CI-enforced, Phase 3 gates).
Carried forward: 🔒 CSP + HSTS moved into Phase 2.1 (site-wide headers).

## Phase 2 — Identity Core ✅ (approved 2026-07-12)

Auth.js v5 credentials + argon2id, Prisma (SQLite dev / Postgres-portable
schema), roles (USER/EMPLOYEE/ADMIN/FOUNDER), audit log, dashboard shell,
role-gated admin skeleton.

Security delivered: OWASP argon2id parameters · timing-safe credential check ·
server-side authorization (middleware is UX-only) · open-redirect guard ·
audit log from day one · MFA-ready schema.
🔒 **Exit criterion:** second-person review of all auth code (Founder Trust
Model rule: changes to auth/release infrastructure require two-person review).

## Phase 2.1 — Auth Hardening 🔒 ✅ (built + tested 2026-07-12; exit pending second-person auth review)

*Why this phase exists: every later feature stacks on the identity layer;
retrofitting these controls after portals and products exist costs multiples.*

- Rate limiting + progressive lockout on login/signup **(R1)**
- Session revocation: DB-backed sessions or refresh rotation + revocation list **(R2)**
- Founder Trust Model in code: FOUNDER ungrantable/undemotable via any
  endpoint; one-directional role granting **(R3)**
- Content-Security-Policy (nonced) + HSTS, site-wide **(R4)**
- TOTP MFA — mandatory for ADMIN and FOUNDER, encrypted secrets **(R6)**
- Email verification + password reset (single-use, expiring tokens) **(R9)**
- Audit enrichment: failed logins, IP/user-agent, role-change events **(R7a)**

## Phase 3 — Product Platform & Download Center ✅ (built + tested 2026-07-12; exit pending second-person review)

Product registry, release pipeline, download center UI, first real product
published end-to-end.

🔒 **Security gates (publishing does not ship without them):**
- Upload pipeline: magic-byte validation, size caps, quarantine-until-review,
  malware scanning (ClamAV; VirusTotal defense-in-depth), human review for
  new publishers **(R5)**
- Release signing + published SHA-256 checksums + signed expiring download
  URLs; storage outside web root under generated names
- Artifact revocation: one-click global pull + incident notice
- Ownership-scoped RBAC: `owner_id` checks via scoped query helpers **(R12)**
- Founder-gated signing keys (Founder Trust Model §3)
- CI hardening: blocking `npm audit`, gitleaks, CodeQL, Dependabot, branch
  protection with required review, SHA-pinned actions **(R8)**
- Hash-chained audit log + second-channel alerts on privileged events **(R7b)**
- Tracker-domain CI check (privacy promise becomes machine-enforced)

## Phase 4 — Content & Community ✅ (built + tested 2026-07-12; exit pending second-person review)

Blog (MDX), docs, collaboration-request flow, community guidelines.

🔒 Security gates: output sanitization for any user-influenced content ·
explicit CORS policy before any external API consumer · signup bot defense ·
moderation + abuse-report path for collaboration requests.

## Phase 5 — Role-Based Workspace & Permission System ✅
### (built + tested 2026-07-13; exit pending second-person auth review)

*One website, one Sign In page, one identity system.* There is **no separate
admin portal** and none may ever be introduced. After login every user lands on
`/app`; the shell reads the session role plus the user's granted permissions and
renders the dashboard that role is entitled to. The Founder is the highest
authority and the sole source of access.

Dashboard layout is a close recreation of the approved reference set
(`EduSentinel AI pics/EMPLOYEE & FOUNDER`), re-skinned with EduSentinel brand
tokens, logo and typography. **Layout is not being redesigned in this phase** —
it is reproduced as shown, then customised later.

### 5.0 — Permission architecture (foundation, lands first)

- **Role ladder** extends to: `USER` · `COLLABORATOR` · `EMPLOYEE` ·
  `CO_FOUNDER` · `FOUNDER`. `ADMIN` is retained as an operational tier between
  EMPLOYEE and CO_FOUNDER so nothing already shipped breaks. Ranks live in
  `lib/roles.ts`; every comparison goes through them (no string equality checks
  scattered in pages).
- **Capability layer** (`lib/permissions.ts`): a fixed catalogue of capability
  keys (`products.manage`, `releases.upload`, `releases.publish`,
  `collab.moderate`, `team.manage`, `audit.read`, …). Each role has a *default*
  capability set; the Founder can additionally **grant or revoke individual
  capabilities per person**, stored in a new `PermissionGrant` table
  (`userId`, `capability`, `allow`, `grantedBy`, `grantedAt`, `expiresAt?`).
  Effective set = role defaults ± explicit grants. All future management flows
  build on this one primitive.
- **Founder Trust Model preserved (non-negotiable):** FOUNDER remains
  ungrantable and undemotable. A small set of capabilities is **founder-reserved
  and non-delegable** (release signing, role management, permission granting,
  audit-chain verification) — no grant can hand them to anyone else, enforced in
  `lib/permissions.ts`, not in the UI.
- Every grant/revoke and role change is audited (`admin.permission_grant`,
  `admin.permission_revoke`) through the existing hash-chained audit log.

### 5.1 — Dashboard shell (reference recreation)

Shared shell for all roles, built once from the reference:
sidebar (EduSentinel wordmark, grouped/collapsible nav, presence list) ·
top bar (date, global search, messages, notifications, identity chip with role) ·
content area (breadcrumb, stat cards with avatar stacks, data table with search /
add / export / pagination, bar chart, team cards with progress bars).
Nav items are **derived from the viewer's effective capabilities** — an item the
user cannot use is never rendered, and the page behind it re-checks server-side.

### 5.2 — Per-role dashboards

- **Founder** — full operational view plus the exclusive **Access Control**
  surface: directory of every account, role assignment, per-person capability
  grants, session revocation, audit trail.
- **Co-Founder** — same operational view, minus founder-reserved actions
  (cannot sign releases, cannot manage roles or permissions).
- **Employee** — scoped to assigned work: tasks, own products, team, messages.
- **Collaborator** — external-facing: own collaboration threads and shared
  resources only. Structurally isolated from internal data.

### 5.3 — Message Center & workload management ✅

Message Center (reference screens 2–3): Team/Client threads, top-bar message
dropdown with "View in message center", composer, unread state. A conversation
is readable **only by its participants** (`lib/messages.ts` — there is no
unscoped "get by id" helper); a collaborator may reach staff but never another
collaborator, so we never become a channel between external parties. Bodies are
sanitized on write and rendered as plain text only, exactly like public
submissions.

Workload management: teams, members, projects and task assignment from the UI,
gated on the `team.manage` capability. Task status may be moved by the assignee
(their own work) or by a `team.manage` holder — nobody else.

**Fixed in passing:** `prisma/seed.mjs` wrote its audit row directly instead of
through `lib/audit.ts`, leaving a null hash that broke the R7b chain for every
row after it. It now chains correctly; `npm run audit:verify` passes across a
bootstrap.

### 5.4 — Capability migration of the Phase 3/4 surfaces ✅

The surfaces built before the capability layer (`/app/products`,
`/app/admin/releases`, `/app/admin/collaborations`, `/app/security`) still
authorized with ad-hoc `isAdminRole` + MFA checks. All of them now go through
`lib/guard.ts`, so the capability system is the *only* authorization path in the
workspace:
- Products: viewing is `products.view`, registering is `products.manage`,
  uploading is `releases.upload` — three distinct powers the Founder can grant
  separately. (Previously one page-level admin check, which also meant an
  employee saw a Products nav item that bounced them.) Reads stay
  ownership-scoped, so a viewer sees only products they own.
- Releases: the queue is `releases.review`; publish/reject/revoke run on
  founder-reserved capabilities. `releases.reject` was added to
  FOUNDER_RESERVED so rejection stays founder-only exactly as before.
- Moderation: `collab.moderate` — grantable to one person without also handing
  over products, releases or the account directory.

**Fixed in passing:** `disableMfa` refused ADMIN and FOUNDER by name, so
`CO_FOUNDER` — introduced by this phase's role ladder — could have switched off
its own mandatory MFA. It now uses the rank check (`isAdminRole`).

### 5.5 — Product Management: the Founder's catalogue console ✅

The Founder Dashboard is now the management centre of EduSentinel AI. A product
is a database record, not a code constant: **any current or future product can be
added, edited, published, archived or removed from the dashboard with no code
change and no deploy.** What the Founder publishes is what the public site shows
— `/products`, the home page grid, `/products/<slug>` (its own generated page)
and the sitemap all read the same catalogue (`lib/catalog.ts`).

Lifecycle **DRAFT → PUBLISHED → ARCHIVED**, plus permanent delete. New products
always start as drafts; nothing reaches the public site without a deliberate
publish. Capabilities:
- `products.manage` — create and edit (grantable)
- `products.publish` — make public / archive (grantable; leadership by default,
  so the Founder can delegate catalogue publishing **without** delegating
  release signing)
- `products.delete` — **FOUNDER-RESERVED**, non-delegable: deletion is
  irreversible. Refused outright while a product still has releases, because
  that would orphan distributed artifacts and their audit trail — archive
  instead. Requires typing the slug to confirm.

🔒 **Catalogue is public-facing, so it is treated as untrusted content:**
- Icons are **keys into a fixed set** (`lib/product-icons.tsx`) — the dashboard
  never accepts raw SVG or HTML, which would be a markup-injection path onto
  pages we serve to everyone. A new icon is a PR; a new *product* is not.
- All text is sanitized on write and rendered as plain text.
- CTA links are restricted to an internal path or an `https://` URL, closing
  `javascript:`, `data:` and protocol-relative links at the point of write.
- Reads are ownership-scoped (R12) and only PUBLISHED rows are ever public —
  all covered by `npm run test:permissions`.

The five products previously hard-coded in `components/products.tsx` were
migrated into the catalogue by `npm run db:seed:catalog` (idempotent), so the
public site is unchanged — but the Founder now owns them.

### 5.6 — MFA onboarding, shell polish & end-to-end verification ✅

**Founder MFA onboarding.** A privileged account without MFA was silently
redirected to `/app/security` with no explanation and no way back. The gate now
carries its reason and the page it interrupted (`?mfa=required&next=…`), the
security page explains *why* access is held, and enrolment returns the viewer to
where they were going. The return path is validated as a relative `/app` route on
both sides, so it can never become an open redirect. After enrolling, every
Founder-only surface opens — proven end-to-end, not asserted.

**Shell polish (production-ready, not merely reference-shaped):**
- **Mobile navigation** — the sidebar is desktop-only, so the workspace had *no
  navigation at all* on a phone. A drawer now carries the same
  capability-filtered items.
- **Honest controls.** The reference's decorative widgets were doing nothing:
  Export now writes a real CSV (client-side, over rows the server already
  authorized — no new endpoint, no new auth boundary; formula-prefixed cells are
  escaped against CSV injection), search is a real GET form, and pagination shows
  the *real* page instead of a hard-coded "01". Controls a page does not
  implement are no longer rendered at all — a button that does nothing is worse
  than no button.
- **Workspace search** (`/app/search`, the shell's global search from 5.1) —
  results are assembled from the same scoped helpers as the pages they link to,
  so search can never surface a record the viewer could not already open.
- **`prefers-reduced-motion`** is finally honoured. It was a standing project
  rule and a comment in `tokens.css`; no media query ever implemented it.

**End-to-end test** (`npm run test:e2e`, needs a live server, not in CI): signs in
over HTTP as Founder, Co-Founder, Employee, Collaborator and an unenrolled
Founder — with real TOTP codes for MFA accounts — and asserts what each may and
may not open, the MFA gate, the product lifecycle (a DRAFT 404s publicly, a
PUBLISHED product is live) and that release-signing controls are Founder-only.
Probe accounts are ephemeral; the real Founder account is never touched.

🔒 **Fixed: the audit log was mutable as a side effect of deleting a user.**
`AuditLog.actor` was an optional FK to `User`, so Prisma's default `SetNull`
rewrote `actorId` to null on that account's rows when it was deleted. The R7b
hash commits to `actorId` — so ordinary offboarding (or a GDPR erasure) silently
broke the chain and would have read as **tampering**. The log now holds **no
foreign key** to `User` and snapshots the actor (id + email as they were), which
is what an audit record should store anyway. Regression-tested in
`test:permissions`: an account is deleted and the chain still verifies.

### 5.7 — Founder dashboard completion: navigation, people management, live data ✅

**The "broken navigation" was two different things, and only one was a bug.**
- *Not a bug:* every privileged route bounced the Founder to `/app/security`
  because the Founder account had `mfaEnabled: false`. MFA is mandatory for
  FOUNDER, so the guard was working exactly as designed. Enrolment itself was
  verified working end-to-end over real HTTP (secret issued → stored encrypted →
  live code accepted). It had simply never been completed.
- *A real bug:* `/app/teams/<id>` did not exist, so every team card's "View All"
  — on the dashboard and the Teams list — linked to a **404**.

**Founder MFA bootstrap** (`npm run mfa:enroll -- <email> [code]`). The web flow
at `/app/security` remains the normal path; this exists for the same reason
`db:seed` does — the Founder is the one account that must be able to get itself
into a working state from the command line, and MFA is mandatory for FOUNDER, so
a founder who cannot finish enrolment in a browser is locked out of their own
platform. Deliberately narrow: it can only *enable* MFA (never disable), cannot
touch roles or permissions, refuses to switch MFA on without a valid live code
(exactly like the UI), and writes both steps to the audit chain.

**Missing routes and wiring restored:**
- `/app/teams/[id]` — team detail (members, projects, work). Fixes the 404.
- `/app/people` — the reference's "Clients List" screen: the full directory with
  role tabs (Leadership / Employees / Collaborators / Members), search, export.
  **Read-only by design** — every "Manage" link goes to Access Control, so the
  directory never becomes a second, weaker role-management path.
- The dashboard is now laid out from the reference: summary cards → directory
  table → growth chart beside the staff panel → release pipeline → activity →
  team grid.

**Widgets show real data, not placeholders.** Account Growth is now *cumulative*
(total accounts per day) rather than per-day signups: per-day was honest but
rendered as six empty bars and one spike on a young platform, which read as
broken. The release pipeline was empty because there were no releases at all —
`db:seed:workspace` now seeds a genuine quarantined build (a real zip in
`storage/quarantine`) so the Founder can exercise sign-and-publish.

**HR:** managed as a *function*, not a rung on the ladder — an HR lead is an
`EMPLOYEE` with an HR title on the People & Culture team, visible and manageable
in the directory. Adding an `HR` **role** would change the authorization ladder,
which needs founder approval and is not in this phase.

🔒 The E2E now **crawls every link the Founder is actually shown** (26 of them)
and fails on any non-200, so a link to a route that does not exist is caught by
the tests rather than by you. It also asserts the dashboard widgets are not
rendering their empty states.

🔒 **Security gates (blocking):**
- ✅ Deny-by-default authorization: a capability check on **every** dashboard
  route and server action, server-side. Sidebar filtering is UX only — never the
  enforcement boundary (same rule as `src/middleware.ts`). Enforced by a static
  sweep in `test:permissions`: every `/app` page and **every `"use server"`
  module** (matched on the directive, not the filename) must call a
  `lib/guard.ts` helper, and nothing under `/app` may read the role off the
  session — a new route or action added without a guard fails CI.
- ✅ Founder-reserved capabilities provably non-delegable — `test:permissions`
  writes forged rows straight into `PermissionGrant`, bypassing every action and
  UI check, and asserts no reserved capability or FOUNDER role can be produced.
- ✅ MFA mandatory for every privileged surface (ADMIN, CO_FOUNDER, FOUNDER),
  enforced inside `requireCapability`/`assertCapability` and regression-tested.
- ✅ Collaborator tenant isolation: collaborators reach only their own records,
  via participant-scoped and ownership-scoped query helpers.
- ✅ All four role journeys verified end-to-end against the running app
  (`npm run test:e2e`), including TOTP sign-in and the MFA gate.
- ⏳ **Two-person review before merge — this phase touches authorization.**
  (The one remaining exit criterion; founder action.)

✅ **Founder MFA enrolled.** Every privileged surface (product console, Access
Control, release signing, audit) is open and verified working.

## Pre-Launch Gate 🔒 (MEDIUM tier — before public exposure, any phase)

Full checklist in [SECURITY-ROADMAP.md §7](./SECURITY-ROADMAP.md#7-pre-public-launch-security-checklist).
Headlines: production Postgres (TLS, least-privilege role, RLS) · secret
manager + rotation · backups with a tested restore (RPO 24h / RTO 4h) ·
Cloudflare proxy + rate rules + bot mode · monitoring/alerting reaching a
human · incident-response runbook matching the published disclosure SLAs ·
breached-password checking.

## Phase 6 — Expansion ⏳ (per-product, post-launch)

Browser extension, desktop, mobile clients — all authenticating against the
Phase 2 identity service and distributing via the Phase 3 download center.
Collaboration portal opens to the public. (The employee workspace itself is no
longer deferred here — it ships as part of Phase 5's role-based dashboards.)

🔒 Security gates per product:
- Extension/store publisher accounts: hardware-key MFA, founder-gated releases
  (supply-chain threat domain)
- Employee portal: mandatory MFA, per-person least-privilege permissions,
  first-class offboarding (one action → sessions revoked, roles stripped,
  audited)
- Collaboration portal: verified-publisher identity, structural tenant
  isolation (RLS), external penetration test **before** public opening

## Continuous Security Track (never "done")

Dependency updates on a 5–7 day adoption delay · quarterly founder access
reviews · quarterly restore drills · accepted-risk reviews in
`SECURITY-NOTES.md` · annual policy review. **Future tier:** WebAuthn hardware
keys · founder approval queue (dual control) · audit anomaly detection ·
SIEM-lite aggregation · bug-bounty rewards · SOC 2-style controls
documentation for enterprise customers.

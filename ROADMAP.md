# EduSentinel AI — Master Roadmap

*Version 3.0 · 2026-07-14 · Remaining work re-planned as Phases 6–12.
Phases 0–5.8 are complete and frozen — this revision does not alter them.*

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

### 5.8 — MFA onboarding done properly ✅

**A lockout was created and then fixed.** Phase 5.7 enrolled the Founder by
issuing a secret and confirming it with a code generated *from that secret* —
so MFA switched on for an authenticator that had never held it, and login then
demanded a code the Founder could not produce. Confirming enrolment on someone's
behalf defeats the entire point of the second factor: the code must come from
**their** device, or it proves nothing. The account was reset (secret cleared,
MFA off, sessions revoked) and re-enrolment now happens in the browser.

The flow, as it should have been:
- **First landing enrols.** An `isAdminRole` account without MFA is redirected
  from *anywhere* in `/app` — including the root — straight to setup. Previously
  only privileged sub-pages redirected, so a Founder could sit on `/app` with no
  sign that half the product was closed to them or why.
- **The QR opens itself.** Setup no longer hides behind a "Set up" button the
  user has to discover; the QR and manual key are on screen, ready to scan.
- **The pending secret is stable.** `startMfaSetup()` used to mint a fresh secret
  on every call. Harmless when it sat behind a button — fatal once the page opens
  automatically, because a reload (or a second tab) would silently invalidate the
  QR just scanned and the codes would never match. It now resumes the pending
  enrolment and only mints a secret when none is pending.
- **Enforcement stays where it belongs:** login demands a code only once
  `mfaEnabled` is true, i.e. only after a real code from the user's own device
  has been verified. The account is never left requiring a factor that was never
  configured.

`npm run mfa:enroll` remains as a break-glass path (it still refuses to enable
MFA without a valid live code), but the browser flow is the normal one.

⏳ **Founder action:** sign in with your password, scan the QR that appears, and
enter one code. MFA is enforced from the next login onward.

---

# Remaining work — Phases 6 to 12

*Planned 2026-07-14. Everything above this line is built and frozen; nothing in
this section redesigns it.* Phase 5 delivered the **skeleton** of the workspace:
real authorization, real catalogue, real audit chain. What it did not deliver is
an **operating company inside that skeleton** — the people, the workflows, the
communications and the polish. That is what follows.

The remaining work is divided into **seven phases**. Phases 6–8 make the
workspace real (data, people, HR). Phase 9 makes it responsive (support,
notifications, analytics). Phase 10 makes it beautiful (the premium Dark Mode
design language). Phase 11 makes it shippable. Phase 12 is the original
post-launch product expansion, unchanged in substance and renumbered.

Two rules apply to every phase below, inherited and non-negotiable:
1. **Founder Trust Model** — no new surface may grant, demote or bypass FOUNDER,
   and no founder-reserved capability becomes delegable. New features add
   capabilities to the Phase 5 catalogue; they never add a second authorization
   path around it.
2. **Guard on everything** — every new page and every `"use server"` module calls
   `lib/guard.ts`. `test:permissions` fails CI otherwise. New tables get
   ownership- or participant-scoped helpers in `lib/`, never raw `db.*` reads in
   pages.

## Phase 6 — Real Data, Profiles & the End of Placeholders ✅
### (built + tested 2026-07-14; exit pending second-person review)

*Nothing in the workspace displays a number, name or state that is not read from
the database.* Phase 5.7 replaced several widgets with live queries; this phase
finished the job and made every account a real, self-managed person.

### 6.1 — Placeholder eradication (audit-then-fix) ✅

The inventory was written **before** any code changed
([PHASE-6-INVENTORY.md](./PHASE-6-INVENTORY.md)) — ten items, each resolved one of
three ways and the choice recorded: wire it to a real query, render an honest
empty state, or delete it.

What was actually fake, and what happened to it:
- **The notification bell** was a `<button>` with no handler wearing a
  permanently-lit unread dot. It announced notifications that did not exist and
  could not be opened. **Deleted** — it comes back in Phase 9 when it has
  something true to say.
- **"Team Online"** rendered the five oldest staff accounts with `online`
  hard-coded on every avatar: it claimed the team was at their desks whether or
  not anyone had signed in for a month. Presence is now **measured** —
  `User.lastSeenAt`, stamped by the shell (throttled to 2 min), online = seen in
  the last five minutes — and the rail renders nothing when nobody is.
- **The summary cards** all passed the same unrelated avatar stack; the member and
  collaborator dashboards passed `[viewer.name]` and rendered a stack of *you,
  alone*. `people` and `href` are now optional, and each card shows the people
  actually behind its number (product owners, release publishers, staff).
- **Hard-coded facts**: the member dashboard's role row said `"Member"` — wrong
  the moment that account's role changes, which is exactly when it matters — and
  two card subtitles were prose pretending to be figures. All now read from the
  database.
- **The demo seed** grew a second fence: it already refused a non-SQLite database,
  and now also refuses `NODE_ENV=production`. The checks are independent on
  purpose — the day production runs on a local file (a restore drill, a staging
  box, a mistake), the first fence opens.

### 6.2 — Profile management for every role ✅

`/app/profile` — one page, every role, USER through FOUNDER. Gated on
`requireViewer`, **not** a capability: managing your own identity is not a
privilege the Founder grants, it is what having an account means.

- Display name, title, pronouns, timezone, location, contact, bio, photo, and
  notification preferences. Security mail has no switch and never will — you do
  not get to mute the alarm on your own account.
- Password change requires **re-authentication** (a live session is not proof that
  the person at the keyboard is the account holder) and revokes every other
  session on success.
- 🔒 **The allowlist is the boundary.** `PROFILE_FIELDS` is exhaustive and the
  Prisma `data` object is built field-by-field from a parsed schema — never spread
  from `FormData` — so a forged `role=FOUNDER` field finds nothing on the other
  side that reads it. Every query is `where: { id: viewer.id }`; `test:data`
  fails CI if any profile query is ever scoped to an id taken from the request.
- 🔒 **Avatars are files an attacker chooses**, so they get the Phase 3 treatment:
  magic-byte validation (the claimed MIME and the filename are never consulted),
  2 MB cap, dimension cap, stored outside the web root under a generated name,
  served only by an authenticated route. **SVG is refused — it is script.** And
  because a phone photo carries the GPS coordinates of where it was taken, the
  file is **rebuilt from its pixel-bearing chunks only** (`lib/images.ts`), byte-
  wise rather than through a native image library: no new dependency, and the
  output can only ever be a subset of the input. Proven by `test:data`, which
  feeds it a real PNG and a real JPEG carrying EXIF and asserts the location does
  not survive.

### 6.3 — Functional account-growth analytics ✅

`/app/analytics`, gated on the new grantable `analytics.read` — so the Founder can
hand someone the numbers without also handing them the account directory.

- Cumulative accounts, signups per day and **active accounts per day** over
  7d / 30d / 90d / all-time, plus posture (verified rate, privileged-MFA coverage,
  30-day retention) and lifetime downloads per release. CSV export throughout.
- "Active" has **one** definition on the platform: a `user.login` row in the
  hash-chained audit log. A second, softer definition invented for a dashboard is
  how two screens start disagreeing about the same word.
- 🔒 Every figure is computed server-side from records we already hold. **No
  analytics SDK, no beacon** — `npm run check:trackers` is a CI invariant and this
  page does not get an exemption from it.
- **A metric we cannot measure reports itself as unmeasured, never as zero.**
  Invitation acceptance (Phase 7) says so in words, and retention stays blank
  until there are two months of sign-ins to compare — because an operator who
  cannot see that a number is missing will read it as a real number, which is
  exactly how a dashboard starts lying.

🔒 **Security gates:**
- ✅ New `npm run test:data` (`scripts/test-phase6.mts`, **runs in CI**): SVG and
  polyglot uploads refused, EXIF/GPS provably stripped from PNG and JPEG, oversize
  refused, profile updates cannot write `role`/`passwordHash`/`mfaEnabled`/
  `sessionVersion`, presence is measured, analytics report the unmeasurable as
  unmeasured, and no shell component may hard-code `online` again.
- ✅ `test:permissions` still green — 25 guarded surfaces, no escalation path.
- ✅ `check:trackers` green; `audit:verify` intact.
- ✅ E2E extended: every role opens their own profile and only their own, an
  employee and a collaborator are refused analytics, a bogus range falls back
  instead of reaching a query, and an unauthenticated avatar request gets 401.
- ⏳ **Two-person review before merge** (founder action).

## Phase 7 — People: Invitations, Access Management & the Real Permission System ⏳ (next)

*How a person joins EduSentinel, what they can do, and how they leave.* Today
accounts appear only by public signup or a seed script; the Founder cannot bring
someone on board.

### 7.1 — Founder invitation system with role assignment

- Founder (or a `people.invite` holder) invites by email and **assigns the role
  and starting capabilities at invitation time** — the offer *is* the access
  decision, made once and audited, not a signup followed by a scramble to
  promote.
- Invitations are single-use, expiring, revocable, and **hash-stored** exactly
  like Phase 2.1 verification tokens (the raw token exists only in the email).
  Accepting sets the password and lands the person in MFA onboarding if their
  role requires it (5.8 flow, unchanged).
- A pending-invitation queue: resend, revoke, see who has not accepted.
- 🔒 **FOUNDER and CO_FOUNDER are not invitable roles.** Invitation cannot mint
  privilege above the inviter (one-directional granting, R3) and can never mint a
  founder — the Trust Model closes this door before the feature is written, not
  after.

### 7.2 — Real email delivery

- A genuine transactional-email layer (`lib/mail.ts`) behind one interface, used
  by invitations, email verification, password reset, incident notices and
  digest notifications. Provider-agnostic; dev writes to a local outbox so the
  flow is testable without sending mail.
- Templates are plain-text-first with a minimal HTML twin; **no tracking pixels,
  no click-tracking redirects, no remote images** — an email tracker is a tracker,
  and the privacy promise does not stop at the browser.
- Rate-limited and queued with retry; bounces and failures surface in the
  workspace instead of vanishing.
- 🔒 SPF/DKIM/DMARC configured before the first send · recipient addresses never
  logged in plaintext beyond the audit actor snapshot · unsubscribe honoured for
  everything except security-critical mail (which is disclosed as such).

### 7.3 — Complete Founder access management

The exclusive Founder console (`/app/access`), finished:
- Every account, its role, its effective capabilities, MFA state, last login,
  active sessions, and its full audit trail on one screen.
- Role change, per-person grant/revoke with **expiry** (`PermissionGrant` already
  carries `expiresAt` — this phase makes it real, including automatic lapse), and
  session revocation (`sessionVersion` bump).
- **First-class offboarding** (the Phase 6-old gate, now here): one action →
  sessions revoked, capabilities stripped, role demoted, invitations killed,
  ownership of products/teams reassigned, fully audited — and the audit chain
  still verifies afterwards (the 5.6 fix is what makes this safe).
- Quarterly **access review**: the Founder is shown everyone holding elevated
  capability and confirms or revokes, on the record. This is a permanent
  Continuous-Security item given a UI.

### 7.4 — The permission system made real end-to-end

- Grant expiry enforced in `effectiveCapabilities()`, not just stored.
- A "why can this person do this?" **explain view** — role default vs. explicit
  grant vs. reserved — so authorization is inspectable rather than folkloric.
- Capability catalogue extended for everything Phases 6–9 introduce
  (`people.invite`, `people.manage`, `attendance.manage`, `leave.approve`,
  `support.respond`, `analytics.read`, `notifications.broadcast`, …), each
  grantable, each defaulted per role, each enforced server-side.
- 🔒 `test:permissions` extended: forged grants for every *new* capability are
  written straight into the table and must still fail to escalate; founder-reserved
  set remains non-delegable; an expired grant grants nothing.

🔒 **Exit criteria:** two-person review (this phase touches authorization) ·
invitation tokens single-use/expiring/hashed · offboarding leaves a verifying
audit chain · E2E covers invite → accept → MFA → first login → offboard.

## Phase 8 — Workforce Operations: Attendance, Leave & Calendar ⏳

*The HR function of Phase 5.7 (an EMPLOYEE with an HR title, not a new rung on
the ladder) gets the tools it needs. The role ladder does not change.*

- **Attendance** — clock-in/out or day-state marking, per-person history, team
  view for managers, corrections that are *requested and approved* rather than
  silently overwritten (an attendance record that anyone can quietly rewrite is
  worthless), every correction audited.
- **Leave management** — leave types and balances, request → approve/reject →
  balance adjustment, delegation while away, manager and HR views, cancellation
  and audit. Approval runs on `leave.approve`, granted per person, so approval
  authority is explicit rather than implied by seniority.
- **Holiday calendar** — company holidays and regional sets, published to the
  workspace, feeding leave-balance maths; the Founder (or a `calendar.manage`
  holder) maintains it. Team calendar shows who is out, without exposing *why*.
- **Employee, Co-Founder and HR workflows** built on the above: onboarding
  checklist for a new joiner, task and workload views already in 5.3 wired to real
  assignment, manager approval chains, Co-Founder's full operational view minus
  founder-reserved actions, HR's directory-and-people view.
- 🔒 **Attendance and leave data are sensitive personal data.** Visibility is
  scoped by relationship (self / manager / HR / founder) through query helpers —
  never "all employees" reads in a page. Leave *reasons* and any health-adjacent
  note are readable only by the approver chain, and stated as such in the privacy
  policy. Retention limits are defined here, not deferred.

🔒 **Exit criteria:** every new table has a scoped helper and a guard · no
cross-employee data leak in E2E (an employee tries to read another's attendance
and is refused) · privacy policy updated *before* the feature ships.

## Phase 9 — Support, Notifications & Response ⏳

- **Service Request / Support Center** — an internal and collaborator-facing
  request system: category, priority, description, attachments, assignment,
  status lifecycle, threaded replies, resolution and SLA timers. It reuses the
  Phase 5.3 messaging discipline: a thread is readable only by its participants
  plus the responding staff, bodies are sanitized on write and rendered as plain
  text, attachments go through the Phase 3 upload gates. Collaborators reach staff
  and never each other.
- **A notification system that actually works** — one event bus, three sinks: the
  top-bar bell (persistent, per-user, read/unread, deep-linked), digest email
  (Phase 7.2), and the existing second-channel alerting for privileged events
  (R7b) which stays separate and unmuteable. Per-user preferences from §6.2.
  Notifications are *generated by real domain events* — an invitation accepted, a
  leave request awaiting you, a release quarantined, a support request assigned —
  never by a timer that invents them.
- 🔒 A notification must not leak what its recipient cannot open: the payload is
  built through the same scoped helpers as the destination page, and the
  deep-link re-checks server-side. Broadcast is a capability
  (`notifications.broadcast`), not a role assumption.

🔒 **Exit criteria:** support attachments pass upload gates · notification
payloads carry no unauthorized data (E2E asserts) · no notification path bypasses
`lib/guard.ts`.

## Phase 10 — Premium Dark Mode: an original design language ⏳

*Light Mode is finished and frozen — it does not change in this phase.* Dark Mode
today is the same layout with darker tokens. It becomes **its own, deliberately
authored theme**: not an inversion, not a filter, and not a copy of the reference
screenshot (`EduSentinel AI pics/Screenshot 2026-07-14 013234.png`), which is
**inspiration for the physics of the surface only** — depth, light bleed, glass —
never for its layout, palette or content.

The goal is a surface that reads as **handcrafted**: something a design team
argued over. Template-derived, generically "AI-looking" output is a failure
condition for this phase, not a stylistic preference.

- **Deep-black canvas** with layered elevation — near-black base, lifted panels,
  and light that comes *from inside* the interface (a card is lit by its own
  content) rather than from a flat overlay.
- **Premium glassmorphism** — hairline borders, real backdrop blur, edge
  highlights that respond to elevation. Applied where it means something (panels,
  overlays, the command surface), not sprayed across every div.
- **EduSentinel brand identity, not a stock aesthetic** — cyan/teal remains an
  *accent and large-type* colour only (it fails AA at body size on dark; that rule
  from the project charter is not relaxed for beauty). The dark palette is
  authored to hit AA at body size, then the accent is used for light, not for
  text.
- **Animated meteor-shower / particle field** behind the shell — slow, sparse,
  parallaxed, GPU-cheap, and *silent under `prefers-reduced-motion`* (the media
  query is honoured from the first commit, per 5.6). It runs on a canvas that
  pauses off-screen and on battery-saver; ambience must never cost a frame of
  interaction.
- **Subtle 3D motion** — pointer-reactive tilt/parallax on cards measured in a
  few degrees, spring-eased, never on data-dense tables where it would fight
  reading.
- **Premium transitions and unique interactions** — a real motion vocabulary
  (shared-element route transitions, magnetic hover, staggered reveals, a
  glass command palette), all speaking one language defined in tokens.
- **Modern enterprise feel** — restrained. Density, alignment and typographic
  rhythm are what make it read as production SaaS; the effects are the finish, not
  the substance.

Implementation rules (so this stays maintainable rather than becoming a pile of
one-off CSS):
- Everything lands as **tokens in `packages/ui/src/tokens.css`** — a dark-theme
  token layer (surface elevations, glass blur/border, glow, motion curves,
  durations). App code keeps hard-coding **nothing**: no hex, no ms. This is an
  existing project rule and this phase is where it is most tempting to break.
- Theme is a real switch (system / light / dark), persisted per user (§6.2), with
  **no flash of the wrong theme** on first paint.
- 🔒 Effects must not weaken the CSP (R4): no inline style injection, no
  `unsafe-inline`, no remote fonts or shaders pulled from a CDN — the no-tracker
  and CSP invariants outrank the visual.
- 🔒 Accessibility is a gate, not a nice-to-have: AA contrast at body size in dark
  mode, visible focus rings on glass, full keyboard reachability of every new
  interaction, and complete parity with reduced motion.

🔒 **Exit criteria:** Light Mode pixel-unchanged (asserted) · contrast audit
passes AA · reduced-motion parity · CSP unchanged and `check:trackers` green ·
Lighthouse performance not regressed by the particle layer.

## Phase 11 — Production-Ready Dashboard ⏳ (merges with the Pre-Launch Gate)

The workspace stops being a demo and becomes a product that can carry a real
company.

- Real empty / loading / error / offline states on every surface; skeletons, not
  spinners-on-white. No unhandled server-action failure reaches the user as a
  stack trace.
- Performance: pagination and indexed queries everywhere a list can grow, no N+1
  reads in the dashboard, cached aggregates for analytics.
- Full responsive pass (the 5.6 mobile drawer generalised to every new surface),
  keyboard and screen-reader pass, print/export sanity.
- Observability: structured logs, error reporting reaching a human, health checks
  — self-hosted, no third-party telemetry SDK in the browser.
- Postgres migration rehearsed (schema is already portable), backup + tested
  restore, secret manager, rate rules — i.e. **the Pre-Launch Gate below is
  executed as part of this phase**, not left as a page of intentions.
- 🔒 Exit: external penetration test of the authenticated workspace · full
  `test:security` / `test:permissions` / `test:pipeline` / `test:content` /
  `test:e2e` / `audit:verify` green · two-person review · Pre-Launch checklist
  signed off by the Founder.

## Pre-Launch Gate 🔒 (MEDIUM tier — executed inside Phase 11)

Full checklist in [SECURITY-ROADMAP.md §7](./SECURITY-ROADMAP.md#7-pre-public-launch-security-checklist).
Headlines: production Postgres (TLS, least-privilege role, RLS) · secret
manager + rotation · backups with a tested restore (RPO 24h / RTO 4h) ·
Cloudflare proxy + rate rules + bot mode · monitoring/alerting reaching a
human · incident-response runbook matching the published disclosure SLAs ·
breached-password checking.

## Phase 12 — Expansion ⏳ (per-product, post-launch — was Phase 6)

Browser extension, desktop, mobile clients — all authenticating against the
Phase 2 identity service and distributing via the Phase 3 download center.
Collaboration portal opens to the public. (The employee workspace itself is no
longer deferred here — it ships as part of Phase 5's role-based dashboards, and
its people/HR operations in Phases 7–8.)

🔒 Security gates per product:
- Extension/store publisher accounts: hardware-key MFA, founder-gated releases
  (supply-chain threat domain)
- Employee portal: mandatory MFA, per-person least-privilege permissions,
  first-class offboarding (one action → sessions revoked, roles stripped,
  audited) — **delivered early, in Phase 7.3**
- Collaboration portal: verified-publisher identity, structural tenant
  isolation (RLS), external penetration test **before** public opening

## Continuous Security Track (never "done")

Dependency updates on a 5–7 day adoption delay · quarterly founder access
reviews · quarterly restore drills · accepted-risk reviews in
`SECURITY-NOTES.md` · annual policy review. **Future tier:** WebAuthn hardware
keys · founder approval queue (dual control) · audit anomaly detection ·
SIEM-lite aggregation · bug-bounty rewards · SOC 2-style controls
documentation for enterprise customers.

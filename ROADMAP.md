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

🔒 **Security gates (blocking):**
- Deny-by-default authorization: a capability check on **every** dashboard route
  and server action, server-side. Sidebar filtering is UX only — never the
  enforcement boundary (same rule as `src/middleware.ts`).
- Founder-reserved capabilities provably non-delegable — covered by
  `npm run test:security`, extended with permission-escalation cases
  (no grant path yields FOUNDER; no ADMIN/CO_FOUNDER can self-grant).
- MFA continues to be mandatory for every privileged surface (ADMIN,
  CO_FOUNDER, FOUNDER).
- Collaborator tenant isolation: collaborators reach only their own records,
  via ownership-scoped query helpers (the `lib/products.ts` pattern).
- Two-person review before merge — this phase touches authorization.

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

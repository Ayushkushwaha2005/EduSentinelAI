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

## Pre-Launch Gate 🔒 (MEDIUM tier — before public exposure, any phase)

Full checklist in [SECURITY-ROADMAP.md §7](./SECURITY-ROADMAP.md#7-pre-public-launch-security-checklist).
Headlines: production Postgres (TLS, least-privilege role, RLS) · secret
manager + rotation · backups with a tested restore (RPO 24h / RTO 4h) ·
Cloudflare proxy + rate rules + bot mode · monitoring/alerting reaching a
human · incident-response runbook matching the published disclosure SLAs ·
breached-password checking.

## Phase 5 — Expansion ⏳ (per-product, post-launch)

Browser extension, desktop, mobile clients — all authenticating against the
Phase 2 identity service and distributing via the Phase 3 download center.
Employee portal when headcount demands it. Collaboration portal opens to the
public.

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

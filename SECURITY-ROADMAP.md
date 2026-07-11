# EduSentinel AI — Security Roadmap

*Version 1.0 · 2026-07-12 · Owner: Founder (Ayush Kushwaha) · Status: approved planning document*

This document is the platform's security constitution. It governs every phase in
[ROADMAP.md](./ROADMAP.md): **no phase ships without its security gates.** Accepted
day-to-day findings live in [SECURITY-NOTES.md](./SECURITY-NOTES.md).

---

## 1. Security Architecture Review (summary of findings)

Reviewed 2026-07-12 against the full platform vision (AI applications, browser
extensions, desktop apps, cloud utilities, learning, research, collaboration
portal, employee portal), not only the current code.

| Domain | State | Key finding |
|---|---|---|
| Authentication | Built (Phase 2) | argon2id, timing-safe lookup, zod validation ✓ — but no rate limiting, MFA, email verification, or password reset |
| Sessions | Built | Stateless 8h JWT — **no revocation**; demoted/compromised accounts stay live until expiry |
| Authorization | Built (minimal) | Server-side checks ✓; RBAC is binary (admin/not), no ownership model, no role-grant rules yet |
| Founder security | Seed script only | No technical barrier prevents future tooling from demoting/cloning FOUNDER |
| Web defenses | Partial | nosniff/frame-deny/referrer/permissions headers ✓, React encoding ✓, Prisma parameterization ✓ — **no CSP, no HSTS**, cookie/CORS config implicit |
| Database & secrets | Dev-grade | SQLite dev fine; production needs least-privilege role, TLS, RLS; no rotation story; `.env` hygiene verified clean |
| Audit logging | Built (thin) | Exists from day one ✓ — but deletable, no IP/UA, no failed-login events, no alerting |
| Publishing/downloads | Design only (Phase 3) | Signing+checksums committed ✓; upload validation, malware scanning, quarantine, revocation undefined |
| Employee/Collab portals | Future | Require granular RBAC, tenant isolation, mandatory MFA, offboarding flow |
| CI/CD & supply chain | Partial | Lint/typecheck/build ✓, lockfile ✓ — audit policy not enforced in CI, no secret scan, no branch protection, actions unpinned |
| Ops (backup/DR/monitoring/DDoS) | None | Appropriate pre-launch; all launch-blocking (see §7) |

## 2. Identified Security Risks (ranked)

| # | Risk | Severity |
|---|---|---|
| R1 | No rate limiting / brute-force protection on auth | **Critical** |
| R2 | No session revocation (pure stateless JWT) | **Critical** |
| R3 | Founder role unprotected beyond a string compare | **Critical** |
| R4 | No Content-Security-Policy header | **High** |
| R5 | Upload/publishing pipeline undefined (malware distribution risk) | **High** (Critical at Phase 3) |
| R6 | No MFA for any role | **High** |
| R7 | Audit log deletable and thin | **High** |
| R8 | CI lacks dependency/secret scanning; no branch protection | **High** |
| R9 | No email verification / password reset | Medium |
| R10 | No backups / disaster recovery | Medium (Critical at launch) |
| R11 | No monitoring, alerting, or incident runbook | Medium |
| R12 | Coarse RBAC without resource ownership | Medium |

## 3. Missing Security Features (consolidated)

- **Auth:** rate limiting, progressive lockout, TOTP MFA (→ WebAuthn), email
  verification, password reset (single-use expiring tokens), breached-password
  check, signup bot defense.
- **Sessions:** revocation, session inventory ("sign out everywhere"), step-up
  re-authentication for sensitive actions.
- **Authorization:** permission-granular RBAC, `owner_id` resource checks,
  codified role-grant rules (§4).
- **Web:** CSP with nonces, HSTS, explicit cookie flags, explicit CORS policy.
- **Data:** least-privilege production DB role, TLS-required connections,
  Postgres RLS on tenant tables, encrypted TOTP secrets.
- **Publishing:** magic-byte file validation, size caps, malware scanning
  (ClamAV + VirusTotal), quarantine-until-review, signed expiring download
  URLs, artifact revocation, verified-publisher identity.
- **Ops:** automated backups with tested restores, RPO/RTO targets, uptime and
  error monitoring (privacy-respecting), incident-response runbook, log
  retention policy, Cloudflare proxy + rate rules (DDoS).
- **CI/CD:** blocking `npm audit` gate, gitleaks secret scan, CodeQL,
  Dependabot, branch protection with required review, SHA-pinned actions.

## 4. Founder Trust Model (permanent architectural principle)

The Founder account is the platform's root of trust. These rules are
**architecture, not features** — every future phase must preserve them.

1. **FOUNDER is not a grantable role.** No API, server action, or admin UI may
   ever set `role = FOUNDER`. It exists only via the out-of-band seed path.
   Enforced in code (role-change endpoints reject FOUNDER as source *or*
   target) and in the database (Postgres trigger + single-FOUNDER partial
   unique index).
2. **One-directional, capped role granting.** Founder grants/revokes ADMIN.
   Admins manage only USER/EMPLOYEE. No identity manages peers or superiors.
   A compromised admin can never reach founder controls or mint another admin.
3. **Founder-gated actions** (live FOUNDER session + fresh step-up auth):
   ADMIN grants, release-signing key operations, policy-page changes,
   audit-log export, destructive data operations, payment configuration.
   Implemented as an approval queue (dual control without daily friction).
4. **Founder account hardening:** mandatory MFA the day MFA ships (TOTP now,
   hardware key later); dedicated email; offline break-glass recovery codes
   stored physically; the *shortest* session lifetime of any role.
5. **Compromise containment:** privileged actions log actor + IP + UA;
   hash-chained audit rows make deletion detectable; second-channel alerts on
   ADMIN grants, new-device founder logins, audit anomalies.
6. **Least privilege for everyone else:** EMPLOYEE ships with zero admin
   rights; permissions are per-person, per-need, expiring where possible;
   quarterly access review by the Founder.

## 5. Zero Trust Architecture

Standing principles applied across all phases:

- Every request is verified server-side; middleware and client state are UX
  only, never security boundaries (already the pattern in `app/app/layout.tsx`).
- No identity is trusted by position: employees, admins, and collaborators
  operate strictly within explicit permissions; MFA is mandatory for all
  privileged roles.
- Tenant isolation is structural: collaborator queries are scoped by
  construction (query helpers now, Postgres RLS in production), not by
  developer discipline.
- Services get their own credentials; when the API splits from the web app,
  service-to-service calls authenticate (per-service secrets → mTLS later).
- Inconvenience scales with privilege: the more power a session has, the
  shorter it lives and the more often it re-proves itself.

## 6. Security Hardening Roadmap

Integrated into the master plan in [ROADMAP.md](./ROADMAP.md); summary by tier:

| Tier | Work | When |
|---|---|---|
| **Critical** | Rate limiting + lockout (R1) · session revocation (R2) · Founder role protections (R3) · CSP + HSTS (R4) · TOTP MFA, mandatory for ADMIN/FOUNDER (R6) · email verification + password reset (R9) · audit enrichment: failed logins, IP/UA, role events (R7a) | **Phase 2.1 — before any Phase 3 work** |
| **High** | Upload pipeline: validation, quarantine, malware scan, human review (R5) · release signing + checksums + signed expiring URLs · artifact revocation · ownership-scoped RBAC (R12) · CI gates: audit/gitleaks/CodeQL/Dependabot/branch protection/pinned actions (R8) · hash-chained audit + alerts (R7b) | **Phase 3 gates — publishing does not ship without them** |
| **Medium** | Backups + restore drills, RPO 24h/RTO 4h (R10) · Cloudflare proxy + rate rules · monitoring + alerting (R11) · incident runbook matching public 72h/90-day promises · production secret manager + rotation · least-privilege DB role + RLS · explicit CORS/cookies · breached-password check · signup bot defense | **Pre-launch gate** |
| **Future** | WebAuthn hardware keys · Founder approval queue (dual control) · audit anomaly detection · log aggregation (SIEM-lite) · external penetration test before public Collaboration portal · bug bounty rewards · SOC 2-style controls for enterprise · per-service credentials/mTLS | **Post-launch maturity track** |

## 7. Pre-Public-Launch Security Checklist

- [ ] Rate limiting + lockout live and tested
- [ ] Session revocation verified (password change kills active sessions)
- [ ] MFA enforced for ADMIN and FOUNDER
- [ ] FOUNDER role ungrantable via any endpoint (adversarially tested)
- [ ] CSP + HSTS verified on the production domain
- [ ] Email verification and password reset flows live
- [ ] Secrets in the platform secret manager; none in files; founder seed password purged
- [ ] Production Postgres: TLS, least-privilege role, RLS on tenant tables
- [ ] Backups running and one restore actually performed
- [ ] CI blocks: audit high/critical, leaked secrets, direct pushes to main
- [ ] Cloudflare proxy + rate rules + bot mode enabled
- [ ] Monitoring and alerting reach a human
- [ ] Incident-response runbook written; security@ inbox monitored
- [ ] Audit log covers all privileged actions with IP/UA
- [ ] `security.txt` current; disclosure SLA operationally achievable
- [ ] SN-001 re-checked (Next 16.3 stable) and other accepted risks reviewed
- [ ] Legal policy drafts finalized with review; no placeholders public

## 8. Future Security Recommendations

1. **Enforce the two-person rule as branch protection** — a required-review
   setting cannot be skipped under deadline pressure; a written policy can.
2. **Treat the browser extension as its own threat domain** — store publisher
   accounts get hardware-key MFA and founder-gated releases; extension update
   channels are a prime supply-chain target.
3. **Make the privacy promise machine-checked** — CI greps built output for
   known tracker domains, turning "no third-party trackers" from a marketing
   claim into an enforced invariant.
4. **Sequence honestly** — at pre-launch scale, the Critical tier is the only
   blocking work; the remaining tiers are staged gates. Attempting everything
   at once ships nothing.

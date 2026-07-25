# Security Notes — Known Accepted Risks

| ID | Advisory | Status | Rationale | Revisit |
|----|----------|--------|-----------|---------|
| SN-001 | GHSA-qx2v-qp2m-jg93 — postcss <8.5.10 XSS in stringify output, via `next`'s internally pinned postcss 8.4.31 | Accepted (moderate) | Build-time-only dependency; fix exists only in Next 16.3 canary as of 2026-07-11. All stable Next.js releases carry this. npm override cannot replace Next's internal pin. | Upgrade `next` when 16.3 stable ships, then remove this entry. |
| SN-002 | CSP on statically prerendered marketing pages allows `'unsafe-inline'` scripts (dynamic auth/app routes use strict nonces) | Accepted (low) | Per-request nonces are impossible in cached static HTML; those pages render no user-generated content, and all sources remain pinned to `'self'`. | Revisit if any marketing page gains user-influenced content, or when Next.js hash-based CSP for static pages matures. |
| SN-003 | Auth rate limiter is in-memory (per instance, resets on restart) | Accepted (low) | Single-node deployment; persistent per-account lockout lives in the database and survives restarts. Cloudflare rate rules add the network layer at launch (pre-launch gate). | Replace with a shared store (Redis/Upstash) when deployment becomes multi-instance. |
| SN-004 | Verification/reset emails log to server console when RESEND_API_KEY is unset | **Resolved in production (Phase 10)** | `lib/mail.ts` no longer falls through to the dev outbox when `NODE_ENV=production` — a missing provider is now a hard, recorded `FAILED` in `MailLog` that surfaces in Access Control, instead of returning `{ ok: true }` for mail that never left. The console/outbox path remains for local development only. Operational setup: `docs/email-delivery-setup.md`. | Closed once `RESEND_API_KEY` + `MAIL_FROM` are set in Vercel and the domain is verified. |
| SN-005 | No malware scanner configured in dev (artifacts report `NO_SCANNER`) | Accepted (dev-only) | Scanner adapter supports ClamAV and VirusTotal. `FLAGGED` artifacts can never be published; `NO_SCANNER` artifacts are **hard-blocked from publishing when `NODE_ENV=production`** (`publishBlockedByScan`, covered by `npm run test:pipeline`), so an unscanned artifact cannot reach real users. Dev is permitted to publish unscanned so the pipeline is testable. | Provision `VIRUSTOTAL_API_KEY` or ClamAV on the production host — publishing is blocked until you do. |
| SN-006 | Artifacts stored on the local filesystem (`apps/web/storage/`), not object storage | Accepted (pre-launch) | Single-node dev/staging; files are outside the web root, under generated names, served only via signed expiring URLs. | Move to Cloudflare R2 (per approved architecture) when deployment becomes multi-instance / before public launch. |

Policy: any `npm audit` finding of high/critical severity blocks merge. Moderate findings
require an entry in this table with rationale and a revisit condition.

---

## Outstanding high/critical advisories (pre-existing — NOT introduced by Phase 10)

Recorded here because the policy above says high/critical blocks merge, and these
are currently unaddressed on `main`. Phase 10 introduced **none** of them: the
audit totals are byte-identical to the `pre-polish-baseline` tag
(**14 findings — 12 high, 2 critical**), and the three packages added in Phase 10
(`three`, `@react-three/fiber`, `@react-three/drei`) contribute **zero**.

| Package | Severity | Advisory | Why it is still here |
|---------|----------|----------|----------------------|
| `next-auth`, `@auth/core` | **Critical** | Configuration errors can cause existence-based auth checks to succeed; `getToken()` throws on a malformed `Bearer` header | Fixing means upgrading the authentication stack. Per CLAUDE.md, changes to auth require two-person review; Phase 10 was explicitly scoped to leave authentication untouched. |
| `next` | High | Middleware / proxy bypass in App Router applications using Turbopack | Mitigated in practice: `src/middleware.ts` is only a cookie-presence UX gate and a CSP header. Real enforcement is `auth()` in `app/app/layout.tsx` plus per-page `lib/guard.ts` checks, which a middleware bypass does not reach. Still wants the version bump. |
| `postcss` | High | XSS via unescaped `</style>` in stringify output | Build-time only. Extends SN-001. |
| `sharp` | High | Inherited libvips CVEs | Used at **build time only** (`scripts/build-brand-assets.mjs`) and by Next's image optimizer on trusted, repo-committed assets. No user-supplied image reaches it. |
| `eslint` toolchain (`minimatch`, `brace-expansion`, `eslint-*`) | High | ReDoS / unbounded expansion | Development dependencies; never shipped or executed against untrusted input. |

**Recommended next action (separate change, requires two-person review):** upgrade
`next` and `next-auth` to versions carrying these fixes, then re-run the full
phase-invariant suite. This was deliberately left out of Phase 10, which was a
frontend polish release under an explicit instruction not to modify
authentication, authorization or security.

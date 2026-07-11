# Security Notes — Known Accepted Risks

| ID | Advisory | Status | Rationale | Revisit |
|----|----------|--------|-----------|---------|
| SN-001 | GHSA-qx2v-qp2m-jg93 — postcss <8.5.10 XSS in stringify output, via `next`'s internally pinned postcss 8.4.31 | Accepted (moderate) | Build-time-only dependency; fix exists only in Next 16.3 canary as of 2026-07-11. All stable Next.js releases carry this. npm override cannot replace Next's internal pin. | Upgrade `next` when 16.3 stable ships, then remove this entry. |

Policy: any `npm audit` finding of high/critical severity blocks merge. Moderate findings
require an entry in this table with rationale and a revisit condition.

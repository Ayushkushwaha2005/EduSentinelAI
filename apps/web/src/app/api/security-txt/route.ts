import { ORG_EMAIL } from "@/lib/org-email";

/*
 * /.well-known/security.txt (RFC 9116).
 *
 * WHY THIS IS A ROUTE AND NOT A FILE.
 *
 * It used to live at `public/.well-known/security.txt`. That file is committed,
 * deploys, and is never reachable: Next.js does not serve paths from `public/`
 * whose segments begin with a dot, so `/.well-known/security.txt` returned 404
 * in production while the footer and the security policy page both linked to it.
 * A privacy-first product advertising a vulnerability-reporting address that
 * 404s is worse than not advertising one.
 *
 * `next.config.ts` rewrites the well-known path here. The body is generated from
 * `lib/org-email.ts`, which is already the single source of truth for every
 * organisation address (enforced by `npm run check:emails`) — so the disclosure
 * contact cannot drift away from the one the rest of the product uses, which is
 * exactly what a second hand-maintained copy would eventually do.
 */

export const dynamic = "force-static";
export const revalidate = 86_400;

export function GET() {
  /* RFC 9116 requires Expires and warns against dates far in the future.
     Derived, not typed, so it cannot silently go stale in the repo. */
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  const body = [
    `Contact: mailto:${ORG_EMAIL.security}`,
    "Policy: https://www.edusentinel.tech/legal/security",
    "Preferred-Languages: en",
    `Expires: ${expires.toISOString()}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}

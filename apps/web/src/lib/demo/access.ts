import { auth } from "@/lib/auth";

/*
 * Who may open the /demo sandbox.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NO PRODUCTION AUTHENTICATION WAS CHANGED TO BUILD THIS.
 *
 *   - No new role. The ladder in lib/roles.ts is untouched, so nothing about how
 *     anyone else's access is computed has moved.
 *   - No new capability, no grant, no change to lib/permissions.ts or guard.ts.
 *   - No change to the login flow, the session shape, or lib/auth.ts.
 *
 *   Access is decided by IDENTITY: is the signed-in address the one configured
 *   in DEMO_FOUNDER_EMAIL? That is a single string comparison against a value
 *   that exists only in local .env — there is no production deployment where it
 *   is set, so /demo is closed to everyone in production by default.
 *
 * WHY THIS DOES NOT BREAK THE SANDBOX'S ISOLATION.
 *
 *   Sessions are JWT with no database adapter (lib/auth.ts), so `auth()` decodes
 *   a cookie and returns. It issues no query. This module therefore learns who
 *   you are without reading a single row of production data — which is exactly
 *   the line the demo is not allowed to cross. Everything the sandbox then
 *   RENDERS still comes from lib/demo/data.ts and nowhere else.
 *
 *   scripts/check-demo-isolation.mjs allows this one file to import `@/lib/auth`
 *   and continues to forbid the database and every data-access module across the
 *   whole demo tree.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The configured demo identity, or null when the deployment has none. */
function demoEmail(): string | null {
  const raw = process.env.DEMO_FOUNDER_EMAIL?.trim().toLowerCase();
  if (!raw) return null;

  /*
   * Defence in depth. Even if a company address were ever put in this variable
   * by mistake, it is refused — the sandbox must never be reachable by a real
   * EduSentinel identity, because that is the one case where someone could
   * confuse simulated figures for their own data.
   */
  if (/@([a-z0-9-]+\.)*edusentinel\.(ai|tech|com)$/i.test(raw)) return null;

  return raw;
}

/** True when the current visitor is the configured demo account. */
export async function isDemoViewer(): Promise<boolean> {
  const expected = demoEmail();
  if (!expected) return false; // not configured => sandbox closed

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  return !!email && email === expected;
}

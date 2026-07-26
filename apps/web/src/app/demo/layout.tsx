import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ThemeScript } from "@/components/theme";
import { DemoProvider } from "@/lib/demo/store";
import { DemoShell } from "@/components/demo/shell";
import { isDemoViewer } from "@/lib/demo/access";

/*
 * DEMO FOUNDER MODE — route group (Task 16).
 *
 * NOT PUBLIC. Reachable only by the dedicated demo account, which exists only in
 * local development (see lib/demo/access.ts and prisma/seed-demo.mjs). In any
 * deployment where DEMO_FOUNDER_EMAIL is unset — which is every production
 * deployment — this route is closed to everybody and redirects to /login.
 *
 * The gate is an identity check against a JWT, so it reads no production data
 * and changes no production authentication: no new role, no new capability, no
 * change to the login flow, lib/auth.ts, lib/roles.ts or lib/guard.ts.
 *
 * ⚠ Nothing in this subtree may import `@/lib/db`, `@prisma/client`, or a server
 *   action. `npm run check:demo` fails the build if it does. The single
 *   exception is lib/demo/access.ts, which reads the session cookie and nothing
 *   else.
 */

export const metadata: Metadata = {
  title: "Demo — Founder workspace",
  description:
    "A simulated Founder workspace for local testing. Nothing here is real and nothing is saved.",
  // Never indexed, and never linked from the public site.
  robots: { index: false, follow: false },
};

/* The gate reads a session, so this route cannot be statically prerendered. */
export const dynamic = "force-dynamic";

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  if (!(await isDemoViewer())) {
    // Deliberately the same destination whether you are signed out, signed in as
    // somebody else, or the sandbox is not configured at all — the demo does not
    // advertise its own existence.
    redirect("/login");
  }

  return (
    <>
      {/* /demo is statically prerendered, so it carries the marketing CSP
          (script-src 'self' 'unsafe-inline', accepted risk SN-002) and the theme
          script runs without a nonce exactly as it does on the marketing site. */}
      <ThemeScript />
      <DemoProvider>
        <DemoShell>{children}</DemoShell>
      </DemoProvider>
    </>
  );
}

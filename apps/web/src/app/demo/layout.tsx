import type { Metadata } from "next";
import { ThemeScript } from "@/components/theme";
import { DemoProvider } from "@/lib/demo/store";
import { DemoShell } from "@/components/demo/shell";

/*
 * DEMO FOUNDER MODE — route group (Task 16).
 *
 * PUBLIC AND UNAUTHENTICATED, BY DESIGN.
 *
 * There is no `requireViewer()` here and no session is read, because the demo
 * has nothing to authorise: it holds no real data and can reach no real data.
 * Adding auth would be worse than pointless — it would mean a real session
 * token was in scope on pages whose entire purpose is to be a sandbox.
 *
 * This route lives OUTSIDE `/app`, so `src/middleware.ts` never applies its
 * workspace cookie gate to it and the production shell is untouched.
 *
 * ⚠ Nothing in this subtree may import `@/lib/db`, `@prisma/client`, or a server
 *   action. `npm run check:demo` fails the build if it does.
 */

export const metadata: Metadata = {
  title: "Demo — Founder workspace",
  description:
    "Explore the EduSentinel AI Founder workspace with simulated data. Nothing here is real and nothing is saved.",
  // Not indexed: a dashboard full of invented figures has no business appearing
  // in search results next to the real product pages.
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
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

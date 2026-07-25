import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/guard";
import { isAdminRole } from "@/lib/roles";
import {
  SidebarSkeleton,
  SidebarWithData,
  TopbarSkeleton,
  TopbarWithData,
} from "@/components/dashboard/shell-chrome";
import { navFor } from "@/components/dashboard/nav-config";
import { MeteorField } from "@/components/meteors";
import { ThemeScript } from "@/components/theme";

export const metadata = { robots: { index: false } };

/*
 * Which of the three accents this region belongs to (Phase 9.4).
 *
 * The reference assigns colour by MEANING, not by decoration — the template card
 * is violet, the workflow is cyan, the inbox is amber — and it does so
 * consistently, which is why it reads as one product. So the accent is decided
 * ONCE, here, from the route, and every surface below inherits it: icon tiles,
 * links, hover blooms, focus rings and the glass edge all take their light from
 * `--accent` without a single component knowing which colour it ended up with.
 */
function accentFor(pathname: string): "violet" | "azure" | "amber" {
  // The inbox, in every form it takes: messages, notifications, the collaboration
  // threads, the support desk. Anything that is a conversation waiting for you.
  if (
    pathname.startsWith("/app/messages") ||
    pathname.startsWith("/app/notifications") ||
    pathname.startsWith("/app/support") ||
    pathname.startsWith("/app/collaborations") ||
    pathname.startsWith("/app/admin/collaborations")
  ) {
    return "amber";
  }
  // What you build, publish and ship — the catalogue and its releases.
  if (
    pathname.startsWith("/app/products") ||
    pathname.startsWith("/app/admin/releases")
  ) {
    return "violet";
  }
  // Everything else is the workflow itself: the dashboards, people, teams, tasks,
  // attendance, analytics, access. Live state, progress, connections.
  return "azure";
}

/*
 * The single workspace shell. Everyone — Founder, Co-Founder, Employee,
 * Collaborator — signs in at the same /login and lands here; the shell adapts
 * to the viewer's role and effective capabilities. There is no separate admin
 * portal, and none may be added (see ROADMAP Phase 5).
 *
 * The nav below is filtered for UX only. Enforcement lives in lib/guard.ts,
 * which every page and server action calls independently.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await requireViewer();

  /*
   * MFA onboarding, at the door.
   *
   * MFA is mandatory for privileged roles, and login demands a code once it is
   * enrolled — so an account in that state MUST be walked through enrolment the
   * first time it signs in. Previously only privileged sub-pages redirected, so
   * a Founder could sit on /app with no indication that half the product was
   * closed to them and why.
   *
   * /app/security is exempt (it is the destination) and so is the sign-out form,
   * or this would be a redirect loop.
   */
  const pathname = (await headers()).get("x-pathname") ?? "/app";
  if (
    isAdminRole(viewer.role) &&
    !viewer.mfaEnabled &&
    !pathname.startsWith("/app/security")
  ) {
    const next = /^\/app(\/[\w\-/]*)?$/.test(pathname) ? pathname : "/app";
    redirect(`/app/security?mfa=required&next=${encodeURIComponent(next)}`);
  }

  const items = navFor(viewer.caps as Set<string>, viewer.role);

  /*
   * The chrome's data is NO LONGER AWAITED HERE (Phase 10, Tasks 8 + 9).
   *
   * A layout renders above the route's own Suspense boundary, so five awaited
   * queries in this function blocked `loading.tsx` from ever showing — the whole
   * workspace, chrome and content alike, waited on the slowest of them. That is
   * the unexplained pause after a 2FA code is accepted.
   *
   * The queries now live in components/dashboard/shell-chrome.tsx and stream into
   * the Suspense boundaries below. Authorization did not move: requireViewer()
   * and the MFA gate above still run before anything renders at all.
   */

  // /app is dynamic and carries the strict nonced CSP (src/middleware.ts). The
  // no-flash theme script takes that nonce — Phase 9.4 does not add 'unsafe-inline'
  // to a policy this platform spent Phase 2.1 tightening.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="relative min-h-screen bg-surface-base p-3 md:p-4">
      <ThemeScript nonce={nonce} />
      <MeteorField />
      {/* Task 13: the workspace sidebar is a dozen links deep, so skipping it
          matters more here than anywhere on the marketing site. */}
      <a href="#workspace-content" className="skip-link">
        Skip to content
      </a>

      {/* The workspace sits above the sky, never in it. */}
      <div className="relative z-10 flex gap-4">
        {/* Navigation is the workflow, always — it must not change colour under
            you as you move between regions. Only the CONTENT takes the accent. */}
        <div data-accent="azure" className="contents">
          <Suspense fallback={<SidebarSkeleton />}>
            <SidebarWithData viewer={viewer} items={items} />
          </Suspense>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Suspense fallback={<TopbarSkeleton />}>
            <TopbarWithData viewer={viewer} items={items} />
          </Suspense>
          {/* The region decides its own light (see accentFor above). */}
          <main
            id="workspace-content"
            tabIndex={-1}
            className="min-w-0"
            data-accent={accentFor(pathname)}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

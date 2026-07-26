import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/guard";
import { isAdminRole } from "@/lib/roles";
import {
  RailSkeleton,
  RailWithData,
  WsTopbarSkeleton,
  WsTopbarWithData,
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

  /*
   * THE REFERENCE SHELL.
   *
   * The approved dashboard reference nests four surfaces, and the depth of the
   * design comes entirely from that nesting:
   *
   *   .workspace  the cool grey page
   *     .ws-frame   a rounded near-white device frame floating on it
   *       rail      the icon-only navigation column, inside the frame
   *       .ws-canvas  a grey canvas holding the cards
   *
   * The meteor field is not mounted here any more: the reference has a flat grey
   * page, and a starfield behind a light dashboard was never what it showed.
   * It remains on the marketing site and in dark mode, untouched.
   */
  return (
    /*
     * FULL WIDTH. The frame spans the viewport with only breathing room at the
     * edge — no max-width, no centred column, no wasted margin. On a wide
     * monitor the workspace is the whole monitor.
     */
    <div className="workspace relative min-h-screen p-2 sm:p-3">
      <ThemeScript nonce={nonce} />
      {/*
       * THE METEOR FIELD IS BACK.
       *
       * Removing it was a mistake: it is the dark theme, not decoration on top
       * of one. Light mode now wears the reference's surface and dark mode wears
       * the original meteor shower exactly as it did — the field only ever
       * paints when `data-theme="dark"` (see .meteor-field in globals.css and
       * the gate in components/meteors.tsx), so the two never collide.
       */}
      <MeteorField />
      <a href="#workspace-content" className="skip-link">
        Skip to content
      </a>

      {/*
       * The frame is SIZED TO THE VIEWPORT and scrolls internally, which is how
       * the reference's device behaves — its rail and top bar stay put while the
       * cards move under them.
       *
       * It also fixes a real bug: with the rail as a plain flex column, fifteen
       * nav items made it 1561px tall on a 1050px screen, pushing the theme
       * toggle and the avatar 500px below the fold where they could not be
       * reached. Bounding the height gives `overflow-y-auto` on the nav
       * something to scroll against.
       */}
      <div className="ws-frame relative z-10 flex h-[calc(100vh-1rem)] w-full gap-0 overflow-hidden p-2 sm:h-[calc(100vh-1.5rem)] sm:p-2.5">
        <Suspense fallback={<RailSkeleton />}>
          <RailWithData viewer={viewer} items={items} />
        </Suspense>

        <div className="ws-canvas flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
          <Suspense fallback={<WsTopbarSkeleton />}>
            <WsTopbarWithData viewer={viewer} items={items} />
          </Suspense>

          {/* Only the content scrolls. */}
          <main
            id="workspace-content"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-y-auto pb-2 pr-1"
            data-accent={accentFor(pathname)}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

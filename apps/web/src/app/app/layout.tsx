import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/guard";
import { isAdminRole } from "@/lib/roles";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { navFor } from "@/components/dashboard/nav-config";
import { listConversations } from "@/lib/messages";
import { avatarUrlFor, onlineStaff, touchPresence } from "@/lib/profile";
import { recentNotifications, unreadCount } from "@/lib/notifications";
import { MeteorField } from "@/components/meteors";
import { ThemeScript } from "@/components/theme";
import type { Role } from "@/lib/roles";

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

  const canMessage = viewer.can("messages.use");
  const canSeeTeam = viewer.can("team.view");

  // Everything the shell needs is independent, so it is fetched in ONE parallel
  // batch rather than a chain of awaited round-trips. On a navigation this is the
  // difference between one wait and five stacked back to back.
  //   - Presence rail: internal staff only. External collaborators must not be
  //     able to enumerate the team, so they never receive this list.
  //   - Message peek: listConversations is participant-scoped, so it can only ever
  //     surface threads the viewer belongs to.
  //   - Notifications are per-user by construction — scoped to viewer.id alone.
  const [me, presence, recentAll, notifications, unreadNotifications] =
    await Promise.all([
      db.user.findUnique({
        where: { id: viewer.id },
        select: { id: true, avatarName: true, avatarAt: true, lastSeenAt: true },
      }),
      canSeeTeam ? onlineStaff(5) : Promise.resolve([]),
      canMessage ? listConversations(viewer.id) : Promise.resolve([]),
      recentNotifications(viewer.id, 8),
      unreadCount(viewer.id),
    ]);

  const recent = recentAll.slice(0, 4);
  const unread = recent.filter((c) => c.unread).length;

  // Presence is a measured fact (Phase 6.1): the shell stamps lastSeenAt —
  // throttled, so most navigations return here without touching the database at
  // all, and the rare write is a single indexed UPDATE.
  await touchPresence(viewer.id, me?.lastSeenAt ?? null);

  // /app is dynamic and carries the strict nonced CSP (src/middleware.ts). The
  // no-flash theme script takes that nonce — Phase 9.4 does not add 'unsafe-inline'
  // to a policy this platform spent Phase 2.1 tightening.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="relative min-h-screen bg-surface-base p-3 md:p-4">
      <ThemeScript nonce={nonce} />
      <MeteorField />

      {/* The workspace sits above the sky, never in it. */}
      <div className="relative z-10 flex gap-4">
        {/* Navigation is the workflow, always — it must not change colour under
            you as you move between regions. Only the CONTENT takes the accent. */}
        <div data-accent="azure" className="contents">
          <Sidebar items={items} presence={presence} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Topbar
            name={viewer.name}
            role={viewer.role as Role}
            avatarUrl={me ? avatarUrlFor(me) : null}
            nav={items}
            unreadNotifications={unreadNotifications}
            notifications={notifications.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              href: n.href,
              unread: !n.readAt,
              time: n.createdAt.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }))}
            showMessages={canMessage}
            unread={unread}
            messages={recent.map((c) => ({
              id: c.id,
              title: c.title,
              preview: c.preview,
              time: c.lastAt.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              unread: c.unread,
            }))}
          />
          {/* The region decides its own light (see accentFor above). */}
          <main className="min-w-0" data-accent={accentFor(pathname)}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

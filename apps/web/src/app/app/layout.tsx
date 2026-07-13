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
import type { Role } from "@/lib/roles";

export const metadata = { robots: { index: false } };

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

  const me = await db.user.findUnique({
    where: { id: viewer.id },
    select: { id: true, avatarName: true, avatarAt: true, lastSeenAt: true },
  });

  // Presence is now a measured fact (Phase 6.1): the shell stamps lastSeenAt —
  // throttled, so a navigation is not a write — and the rail below shows only
  // people actually seen in the last five minutes. It used to hard-code `online`
  // on the five oldest staff accounts, which was decoration wearing data's clothes.
  await touchPresence(viewer.id, me?.lastSeenAt ?? null);

  // Presence rail: internal staff only. External collaborators must not be
  // able to enumerate the team, so they never receive this list.
  const presence = viewer.can("team.view") ? await onlineStaff(5) : [];

  // Message peek in the top bar. listConversations is participant-scoped, so
  // this can only ever surface threads the viewer belongs to.
  const canMessage = viewer.can("messages.use");
  const recent = canMessage ? (await listConversations(viewer.id)).slice(0, 4) : [];
  const unread = recent.filter((c) => c.unread).length;

  return (
    <div className="min-h-screen bg-surface-base p-3 md:p-4">
      <div className="flex gap-4">
        <Sidebar items={items} presence={presence} />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Topbar
            name={viewer.name}
            role={viewer.role as Role}
            avatarUrl={me ? avatarUrlFor(me) : null}
            nav={items}
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
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

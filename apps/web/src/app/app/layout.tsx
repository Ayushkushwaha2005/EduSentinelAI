import { db } from "@/lib/db";
import { requireViewer } from "@/lib/guard";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { navFor } from "@/components/dashboard/nav-config";
import { listConversations } from "@/lib/messages";
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

  const items = navFor(viewer.caps as Set<string>, viewer.role);

  // Presence rail: internal staff only. External collaborators must not be
  // able to enumerate the team, so they never receive this list.
  const presence = viewer.can("team.view")
    ? await db.user.findMany({
        where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: { name: true, memberships: { take: 1, select: { title: true } } },
      })
    : [];

  // Message peek in the top bar. listConversations is participant-scoped, so
  // this can only ever surface threads the viewer belongs to.
  const canMessage = viewer.can("messages.use");
  const recent = canMessage ? (await listConversations(viewer.id)).slice(0, 4) : [];
  const unread = recent.filter((c) => c.unread).length;

  return (
    <div className="min-h-screen bg-surface-base p-3 md:p-4">
      <div className="flex gap-4">
        <Sidebar
          items={items}
          presence={presence.map((p) => ({
            name: p.name,
            title: p.memberships[0]?.title ?? null,
          }))}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Topbar
            name={viewer.name}
            role={viewer.role as Role}
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

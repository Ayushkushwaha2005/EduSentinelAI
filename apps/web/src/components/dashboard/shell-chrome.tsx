import { db } from "@/lib/db";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { listConversations } from "@/lib/messages";
import { avatarUrlFor, onlineStaff, touchPresence } from "@/lib/profile";
import { recentNotifications, unreadCount } from "@/lib/notifications";
import type { NavItem } from "./nav-config";
import type { Viewer } from "@/lib/guard";
import type { Role } from "@/lib/roles";

/*
 * The workspace chrome, as two independently-streamed async components
 * (Phase 10, Tasks 8 + 9).
 *
 * WHY THIS FILE EXISTS. The /app layout used to `await` five queries plus a
 * presence write before it returned a single element. Because a layout renders
 * ABOVE the route's own Suspense boundary, that wait happened before
 * `loading.tsx` could show anything — so the entire workspace, chrome and
 * content alike, was gated on the slowest of them. Straight after a 2FA code was
 * accepted, that is exactly the pause Task 9 is about.
 *
 * Splitting the chrome out lets the layout return immediately and stream these
 * in. The frame — background, spacing, the main column — paints at once; the
 * sidebar and top bar fill in a beat later against a skeleton of their own
 * shape.
 *
 * ⚠ NOTHING HERE IS AN AUTHORIZATION CHANGE. `requireViewer()` and the MFA gate
 * stay in the layout, above these components, and still run before anything
 * renders. Every query below is the same scoped call it always was, with the
 * same capability checks in front of it:
 *   - the presence rail is internal staff only, so an external collaborator
 *     still cannot enumerate the team;
 *   - listConversations is participant-scoped;
 *   - notifications are per-user by construction.
 * These are display reads that were already safe to run; they are simply no
 * longer in the critical path.
 */

export function SidebarSkeleton() {
  return (
    <aside
      aria-hidden="true"
      className="hidden w-[264px] shrink-0 animate-pulse flex-col rounded-panel bg-surface-raised md:flex"
    >
      <div className="px-7 pt-7">
        <div className="h-9 w-40 rounded-full bg-surface-overlay" />
      </div>
      <div className="mt-10 flex flex-col gap-2 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-control bg-surface-overlay/70" />
        ))}
      </div>
    </aside>
  );
}

export function TopbarSkeleton() {
  return (
    <header
      aria-hidden="true"
      className="flex h-[76px] animate-pulse items-center justify-between gap-4 rounded-panel bg-surface-raised px-3 sm:px-4 md:px-6"
    >
      <div className="h-10 w-44 rounded-full bg-surface-overlay" />
      <div className="flex items-center gap-4">
        <div className="hidden h-11 w-[220px] rounded-full bg-surface-overlay xl:block" />
        <div className="h-9 w-9 rounded-full bg-surface-overlay" />
        <div className="h-[42px] w-[42px] rounded-full bg-surface-overlay" />
      </div>
    </header>
  );
}

/** The presence rail's data. Internal staff only — see the note above. */
export async function SidebarWithData({
  viewer,
  items,
}: {
  viewer: Viewer;
  items: NavItem[];
}) {
  const presence = viewer.can("team.view") ? await onlineStaff(5) : [];
  return <Sidebar items={items} presence={presence} />;
}

export async function TopbarWithData({
  viewer,
  items,
}: {
  viewer: Viewer;
  items: NavItem[];
}) {
  const canMessage = viewer.can("messages.use");

  // Still one parallel batch — the point was never that these were serial, it is
  // that the whole page waited on them.
  const [me, recentAll, notifications, unreadNotifications] = await Promise.all([
    db.user.findUnique({
      where: { id: viewer.id },
      select: { id: true, avatarName: true, avatarAt: true, lastSeenAt: true },
    }),
    canMessage ? listConversations(viewer.id) : Promise.resolve([]),
    recentNotifications(viewer.id, 8),
    unreadCount(viewer.id),
  ]);

  const recent = recentAll.slice(0, 4);
  const unread = recent.filter((c) => c.unread).length;

  // Presence is a measured fact (Phase 6.1): the shell stamps lastSeenAt —
  // throttled, so most navigations return here without touching the database at
  // all, and the rare write is a single indexed UPDATE. It rides along here
  // rather than in the layout so it is off the critical path too.
  await touchPresence(viewer.id, me?.lastSeenAt ?? null);

  return (
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
  );
}

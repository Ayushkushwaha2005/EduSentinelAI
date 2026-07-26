import { db } from "@/lib/db";
import { WsRail } from "./ws-rail";
import { WsTopbar } from "./ws-topbar";
import { avatarUrlFor, touchPresence } from "@/lib/profile";
import { recentNotifications, unreadCount } from "@/lib/notifications";
import type { NavItem } from "./nav-config";
import type { Viewer } from "@/lib/guard";
import type { Role } from "@/lib/roles";

/*
 * The workspace chrome, as independently-streamed async components.
 *
 * WHY: a layout renders ABOVE the route's own Suspense boundary, so awaiting
 * queries here would gate `loading.tsx` from ever painting — the whole workspace
 * would wait on the slowest of them. Splitting the chrome out lets the frame
 * paint immediately and these fill in against skeletons of their own shape.
 *
 * ⚠ NOT AN AUTHORIZATION CHANGE. `requireViewer()` and the MFA gate stay in the
 * layout, above these, and still run before anything renders. Every query below
 * is the same scoped call it always was.
 */

/* ------------------------------------------------------------ skeletons ---- */

export function RailSkeleton() {
  return (
    <aside
      aria-hidden="true"
      className="hidden w-[76px] shrink-0 animate-pulse flex-col items-center py-6 lg:flex"
    >
      <div className="h-14 w-14 rounded-2xl bg-ws-canvas" />
      <div className="mt-10 flex flex-col gap-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-11 w-11 rounded-[14px] bg-ws-canvas" />
        ))}
      </div>
    </aside>
  );
}

export function WsTopbarSkeleton() {
  return (
    <header
      aria-hidden="true"
      className="flex animate-pulse items-center gap-4 px-1 pb-5 pt-1"
    >
      <div className="h-[52px] w-full max-w-[430px] rounded-full bg-white/70" />
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden h-[46px] w-[150px] rounded-full bg-white/70 md:block" />
        <div className="h-[50px] w-[190px] rounded-full bg-white/70" />
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- data ---- */

export async function RailWithData({
  viewer,
  items,
}: {
  viewer: Viewer;
  items: NavItem[];
}) {
  const me = await db.user.findUnique({
    where: { id: viewer.id },
    select: { id: true, avatarName: true, avatarAt: true, lastSeenAt: true },
  });

  // Presence is a measured fact (Phase 6.1): throttled, so most navigations
  // return here without touching the database at all.
  await touchPresence(viewer.id, me?.lastSeenAt ?? null);

  return (
    <WsRail
      items={items}
      name={viewer.name}
      avatarUrl={me ? avatarUrlFor(me) : null}
    />
  );
}

export async function WsTopbarWithData({
  viewer,
  items,
}: {
  viewer: Viewer;
  items: NavItem[];
}) {
  const [me, notifications, unreadNotifications] = await Promise.all([
    db.user.findUnique({
      where: { id: viewer.id },
      select: { id: true, avatarName: true, avatarAt: true },
    }),
    recentNotifications(viewer.id, 8),
    unreadCount(viewer.id),
  ]);

  return (
    <WsTopbar
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
    />
  );
}

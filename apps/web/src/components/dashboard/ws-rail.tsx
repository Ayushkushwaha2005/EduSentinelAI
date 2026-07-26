"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import { LogoMark } from "@/components/logo";
import { Avatar } from "./avatar";
import { ThemeToggle } from "@/components/theme";
import type { NavItem, NavIcon } from "./nav-config";
import {
  BellIcon, BoxIcon, CalendarIcon, ChatIcon, ClipboardIcon, GridIcon,
  KeyIcon, ReportIcon, ServerIcon, ShieldIcon, UserIcon, UsersIcon,
} from "./icons";

/*
 * The left rail, from the reference.
 *
 * ICON-ONLY, and narrow. The reference's rail is a column of unlabelled glyphs
 * with the active one marked by a small dot to its LEFT — not a filled pill, not
 * a left border. That dot is the whole active treatment and it is reproduced
 * exactly (see .ws-rail-item in globals.css).
 *
 * Every route from nav-config still appears. The reference shows six icons
 * because its product has six sections; ours has more, and dropping any of them
 * would break requirement 3 ("keep the current routing"). Labels move into a
 * tooltip on hover and into the accessible name, so nothing is lost to a screen
 * reader — an icon-only rail with no accessible names would be unusable.
 *
 * Bottom of the rail, again from the reference: the light/dark pill, then the
 * viewer's avatar in a rounded square.
 */

const ICONS: Record<NavIcon, (p: { size?: number }) => React.ReactElement> = {
  grid: GridIcon, user: UserIcon, users: UsersIcon, box: BoxIcon,
  server: ServerIcon, clipboard: ClipboardIcon, report: ReportIcon,
  shield: ShieldIcon, key: KeyIcon, chat: ChatIcon, calendar: CalendarIcon,
  bell: BellIcon,
};

/* memo: the rail re-renders only when the route or its items actually change.
   Without it every parent render walks the whole nav list again. */
const RailLink = memo(function RailLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const Icon = ICONS[item.icon];
  return (
    <li className="relative flex justify-center">
      <Link
        href={item.href}
        // prefetch: the rail is the primary navigation, so every destination is
        // warmed as soon as it is on screen. This is the single biggest lever on
        // perceived click latency (requirement 4).
        prefetch
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
        title={item.label}
        className={`ws-rail-item group flex h-11 w-11 items-center justify-center rounded-[14px] ${
          active
            ? "bg-ws-canvas text-ws-ink"
            : "text-ws-dim hover:bg-ws-canvas hover:text-ws-ink"
        }`}
      >
        <Icon size={20} />
        {/* tooltip, on hover/focus only — the rail stays icon-only at rest */}
        <span
          role="tooltip"
          className="pointer-events-none absolute left-[calc(100%+10px)] z-50 hidden whitespace-nowrap rounded-lg bg-ws-ink px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:block"
        >
          {item.label}
        </span>
      </Link>
    </li>
  );
});

export function WsRail({
  items,
  name,
  avatarUrl,
}: {
  items: NavItem[];
  name: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-[76px] shrink-0 flex-col items-center py-5 lg:flex">
      {/* Logo. Enlarged: the mark now fills its well rather than floating in the
          middle of it, and the well itself is wider — at 76px of rail, a 56px
          well with a 42px mark is the largest that still leaves the rail
          balanced against the icon column below it. */}
      <Link href="/app" aria-label="EduSentinel AI" className="shrink-0">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ws-canvas transition-transform hover:scale-105">
          <LogoMark size={42} priority />
        </span>
      </Link>

      {/* min-h-0 is what lets this actually scroll inside a flex column rather
          than growing the rail past the frame. */}
      <nav
        aria-label="Workspace"
        className="mt-8 min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex flex-col items-center gap-1.5">
          {items.map((item) => (
            <RailLink
              key={item.href + item.label}
              item={item}
              active={
                item.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(item.href)
              }
            />
          ))}
        </ul>
      </nav>

      {/* the reference's vertical light/dark pill — pinned to the foot of the
          rail, never pushed off by the length of the nav */}
      <div className="mt-5 flex shrink-0 flex-col items-center gap-3.5">
        <span className="flex flex-col items-center rounded-full bg-white p-1 shadow-ws-pill">
          <ThemeToggle />
        </span>

        <Link
          href="/app/profile"
          prefetch
          aria-label={`${name} — profile`}
          title={name}
          className="rounded-[14px] ring-1 ring-ws-line transition-transform hover:scale-105"
        >
          <Avatar name={name} size={40} src={avatarUrl} />
        </Link>
      </div>
    </aside>
  );
}

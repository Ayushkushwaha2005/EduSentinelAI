import Link from "next/link";
import { Avatar } from "./avatar";
import { SearchIcon } from "./icons";
import { MobileNav } from "./mobile-nav";
import { NotificationBell, type BellItem } from "./notification-bell";
import { SignOutButton } from "./sign-out";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import type { NavItem } from "./nav-config";

/*
 * The top bar, from the reference.
 *
 * Left: a wide search pill with the magnifier in a filled dark circle at its
 * right edge, then a separate circular button beside it.
 * Right: the mint "Online support" pill, then a white pill holding the bell and
 * the identity chip.
 *
 * The reference's second circular button is a microphone (voice search). This
 * app has no voice search, and shipping a control that does nothing is against
 * a standing rule here — so that slot holds the sign-out control instead, which
 * is a real action that needs a home now the rail is icon-only.
 */
export function WsTopbar({
  name,
  role,
  avatarUrl = null,
  nav = [],
  notifications = [],
  unreadNotifications = 0,
}: {
  name: string;
  role: Role;
  avatarUrl?: string | null;
  nav?: NavItem[];
  notifications?: BellItem[];
  unreadNotifications?: number;
}) {
  return (
    <header className="flex items-center gap-3 px-1 pb-5 pt-1 sm:gap-4">
      <div className="lg:hidden">
        <MobileNav items={nav} />
      </div>

      {/* search — a real GET form to /app/search, scoped server-side */}
      <form action="/app/search" className="relative min-w-0 flex-1 sm:max-w-[430px]">
        <label className="sr-only" htmlFor="ws-search">
          Search the workspace
        </label>
        <input
          id="ws-search"
          name="q"
          type="search"
          placeholder="Search..."
          className="h-[52px] w-full rounded-full border border-ws-line bg-white pl-6 pr-[60px] text-[15px] text-ws-ink outline-none transition-colors placeholder:text-ws-dim focus:border-ws-ink"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-[6px] top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ws-ink text-white transition-transform hover:scale-105"
        >
          <SearchIcon size={17} />
        </button>
      </form>

      <div className="hidden sm:block">
        <SignOutButton />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/app/support"
          prefetch
          className="hidden h-[46px] items-center rounded-full bg-ws-mint px-6 text-[15px] font-medium text-ws-ink transition-colors hover:bg-ws-mint-deep md:inline-flex"
        >
          Online support
        </Link>

        {/* identity pill: bell + name + avatar, exactly as grouped in the reference */}
        <span className="flex items-center gap-3 rounded-full border border-ws-line bg-white py-[5px] pl-5 pr-[5px]">
          <NotificationBell items={notifications} unread={unreadNotifications} />
          <Link
            href="/app/profile"
            prefetch
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <span className="hidden text-right leading-tight md:block">
              <span className="block text-[15px] font-medium tracking-[-0.01em] text-ws-ink">
                {name}
              </span>
              <span className="block text-[11px] text-ws-dim">
                {ROLE_LABELS[role]}
              </span>
            </span>
            <Avatar name={name} size={40} src={avatarUrl} />
          </Link>
        </span>
      </div>
    </header>
  );
}

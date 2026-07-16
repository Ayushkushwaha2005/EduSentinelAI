import Link from "next/link";
import { Avatar } from "./avatar";
import { SearchIcon } from "./icons";
import { DateCalendar } from "./date-calendar";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { SignOutButton } from "./sign-out";
import { MessagePeek, type PeekItem } from "./message-peek";
import { NotificationBell, type BellItem } from "./notification-bell";
import { ThemeToggle } from "@/components/theme";
import { MobileNav } from "./mobile-nav";
import type { NavItem } from "./nav-config";

/*
 * Top bar from the reference: period label + calendar, global search, messages,
 * identity chip. The identity chip shows the role label so the viewer always
 * knows which authority they are acting under, and links to their profile.
 *
 * The search box is a real GET form to /app/search — results there are scoped to
 * what the viewer may actually see, never a global index.
 *
 * The notification bell was DELETED in Phase 6.1 — it was a <button> with no
 * handler wearing a permanently-lit unread dot, announcing notifications that did
 * not exist and could not be opened. Phase 9 built the notifications, so it is
 * back: the count is real, every item is a domain event, and the dot only lights
 * when something is actually unread.
 */
export function Topbar({
  name,
  role,
  avatarUrl = null,
  unread = 0,
  messages = [],
  showMessages = false,
  nav = [],
  notifications = [],
  unreadNotifications = 0,
}: {
  name: string;
  role: Role;
  avatarUrl?: string | null;
  unread?: number;
  messages?: PeekItem[];
  showMessages?: boolean;
  nav?: NavItem[];
  notifications?: BellItem[];
  unreadNotifications?: number;
}) {
  return (
    <header className="flex h-[76px] items-center justify-between gap-4 rounded-card bg-surface-raised px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav items={nav} />
        <DateCalendar now={new Date().toISOString()} />
      </div>

      <div className="flex items-center gap-4">
        <form action="/app/search" className="relative hidden sm:block">
          <label className="sr-only" htmlFor="workspace-search">
            Search the workspace
          </label>
          <SearchIcon
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            id="workspace-search"
            name="q"
            type="search"
            placeholder="Search"
            className="h-11 w-[220px] rounded-full border border-border-subtle bg-surface-raised pl-5 pr-11 text-[15px] outline-none transition-colors duration-[--duration-fast] placeholder:text-text-muted focus:border-brand-cyan lg:w-[260px]"
          />
        </form>

        {/* Messages and notifications ARE the inbox, so they are amber wherever
            you happen to be standing — the reference's rule: colour means a thing,
            it does not decorate a place. */}
        <span data-accent="amber" className="flex items-center gap-4">
          {showMessages && <MessagePeek items={messages} unread={unread} />}
          <NotificationBell items={notifications} unread={unreadNotifications} />
        </span>

        <ThemeToggle />

        <div className="flex items-center gap-3 border-l border-border-subtle pl-4">
          <Link
            href="/app/profile"
            className="flex items-center gap-3 rounded-control transition-colors duration-[--duration-fast] hover:opacity-80"
          >
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-[15px] font-semibold tracking-[-0.01em]">
                {name}
              </span>
              <span className="block text-xs text-text-muted">{ROLE_LABELS[role]}</span>
            </span>
            <Avatar name={name} size={42} src={avatarUrl} />
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

import { Avatar } from "./avatar";
import { BellIcon, CalendarIcon, SearchIcon } from "./icons";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { SignOutButton } from "./sign-out";
import { MessagePeek, type PeekItem } from "./message-peek";
import { MobileNav } from "./mobile-nav";
import type { NavItem } from "./nav-config";

/*
 * Top bar from the reference: period label + calendar, global search, message
 * and notification bells, identity chip. The identity chip shows the role
 * label so the viewer always knows which authority they are acting under.
 *
 * The search box is a real GET form to /app/search — results there are scoped to
 * what the viewer may actually see, never a global index.
 */
export function Topbar({
  name,
  role,
  unread = 0,
  messages = [],
  showMessages = false,
  nav = [],
}: {
  name: string;
  role: Role;
  unread?: number;
  messages?: PeekItem[];
  showMessages?: boolean;
  nav?: NavItem[];
}) {
  const period = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex h-[76px] items-center justify-between gap-4 rounded-card bg-surface-raised px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav items={nav} />
        <div className="flex items-center gap-2 text-[15px] font-medium text-text-primary">
          {period}
          <CalendarIcon size={18} className="text-text-secondary" />
        </div>
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

        {showMessages && <MessagePeek items={messages} unread={unread} />}

        <button
          type="button"
          className="relative text-text-secondary transition-colors duration-[--duration-fast] hover:text-text-primary"
          aria-label="Notifications"
        >
          <BellIcon size={22} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand-cyan" />
        </button>

        <div className="flex items-center gap-3 border-l border-border-subtle pl-4">
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-[15px] font-semibold tracking-[-0.01em]">
              {name}
            </span>
            <span className="block text-xs text-text-muted">{ROLE_LABELS[role]}</span>
          </span>
          <Avatar name={name} size={42} />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

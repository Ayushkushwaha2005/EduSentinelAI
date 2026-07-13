"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoWordmark } from "@/components/logo";
import { Avatar } from "./avatar";
import type { NavItem, NavIcon } from "./nav-config";
import {
  BoxIcon,
  ChatIcon,
  ChevronDown,
  ClipboardIcon,
  GridIcon,
  KeyIcon,
  ReportIcon,
  ServerIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "./icons";

const ICONS: Record<NavIcon, (p: { size?: number }) => React.ReactElement> = {
  grid: GridIcon,
  user: UserIcon,
  users: UsersIcon,
  box: BoxIcon,
  server: ServerIcon,
  clipboard: ClipboardIcon,
  report: ReportIcon,
  shield: ShieldIcon,
  key: KeyIcon,
  chat: ChatIcon,
};

/*
 * Presence is measured, not decorated (Phase 6.1). This rail used to render the
 * five oldest staff accounts with `online` hard-coded on every one of them — it
 * claimed the team was at their desks whether or not anyone had signed in for a
 * month. It now shows only people seen in the last five minutes, and shows
 * nothing at all when nobody has been.
 */
export type Presence = {
  name: string;
  title: string | null;
  avatarUrl: string | null;
  online: boolean;
};

export function Sidebar({
  items,
  presence,
}: {
  items: NavItem[];
  presence: Presence[];
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[264px] shrink-0 flex-col rounded-card bg-surface-raised md:flex">
      <div className="px-7 pt-7">
        <Link href="/app" aria-label="EduSentinel AI">
          <LogoWordmark />
        </Link>
      </div>

      <p className="mt-8 px-7 text-sm font-medium text-text-secondary">Main</p>

      <nav aria-label="Workspace" className="mt-2 flex flex-col gap-0.5 px-4">
        {items.map((item) => (
          <NavRow key={item.href + item.label} item={item} pathname={pathname} />
        ))}
      </nav>

      {presence.length > 0 && (
        <div className="mt-auto px-7 pb-7 pt-10">
          <p className="text-[15px] font-semibold tracking-[-0.01em]">Team Online</p>
          <ul className="mt-4 flex flex-col gap-4">
            {presence.map((p) => (
              <li key={p.name} className="flex items-center gap-3">
                <Avatar name={p.name} size={36} src={p.avatarUrl} online={p.online} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-text-primary">
                    {p.name}
                  </span>
                  {p.title && (
                    <span className="block truncate text-xs text-text-muted">
                      {p.title}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function NavRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = ICONS[item.icon];
  const active =
    item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(active);

  return (
    <div>
      <div
        className={`flex items-center rounded-control transition-colors duration-[--duration-fast] ${
          active
            ? "bg-surface-overlay text-brand-cyan"
            : "text-text-secondary hover:bg-surface-overlay/60 hover:text-text-primary"
        }`}
      >
        <Link
          href={item.href}
          className="flex flex-1 items-center gap-3 px-3 py-2.5 text-[15px] font-medium"
          aria-current={active ? "page" : undefined}
        >
          <Icon size={19} />
          {item.label}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
            className="px-3 py-2.5 text-text-muted"
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-[--duration-fast] ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="mb-1 mt-1 flex flex-col gap-1 pl-11">
          {item.children!.map((c) => {
            // Compare paths only — hashes are client-side state and reading
            // them during render would desync hydration.
            const childActive = pathname === c.href.split("#")[0] && !c.href.includes("#");
            return (
              <li key={c.href + c.label}>
                <Link
                  href={c.href}
                  className={`flex items-center gap-2 py-1 text-sm transition-colors duration-[--duration-fast] ${
                    childActive
                      ? "text-brand-cyan"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {childActive && <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />}
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

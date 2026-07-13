import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import {
  contactableBy,
  listConversations,
  markRead,
  openConversation,
  type ConversationKind,
} from "@/lib/messages";
import { Avatar } from "@/components/dashboard/avatar";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
import { SearchIcon } from "@/components/dashboard/icons";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Composer, NewConversation } from "./composer";

/*
 * Message Center — reference screen 3. Two panes: conversation list (Team /
 * Client tabs, search, new-thread button) and the open thread with a composer.
 *
 * The thread is opened through openConversation(viewer.id, …), which returns
 * null for a non-participant — so a guessed id in the URL yields "not found",
 * not someone else's messages.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; c?: string; new?: string }>;
}) {
  const viewer = await requireCapability("messages.use");
  const { tab, c, new: isNew } = await searchParams;

  // Collaborators have no internal "Team" side — they only ever hold COLLAB
  // threads, so the tabs collapse to a single list for them.
  const canSeeTabs = viewer.role !== "COLLABORATOR";
  const kind: ConversationKind | undefined = !canSeeTabs
    ? undefined
    : tab === "client"
      ? "COLLAB"
      : "TEAM";

  const conversations = await listConversations(viewer.id, kind);
  const activeId = c ?? conversations[0]?.id;
  const thread = activeId ? await openConversation(viewer.id, activeId) : null;

  if (thread) await markRead(viewer.id, thread.id);

  const contacts = isNew ? await contactableBy(viewer.id, viewer.role) : [];

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        trail={[{ label: "Dashboards", href: "/app" }, { label: "Message Center" }]}
      />

      <Panel>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em]">Message Center</h1>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
          {/* ---- conversation list ---- */}
          <div className="rounded-card border border-border-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              {canSeeTabs ? (
                <div className="flex items-center gap-5">
                  <TabLink label="Team" href="/app/messages?tab=team" active={kind === "TEAM"} />
                  <TabLink
                    label="Client"
                    href="/app/messages?tab=client"
                    active={kind === "COLLAB"}
                  />
                </div>
              ) : (
                <span className="text-[15px] font-medium">Conversations</span>
              )}
              <Link
                href="/app/messages?new=1"
                aria-label="New conversation"
                className="flex h-8 w-8 items-center justify-center rounded-control border border-border-subtle text-text-secondary transition-colors duration-[--duration-fast] hover:bg-surface-overlay hover:text-text-primary"
              >
                +
              </Link>
            </div>

            <label className="relative mt-4 block">
              <span className="sr-only">Search conversations</span>
              <SearchIcon
                size={17}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                placeholder="Search for..."
                className="h-10 w-full rounded-full border border-border-subtle bg-surface-raised pl-4 pr-10 text-sm outline-none transition-colors duration-[--duration-fast] placeholder:text-text-muted focus:border-brand-cyan"
              />
            </label>

            <ul className="mt-3 flex max-h-[520px] flex-col overflow-y-auto">
              {conversations.map((conv) => {
                const active = conv.id === activeId;
                return (
                  <li key={conv.id}>
                    <Link
                      href={`/app/messages?${canSeeTabs ? `tab=${kind === "COLLAB" ? "client" : "team"}&` : ""}c=${conv.id}`}
                      className={`flex items-center gap-3 rounded-control px-3 py-3 transition-colors duration-[--duration-fast] ${
                        active ? "bg-surface-overlay" : "hover:bg-surface-overlay/60"
                      }`}
                    >
                      <Avatar name={conv.others[0]?.name ?? conv.title} size={40} online />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[15px] font-medium">
                            {conv.title}
                          </span>
                          <span className="shrink-0 text-xs text-text-muted">
                            {conv.lastAt.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className="truncate text-sm text-text-muted">
                            {conv.preview || "No messages yet"}
                          </span>
                          {conv.unread && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-brand-cyan" />
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {conversations.length === 0 && (
                <li className="py-10 text-center text-sm text-text-muted">
                  No conversations yet.
                </li>
              )}
            </ul>
          </div>

          {/* ---- thread ---- */}
          <div className="flex min-h-[560px] flex-col rounded-card border border-border-subtle">
            {isNew ? (
              <NewConversation contacts={contacts} />
            ) : thread ? (
              <>
                <div className="flex items-center gap-3 border-b border-border-subtle p-5">
                  <Avatar name={thread.others[0]?.name ?? "—"} size={44} online />
                  <span>
                    <span className="block text-[15px] font-semibold tracking-[-0.01em]">
                      {thread.others.map((o) => o.name).join(", ") || "Conversation"}
                    </span>
                    <span className="block text-xs text-text-muted">
                      {thread.others[0]
                        ? (ROLE_LABELS[thread.others[0].role as Role] ?? thread.others[0].role)
                        : ""}
                      {thread.subject ? ` · ${thread.subject}` : ""}
                    </span>
                  </span>
                </div>

                <ul className="flex flex-1 flex-col gap-4 overflow-y-auto bg-surface-base/40 p-5">
                  {thread.messages.map((m) => (
                    <li
                      key={m.id}
                      className={`flex max-w-[80%] flex-col gap-1 ${
                        m.mine ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      <span className="text-xs text-text-muted">
                        {m.author.name.split(" ")[0]},{" "}
                        {m.createdAt.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {/* Plain text only — bodies are sanitized on write and never
                          rendered as HTML or MDX. */}
                      <span
                        className={`whitespace-pre-wrap rounded-card px-4 py-3 text-[15px] leading-relaxed ${
                          m.mine
                            ? "bg-brand-cyan text-surface-raised"
                            : "bg-surface-raised text-text-primary"
                        }`}
                      >
                        {m.body}
                      </span>
                    </li>
                  ))}
                  {thread.messages.length === 0 && (
                    <li className="m-auto text-sm text-text-muted">No messages yet.</li>
                  )}
                </ul>

                <Composer conversationId={thread.id} />
              </>
            ) : (
              <div className="m-auto flex flex-col items-center gap-3 p-10 text-center">
                <p className="text-text-muted">Select a conversation to read it.</p>
                <Link
                  href="/app/messages?new=1"
                  className="inline-flex h-10 items-center rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover"
                >
                  Start a conversation
                </Link>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TabLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`border-b-2 pb-1 text-[15px] font-medium transition-colors duration-[--duration-fast] ${
        active
          ? "border-brand-cyan text-brand-cyan"
          : "border-transparent text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </Link>
  );
}

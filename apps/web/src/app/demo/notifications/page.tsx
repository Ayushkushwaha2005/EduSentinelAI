"use client";

import { PageHeader, Panel } from "@/components/dashboard/widgets";
import { useDemo } from "@/lib/demo/store";

/* Simulated notifications. Marking read mutates React state only. */
export default function DemoNotifications() {
  const { notifications, dispatch } = useDemo();
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <div className="flex flex-col gap-4" data-accent="amber">
      <PageHeader
        title="Notifications"
        subtitle="A notification carries nothing its recipient could not already open. Simulated."
        stats={[]}
      />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Inbox{" "}
            {unread > 0 && (
              <span className="ml-1 rounded-full bg-brand-cyan/10 px-2 py-0.5 text-xs font-semibold text-brand-cyan">
                {unread} unread
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => dispatch({ type: "readAllNotifications" })}
            disabled={unread === 0}
            className="text-sm font-medium text-brand-cyan transition-colors hover:text-brand-teal disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>

        <ul className="mt-5 flex flex-col">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-4 border-b border-border-subtle py-4 last:border-0"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.unread ? "bg-brand-cyan" : "bg-border-subtle"
                  }`}
                />
                <span className="min-w-0">
                  <span className="block font-medium">{n.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-text-secondary">
                    {n.body}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-text-muted">{n.time}</span>
                {n.unread && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "readNotification", id: n.id })}
                    className="text-sm font-medium text-text-secondary hover:text-text-primary"
                  >
                    Mark read
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm text-text-muted">
          Each of these is a title, one sentence and an internal link that
          re-checks access server-side. Record bodies are never pasted into a
          notification — it is the easiest place in a product to leak something
          like a leave reason.
        </p>
      </Panel>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { isReviewMode, requireExecutiveView } from "@/lib/executive";
import { organizationSessions, sessionHistory } from "@/lib/sessions";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
import { ReviewNotice } from "@/components/dashboard/approval";
import { OrgSessions } from "./org-sessions";

/*
 * The Organization Session Center.
 *
 * Opens for either executive; ENDING somebody else's session is
 * `sessions.manage`, which is founder-reserved and stripped in code for every
 * other role. So a Co-Founder can see the whole picture — who is signed in,
 * from where, on what — and cannot sign anyone out. That split is the entire
 * design: visibility is a leadership need, and removing a person from the
 * running system is an authority.
 *
 * Everything shown is already recorded: sessions come from UserSession, and the
 * history is the audit log, which has held login events since Phase 2.
 */
export const metadata = { title: "Session Center" };

export default async function SessionCenterPage() {
  const viewer = await requireExecutiveView("sessions.manage");
  const reviewing = isReviewMode(viewer, "sessions.manage");

  const session = await auth();
  const currentSid = (session as { sid?: string } | null)?.sid ?? null;

  const [sessions, history] = await Promise.all([
    organizationSessions(currentSid),
    sessionHistory(40),
  ]);

  /* Group by account, so the page reads as "people and their devices" rather
     than a flat list in which one person's five tabs look like five people. */
  const byUser = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }
  const groups = [...byUser.values()].sort(
    (a, b) => b[0].lastSeenAt.getTime() - a[0].lastSeenAt.getTime(),
  );

  return (
    <div className="flex grow flex-col gap-4">
      <Breadcrumb
        trail={[{ label: "Dashboards", href: "/app" }, { label: "Session Center" }]}
      />

      <div>
        <h1 className="font-display text-[36px] font-semibold leading-[0.98] tracking-[-0.04em] md:text-[44px]">
          Session Center
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text-secondary">
          Every account signed in to EduSentinel right now, the device it is on
          and where it connected from. Location is approximate and comes from the
          connection itself — nothing is looked up with a third party.
        </p>
      </div>

      {reviewing && (
        <ReviewNotice
          surface="Session Center"
          detail="You can review every active session and the full sign-in history. Ending another person's session is a Founder authorization."
        />
      )}

      <Panel>
        <OrgSessions groups={groups} canManage={viewer.can("sessions.manage")} />
      </Panel>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
          Sign-in and session history
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          From the audit log, so it cannot disagree with what actually happened.
        </p>

        {history.length === 0 ? (
          <p className="mt-5 text-[15px] text-text-muted">Nothing recorded yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Session history">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                  <th className="rounded-l-card px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Detail</th>
                  <th className="rounded-r-card px-5 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-3 font-mono text-[12.5px]">{h.action}</td>
                    <td className="px-5 py-3 text-text-secondary">{h.actorEmail ?? "system"}</td>
                    <td className="px-5 py-3 text-text-muted">{h.detail ?? "—"}</td>
                    <td className="px-5 py-3 text-text-secondary">
                      {h.createdAt.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

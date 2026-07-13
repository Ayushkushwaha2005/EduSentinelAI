import Link from "next/link";
import type { Viewer } from "@/lib/guard";
import { greeting, myCollaborations } from "@/lib/dashboard";
import { ChatIcon, BoxIcon, ShieldIcon } from "@/components/dashboard/icons";
import {
  Breadcrumb,
  Panel,
  StatCard,
  StatusDot,
  TableToolbar,
} from "@/components/dashboard/widgets";

/*
 * Collaborator dashboard — external users. Structurally isolated: they see only
 * the collaboration threads they themselves submitted (scoped by their own
 * verified email), never internal teams, tasks, releases or staff. This is the
 * tenant-isolation gate from ROADMAP Phase 5.
 */
export default async function CollaboratorDashboard({ viewer }: { viewer: Viewer }) {
  const threads = await myCollaborations(viewer.email);
  const openThreads = threads.filter((t) => t.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          {greeting(viewer)}
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Your collaboration with EduSentinel AI.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          icon={<ChatIcon size={26} />}
          title="My Requests"
          subtitle={`Awaiting review (${openThreads})`}
          people={[viewer.name]}
          href="/app"
        />
        <StatCard
          icon={<BoxIcon size={26} />}
          title="Downloads"
          subtitle="Signed public releases"
          people={[viewer.name]}
          href="/downloads"
        />
        <StatCard
          icon={<ShieldIcon size={26} />}
          title="Account"
          subtitle="Security & two-factor"
          people={[viewer.name]}
          href="/app/security"
        />
      </div>

      <Panel>
        <TableToolbar title="Collaboration Requests" onAddHref="/collaborate" addLabel="New" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">#</th>
                <th className="px-5 py-3.5 font-medium">Type</th>
                <th className="px-5 py-3.5 font-medium">Message</th>
                <th className="px-5 py-3.5 font-medium">Submitted</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {threads.map((t, i) => (
                <tr key={t.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4 text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4 font-medium capitalize">{t.kind}</td>
                  {/* Plain text only — public submissions are sanitized on write
                      and never rendered as HTML/MDX (Phase 4 rule). */}
                  <td className="max-w-[320px] truncate px-5 py-4 text-text-secondary">
                    {t.message}
                  </td>
                  <td className="px-5 py-4 text-text-secondary">
                    {t.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <StatusDot status={t.status} />
                  </td>
                </tr>
              ))}
              {threads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-text-muted">
                    You have no collaboration requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
          Working with EduSentinel
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
          Collaboration access is granted per person by the Founder. Approved
          collaborators receive additional capabilities on this same account —
          you will never need a second login.
        </p>
        <Link
          href="/legal/community"
          className="mt-4 inline-flex h-10 items-center rounded-control border border-border-subtle px-5 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
        >
          Community guidelines
        </Link>
      </Panel>
    </div>
  );
}

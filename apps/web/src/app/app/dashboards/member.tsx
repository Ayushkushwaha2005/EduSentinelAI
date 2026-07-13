import Link from "next/link";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/guard";
import { greeting } from "@/lib/dashboard";
import { BoxIcon, ShieldIcon } from "@/components/dashboard/icons";
import { Breadcrumb, Panel, StatCard } from "@/components/dashboard/widgets";

/*
 * Default member dashboard (role USER) — the account everyone gets on signup.
 * No internal data at all. Elevation to EMPLOYEE / COLLABORATOR / leadership is
 * a deliberate act by the Founder.
 */
export default async function MemberDashboard({ viewer }: { viewer: Viewer }) {
  const account = await db.user.findUnique({
    where: { id: viewer.id },
    select: { createdAt: true, emailVerified: true, mfaEnabled: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          {greeting(viewer)}
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Your EduSentinel AI account — one identity for the whole ecosystem.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatCard
          icon={<BoxIcon size={26} />}
          title="Downloads"
          subtitle="Signed, verified releases"
          people={[viewer.name]}
          href="/downloads"
        />
        <StatCard
          icon={<ShieldIcon size={26} />}
          title="Security"
          subtitle={account?.mfaEnabled ? "Two-factor enabled" : "Two-factor not enabled"}
          people={[viewer.name]}
          href="/app/security"
        />
      </div>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Account</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Row label="Email" value={viewer.email} />
          <Row
            label="Email verified"
            value={account?.emailVerified ? "Yes" : "Not verified"}
          />
          <Row label="Role" value="Member" />
          <Row
            label="Member since"
            value={
              account?.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }) ?? "—"
            }
          />
        </dl>
      </Panel>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
          Want to collaborate?
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
          EduSentinel works with researchers, contributors and partners. Send a
          request and the Founder will review it — approved collaborators get
          extra capabilities on this same account.
        </p>
        <Link
          href="/collaborate"
          className="mt-4 inline-flex h-10 items-center rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover"
        >
          Request collaboration
        </Link>
      </Panel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border-subtle pb-3">
      <dt className="text-[15px] text-text-secondary">{label}</dt>
      <dd className="truncate text-[15px] font-medium">{value}</dd>
    </div>
  );
}

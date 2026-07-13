import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/guard";
import { ownProfile } from "@/lib/profile";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
import { AvatarForm, DetailsForm, NotificationsForm, PasswordForm } from "./forms";

/*
 * One profile page for every role (Phase 6.2).
 *
 * Gated on requireViewer — a capability check would be wrong here: managing your
 * own identity is not a privilege the Founder grants, it is what having an
 * account means. A USER and the FOUNDER land on exactly this page.
 *
 * Role and capabilities are shown but not editable, and there is deliberately no
 * link from here that could change them: privilege is granted in Access Control,
 * which is founder-reserved. A profile page that can also elevate you is the
 * second, weaker path we keep refusing to build.
 */
export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const profile = await ownProfile(viewer.id);
  if (!profile) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Profile" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Your profile</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          How you appear across EduSentinel — the directory, the message center and
          your team&apos;s pages all read this record.
        </p>
      </div>

      <Panel>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Photo
        </h2>
        <div className="mt-5">
          <AvatarForm profile={profile} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Details
        </h2>
        <div className="mt-5">
          <DetailsForm profile={profile} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Account
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Row label="Email" value={profile.email} />
          <Row
            label="Email verified"
            value={profile.emailVerified ? "Verified" : "Not verified"}
          />
          <Row label="Role" value={profile.roleLabel} />
          <Row label="Team" value={profile.team ?? "—"} />
          <Row
            label="Member since"
            value={profile.joined.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          />
          <Row
            label="Two-factor"
            value={profile.mfaEnabled ? "Enabled" : "Not enabled"}
          />
        </dl>
        <p className="mt-5 text-sm leading-relaxed text-text-muted">
          Your role and permissions are set by the Founder in Access Control and
          cannot be changed from this page. Two-factor authentication and session
          controls live on{" "}
          <Link href="/app/security" className="text-brand-cyan hover:text-brand-teal">
            Security
          </Link>
          .
        </p>
      </Panel>

      <Panel>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Notifications
        </h2>
        <div className="mt-5">
          <NotificationsForm profile={profile} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Password
        </h2>
        <div className="mt-5">
          <PasswordForm />
        </div>
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

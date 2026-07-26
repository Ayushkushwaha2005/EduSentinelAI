import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/guard";
import { ownProfile } from "@/lib/profile";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
import { NotificationsForm, PasswordForm } from "../profile/forms";
import { ThemeToggle } from "@/components/theme";

/*
 * Settings — how your account behaves.
 *
 * The counterpart to /app/profile, which holds only who you are. Password and
 * notification preferences lived on the profile page; a profile is the page you
 * open to fix a typo in your job title, and it is the one most likely to be up
 * on a shared screen — not where a password field belongs.
 *
 * REUSES THE EXISTING BACKEND ENTIRELY. `PasswordForm` and `NotificationsForm`
 * are the same components against the same `changePassword` /
 * `updateNotifications` server actions. Nothing about authentication changed;
 * this is a routing and information-architecture move.
 *
 * Gated on requireViewer, like the profile: managing your own account is not a
 * capability the Founder grants, it is what having an account means.
 */
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const profile = await ownProfile(viewer.id);
  if (!profile) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Settings" }]} />

      <div>
        <h1 className="font-display text-[36px] font-semibold leading-[0.98] tracking-[-0.04em] md:text-[44px]">
          Settings
        </h1>
        <p className="mt-2 text-[15px] text-text-secondary">
          Security, notifications and appearance.{" "}
          <Link href="/app/profile" className="text-brand-cyan hover:text-brand-teal">
            Your profile
          </Link>{" "}
          holds your photo and personal details.
        </p>
      </div>

      {/* ---- password ---- */}
      <Panel id="password">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Password
        </h2>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </Panel>

      {/* ---- two-factor & sessions ---- */}
      <Panel id="security">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Security
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-secondary">Two-factor authentication</dt>
            <dd className="mt-1 text-[15px] font-medium">
              {profile.mfaEnabled ? "Enabled" : "Not enabled"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Email</dt>
            <dd className="mt-1 text-[15px] font-medium">
              {profile.emailVerified ? "Verified" : "Not verified"}
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-sm leading-relaxed text-text-muted">
          Enrolment, authenticator changes and signing out everywhere are handled
          on the Security page — it is the one surface that can end your other
          sessions, so it stays separate and deliberate.
        </p>
        <Link
          href="/app/security"
          className="mt-5 inline-flex h-11 items-center rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover"
        >
          Two-factor &amp; sessions
        </Link>
      </Panel>

      {/* ---- notifications ---- */}
      <Panel id="notifications">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Notifications
        </h2>
        <div className="mt-5">
          <NotificationsForm profile={profile} />
        </div>
      </Panel>

      {/* ---- appearance ---- */}
      <Panel id="appearance">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Appearance
        </h2>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium">Theme</p>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              Light, dark, or follow your system. Stored on this device rather
              than your account — the same person wants dark on a laptop at night
              and light on a bright monitor.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </Panel>

      {/* ---- privacy ---- */}
      <Panel id="privacy">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Privacy
        </h2>
        <ul className="mt-5 flex flex-col gap-3 text-sm leading-relaxed text-text-secondary">
          <li>
            <strong className="font-medium text-text-primary">No third-party trackers.</strong>{" "}
            Not on the public site, not in this workspace, and not in our email —
            a tracking pixel is a tracker. It is checked on every build.
          </li>
          <li>
            <strong className="font-medium text-text-primary">Analytics are our own.</strong>{" "}
            Computed server-side from our records. No analytics SDK exists in this
            application.
          </li>
          <li>
            <strong className="font-medium text-text-primary">Your leave reasons stay yours.</strong>{" "}
            A leave reason reaches only you and your approver chain — never HR at
            large, never the team calendar, never the audit log.
          </li>
          <li>
            <strong className="font-medium text-text-primary">Photos are stripped.</strong>{" "}
            Uploaded images have their metadata removed before storage, so a phone
            photo does not carry its GPS coordinates into the directory.
          </li>
        </ul>
        <Link
          href="/legal/privacy"
          className="mt-5 inline-flex text-sm font-medium text-brand-cyan hover:text-brand-teal"
        >
          Full privacy policy →
        </Link>
      </Panel>
    </div>
  );
}

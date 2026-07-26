import { db } from "@/lib/db";
import { requireViewer } from "@/lib/guard";
import { isAdminRole } from "@/lib/roles";
import { MfaPanel } from "./mfa-panel";
import { Breadcrumb } from "@/components/dashboard/widgets";
import { resendVerification } from "./actions";
import { auth } from "@/lib/auth";
import { sessionsFor } from "@/lib/sessions";
import { SessionsPanel } from "./sessions-panel";

/*
 * Own-account security. Deliberately gated on requireViewer, not a capability:
 * this is where privileged users are sent to enrol MFA, so it must stay
 * reachable by someone who cannot yet reach anything else.
 */
export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ mfa?: string; next?: string }>;
}) {
  const viewer = await requireViewer();
  const { mfa, next } = await searchParams;

  /* The current device is identified by the `sid` claim already in the token —
     nothing new is sent by the browser to work this out. */
  const session = await auth();
  const sessions = await sessionsFor(
    viewer.id,
    (session as { sid?: string } | null)?.sid ?? null,
  );
  const account = await db.user.findUnique({
    where: { id: viewer.id },
    select: { mfaEnabled: true, emailVerified: true },
  });

  const mandatory = isAdminRole(viewer.role);
  const enrolled = account?.mfaEnabled ?? false;
  // Only ever a relative /app path — guard.ts validated it, and we re-check
  // here so this page cannot be turned into an open redirect on its own.
  const returnTo = next && /^\/app(\/[\w\-/]*)?$/.test(next) ? next : "/app";
  const blocked = mfa === "required" && !enrolled;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Security" }]} />
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Security</h1>
      <p className="text-[15px] text-text-secondary">
        Two-factor authentication and session controls for your account.
      </p>

      {/* A privileged account that has not enrolled MFA gets sent here. Say so,
          rather than dumping them on a page they did not ask for. */}
      {blocked && (
        <div
          role="status"
          className="rounded-card border border-warning/30 bg-warning/5 p-5"
        >
          <p className="text-[15px] font-semibold text-warning">
            Two-factor authentication is required before you can continue.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
            Your role holds privileged access — product publishing, release
            signing and access control — so EduSentinel requires an authenticator
            app before those surfaces open. Enrol below and you will be taken
            straight back to{" "}
            <code className="rounded bg-surface-overlay px-1.5 py-0.5 text-sm">
              {returnTo}
            </code>
            .
          </p>
        </div>
      )}

      {mandatory && enrolled && (
        <div className="rounded-card border border-success/30 bg-success/5 p-5">
          <p className="text-[15px] font-semibold text-success">
            Your account is fully protected.
          </p>
          <p className="mt-2 text-[15px] text-text-secondary">
            Two-factor authentication is enabled, so every privileged surface is
            open to you.
          </p>
        </div>
      )}

      <section className="mt-6 rounded-card border border-border-subtle bg-surface-raised p-7">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Two-factor authentication
        </h2>
        <div className="mt-5">
          <MfaPanel
            mfaEnabled={enrolled}
            mandatory={mandatory}
            returnTo={returnTo}
          />
        </div>
      </section>

      <section className="mt-6 rounded-card border border-border-subtle bg-surface-raised p-7">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Email verification
        </h2>
        <p className="mt-4 text-[15px] text-text-secondary">
          {account?.emailVerified
            ? `Verified on ${account.emailVerified.toLocaleDateString("en-GB")}.`
            : "Not verified yet — use the link sent to your inbox, or request a new one."}
        </p>
        {!account?.emailVerified && (
          <form
            action={async () => {
              "use server";
              await resendVerification();
            }}
          >
            <button
              type="submit"
              className="mt-4 h-11 rounded-control bg-surface-overlay px-5 text-sm font-medium transition-colors hover:bg-border-subtle"
            >
              Resend verification email
            </button>
          </form>
        )}
      </section>

      {/*
        * Active sessions (Phase 14).
        *
        * This replaces a single "sign out everywhere" button. That button still
        * exists inside the panel and behaves identically — it bumps
        * sessionVersion as it always did — but it is no longer the only thing
        * you can do, because "something is wrong" and "sign me out of the laptop
        * I left at the office" are different problems.
        */}
      <section className="mt-6 rounded-card border border-border-subtle bg-surface-raised p-7">
        <SessionsPanel sessions={sessions} />
      </section>
    </div>
  );
}

import { db } from "@/lib/db";
import { requireViewer } from "@/lib/guard";
import { isAdminRole } from "@/lib/roles";
import { MfaPanel } from "./mfa-panel";
import { revokeAllSessions, resendVerification } from "./actions";

/*
 * Own-account security. Deliberately gated on requireViewer, not a capability:
 * this is where privileged users are sent to enrol MFA, so it must stay
 * reachable by someone who cannot yet reach anything else.
 */
export default async function SecurityPage() {
  const viewer = await requireViewer();
  const account = await db.user.findUnique({
    where: { id: viewer.id },
    select: { mfaEnabled: true, emailVerified: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-medium tracking-[-0.02em]">Security</h1>
      <p className="mt-2 text-text-secondary">
        Two-factor authentication and session controls for your account.
      </p>

      <section className="mt-10 rounded-card border border-border-subtle bg-surface-raised p-7">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Two-factor authentication
        </h2>
        <div className="mt-5">
          <MfaPanel
            mfaEnabled={account?.mfaEnabled ?? false}
            mandatory={isAdminRole(viewer.role)}
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

      <section className="mt-6 rounded-card border border-border-subtle bg-surface-raised p-7">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Sessions
        </h2>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-text-secondary">
          Sign out of every device, including this one. Use this immediately if
          you suspect your account is compromised.
        </p>
        <form action={revokeAllSessions}>
          <button
            type="submit"
            className="mt-4 h-11 rounded-control border border-danger/40 px-5 text-sm font-medium text-danger transition-colors hover:bg-danger/5"
          >
            Sign out everywhere
          </button>
        </form>
      </section>
    </div>
  );
}

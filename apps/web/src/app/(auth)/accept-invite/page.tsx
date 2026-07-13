import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCompany } from "@/lib/company";
import { findInvitation } from "@/lib/invitations";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { AuthShell } from "../auth-form";
import { AcceptForm } from "./form";

export const metadata: Metadata = {
  title: "Accept your invitation",
  robots: { index: false },
};

/*
 * The invitation landing page.
 *
 * An invalid, expired, revoked or already-used token gets ONE message: this
 * invitation is not valid. It deliberately does not say which — "expired" versus
 * "already used" versus "never existed" would let someone with a list of guessed
 * tokens learn which ones were real.
 */
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const [invitation, company] = await Promise.all([
    token ? findInvitation(token) : null,
    getCompany(),
  ]);

  if (!invitation || !token) {
    return (
      <AuthShell
        title="This invitation is not valid"
        subtitle="It may have expired, been used already, or been withdrawn"
      >
        <p className="mt-8 text-[15px] leading-relaxed text-text-secondary">
          Invitations work once and expire after seven days. Ask whoever invited
          you to send a new one.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-control border border-border-subtle text-[15px] font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
        >
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  const inviter = await db.invitation.findUnique({
    where: { id: invitation.id },
    select: { invitedByEmail: true },
  });

  return (
    <AcceptForm
      token={token}
      email={invitation.email}
      roleLabel={ROLE_LABELS[invitation.role as Role] ?? invitation.role}
      company={company.name}
      inviter={inviter?.invitedByEmail ?? "Someone"}
    />
  );
}

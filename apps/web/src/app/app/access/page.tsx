import { db } from "@/lib/db";
import { requireFounder } from "@/lib/guard";
import { grantableRoles } from "@/lib/authz";
import {
  CAPABILITIES,
  FOUNDER_RESERVED,
  defaultCapabilities,
  isFounderReserved,
  type Capability,
} from "@/lib/permissions";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Avatar } from "@/components/dashboard/avatar";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
import { PersonRow } from "./person-row";
import { AccessReview, InviteForm, InviteList } from "./invite-panel";
import { invitableBy, pendingInvitations } from "@/lib/invitations";
import { failedMail } from "@/lib/mail";

/*
 * Access Control — the Founder's console.
 *
 * This is the only surface in the product that grants access, and it is
 * founder-only (requireFounder + founder-reserved capabilities on every action).
 * It replaces the old /app/admin user table as the single place where roles and
 * capabilities are decided.
 */
export default async function AccessPage() {
  const founder = await requireFounder();

  const [users, grants, invitations, elevated, lastReview, failures] = await Promise.all([
    db.user.findMany({
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mfaEnabled: true,
        emailVerified: true,
        createdAt: true,
      },
    }),
    db.permissionGrant.findMany({
      select: {
        id: true,
        userId: true,
        capability: true,
        allow: true,
        reason: true,
        expiresAt: true,
      },
    }),
    pendingInvitations(),
    // The access-review scope: every explicit ALLOW beyond a role default.
    db.permissionGrant.findMany({
      where: { allow: true },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    db.accessReview.findFirst({ orderBy: { reviewedAt: "desc" } }),
    failedMail(5),
  ]);

  const grantsByUser = new Map<
    string,
    { capability: string; allow: boolean; expiresAt: Date | null; reason: string | null }[]
  >();
  for (const g of grants) {
    const list = grantsByUser.get(g.userId) ?? [];
    list.push({
      capability: g.capability,
      allow: g.allow,
      expiresAt: g.expiresAt,
      reason: g.reason,
    });
    grantsByUser.set(g.userId, list);
  }

  // Reserved capabilities are never offered in the UI — and the server rejects
  // them too, so hiding them here is convenience, not the control.
  const grantable: Capability[] = CAPABILITIES.filter((c) => !isFounderReserved(c));
  const roles = grantableRoles(founder.role);
  const invitableRoles = invitableBy(founder.role);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Access Control" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Access Control</h1>
        <p className="mt-1 max-w-3xl text-[15px] text-text-secondary">
          You decide who gets access and what they can do. A role sets the
          default capabilities; grants below adjust them per person. Every change
          is written to the tamper-evident audit log and signs the account out of
          all devices immediately.
        </p>
      </div>

      <Panel className="border border-brand-cyan/20 bg-brand-cyan/[0.04]">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
          Reserved to the Founder
        </h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text-secondary">
          These capabilities cannot be delegated to anyone — not to a Co-Founder,
          not to an Admin, not by any grant in this console. They are stripped in
          code on every authorization check.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {FOUNDER_RESERVED.map((c) => (
            <li
              key={c}
              className="rounded-full bg-surface-raised px-3 py-1.5 font-mono text-xs font-medium text-brand-teal ring-1 ring-brand-cyan/25"
            >
              {c}
            </li>
          ))}
        </ul>
      </Panel>

      {/* ---- invitations: the offer IS the access decision ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Invite someone</h2>
        <p className="mt-1 max-w-3xl text-[15px] text-text-secondary">
          Choose their role — and, if you like, the permissions they start with — at
          the moment you invite them. They arrive with the right access already
          granted, decided once and on the record.
        </p>
        <div className="mt-5">
          <InviteForm
            roles={invitableRoles}
            grantable={grantable}
            canAttachCapabilities={founder.can("permissions.grant")}
          />
        </div>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Invitations
        </h3>
        <InviteList invitations={invitations} />

        {/* A failed invitation that vanishes into a log file is an invitation the
            Founder thinks they sent. */}
        {failures.length > 0 && (
          <div className="mt-6 rounded-card border border-danger/30 bg-danger/[0.03] p-4">
            <p className="text-sm font-semibold text-danger">
              {failures.length} email{failures.length === 1 ? "" : "s"} failed to send
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {failures.map((f) => (
                <li key={f.id} className="truncate text-sm text-text-secondary">
                  {f.to} · {f.subject} · {f.error ?? "unknown error"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {/* ---- quarterly access review ---- */}
      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Access review</h2>
        <div className="mt-4">
          <AccessReview
            grants={elevated.map((g) => ({
              id: g.id,
              capability: g.capability,
              name: g.user.name,
              email: g.user.email,
              reason: g.reason,
              expiresAt: g.expiresAt,
            }))}
            lastReview={
              lastReview
                ? { reviewedAt: lastReview.reviewedAt, revoked: lastReview.revoked }
                : null
            }
          />
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            People <span className="text-text-muted">({users.length})</span>
          </h2>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-card border border-border-subtle p-4 md:p-5"
            >
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={u.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                    {u.name}
                    {u.id === founder.id && (
                      <span className="ml-2 rounded-full bg-brand-cyan/10 px-2 py-0.5 text-xs font-medium text-brand-teal">
                        You
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-text-muted">{u.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-surface-overlay px-2.5 py-1 font-medium text-text-secondary">
                    {ROLE_LABELS[u.role as Role] ?? u.role}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 font-medium ${
                      u.mfaEnabled
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {u.mfaEnabled ? "2FA on" : "No 2FA"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 font-medium ${
                      u.emailVerified
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {u.emailVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
              </div>

              <PersonRow
                user={{ id: u.id, email: u.email, role: u.role }}
                isSelf={u.id === founder.id}
                isFounderAccount={u.role === "FOUNDER"}
                roles={roles}
                grantable={grantable}
                defaults={defaultCapabilities(u.role)}
                overrides={grantsByUser.get(u.id) ?? []}
                canOffboard={founder.can("people.offboard")}
              />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

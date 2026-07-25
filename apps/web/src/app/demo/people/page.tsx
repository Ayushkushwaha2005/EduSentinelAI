"use client";

import { Avatar } from "@/components/dashboard/avatar";
import { PageHeader, Panel, StatusDot } from "@/components/dashboard/widgets";
import { useDemo } from "@/lib/demo/store";

/* Simulated directory + access control. Role changes are deliberately inert:
   in production `users.manage_roles` is founder-reserved, and a demo that let
   anyone rehearse privilege escalation would be teaching the wrong lesson. */
export default function DemoPeople() {
  const { people, blocked } = useDemo();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="People"
        subtitle="Directory and access control. Role and permission changes are founder-reserved — and inert here."
        stats={[]}
      />

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Directory</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">Name</th>
                <th className="px-5 py-3.5 font-medium">Email</th>
                <th className="px-5 py-3.5 font-medium">Role</th>
                <th className="px-5 py-3.5 font-medium">Team</th>
                <th className="px-5 py-3.5 font-medium">Joined</th>
                <th className="px-5 py-3.5 font-medium">2FA</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {people.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={p.name} size={30} online={p.online} />
                      <span>
                        <span className="block font-medium">{p.name}</span>
                        {p.title && (
                          <span className="block text-xs text-text-muted">{p.title}</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-text-secondary">{p.email}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-surface-overlay px-2.5 py-1 text-xs font-semibold text-text-secondary">
                      {p.roleLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-text-secondary">{p.team ?? "—"}</td>
                  <td className="px-5 py-4 text-text-secondary">{p.joined}</td>
                  <td className="px-5 py-4">
                    <StatusDot status={p.mfaEnabled ? "Active" : "PENDING"} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-3 text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => blocked("Changing a role")}
                        className="text-text-secondary hover:text-text-primary"
                      >
                        Change role
                      </button>
                      <button
                        type="button"
                        onClick={() => blocked("Offboarding")}
                        className="text-text-muted hover:text-danger"
                      >
                        Offboard
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Access control</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-text-secondary">
          In production the role ladder is{" "}
          <span className="font-mono text-sm">
            USER · COLLABORATOR · EMPLOYEE · ADMIN · CO_FOUNDER · FOUNDER
          </span>
          . Roles set <em>default</em> capabilities; the Founder then grants or
          revokes them per person, and a set of capabilities — release signing and
          revocation, role management, permission granting — is founder-reserved
          and cannot be delegated to anyone, ever.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-text-secondary">
          Those reserved capabilities are stripped in code on every check, so no
          grant row — forged or otherwise — can escalate. That guarantee is the
          reason this page simulates nothing: rehearsing it here would misrepresent
          how firmly it is enforced.
        </p>
      </Panel>
    </div>
  );
}

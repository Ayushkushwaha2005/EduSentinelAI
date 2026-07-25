"use client";

import { useState } from "react";
import { PageHeader, Panel, StatusDot } from "@/components/dashboard/widgets";
import { useDemo } from "@/lib/demo/store";

/* Simulated invitation flow. The form works; it appends a row to React state.
   No email is composed, no token is minted, no account is created. */
export default function DemoInvitations() {
  const { invitations, dispatch } = useDemo();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Employee");

  const input =
    "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Invitations"
        subtitle="An invitation is a link in an email, so it must not be able to mint leadership. Simulated."
        stats={[]}
      />

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Invite someone</h2>
        <form
          className="mt-5 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            dispatch({ type: "sendInvitation", email: email.trim(), roleLabel: role });
            setEmail("");
          }}
        >
          <div className="w-full min-w-0 flex-1 sm:w-auto sm:min-w-[240px]">
            <label htmlFor="demo-invite-email" className="mb-2 block text-sm font-medium text-text-secondary">
              Email address
            </label>
            <input
              id="demo-invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={input}
            />
          </div>

          <div className="w-full min-w-0 flex-1 sm:w-auto sm:min-w-[180px]">
            <label htmlFor="demo-invite-role" className="mb-2 block text-sm font-medium text-text-secondary">
              Role
            </label>
            <select
              id="demo-invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={input}
            >
              <option>Employee</option>
              <option>Collaborator</option>
              <option>Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover"
          >
            Send invitation
          </button>
        </form>

        <p className="mt-4 max-w-2xl text-sm text-text-muted">
          Founder and Co-Founder are deliberately absent from that list. In
          production they are not invitable by anyone — nobody can invite a peer
          or a superior, tokens are single-use and expiring, and the token is
          stored only as a SHA-256 hash.
        </p>
      </Panel>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Sent invitations</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                <th className="rounded-l-card px-5 py-3.5 font-medium">Email</th>
                <th className="px-5 py-3.5 font-medium">Role</th>
                <th className="px-5 py-3.5 font-medium">Invited by</th>
                <th className="px-5 py-3.5 font-medium">Sent</th>
                <th className="px-5 py-3.5 font-medium">Expires</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="rounded-r-card px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {invitations.map((i) => (
                <tr key={i.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4 font-medium">{i.email}</td>
                  <td className="px-5 py-4 text-text-secondary">{i.roleLabel}</td>
                  <td className="px-5 py-4 text-text-secondary">{i.invitedBy}</td>
                  <td className="px-5 py-4 text-text-secondary">{i.sent}</td>
                  <td className="px-5 py-4 text-text-secondary">{i.expires}</td>
                  <td className="px-5 py-4">
                    <StatusDot status={i.status} />
                  </td>
                  <td className="px-5 py-4">
                    {i.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "revokeInvitation", id: i.id })}
                        className="text-sm font-medium text-text-secondary hover:text-danger"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-text-muted">
                    No invitations.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

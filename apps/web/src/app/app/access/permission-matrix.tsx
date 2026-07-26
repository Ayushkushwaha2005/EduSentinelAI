import { Fragment } from "react";
import Link from "next/link";
import {
  CAPABILITIES,
  FOUNDER_RESERVED,
  defaultCapabilities,
  isFounderReserved,
  type Capability,
} from "@/lib/permissions";

/*
 * The Permission Matrix.
 *
 * Access Control could already grant and revoke any capability, one person at a
 * time — but you had to open each person to learn what they held, so "who can
 * publish?" took as many clicks as there were people. The matrix answers that
 * question by looking at it.
 *
 * It is a READ surface. Every cell links to the person's own controls rather
 * than mutating in place: a grid of live toggles is one mis-click away from
 * changing the wrong person's authority, and the per-person form already
 * carries the reason and expiry fields that a grant should be recorded with.
 *
 * Founder-reserved rows are shown, LOCKED, rather than hidden. Hiding them
 * would make the matrix a lie by omission — the reader would not learn that
 * those powers exist, are held by exactly one person, and cannot be delegated
 * to anyone, which is the single most important fact on the page.
 */

type Person = { id: string; name: string; role: string };

const GROUPS: { label: string; caps: readonly Capability[] }[] = [
  {
    label: "Workspace",
    caps: ["dashboard.view", "analytics.read", "audit.read", "messages.use", "notifications.broadcast"],
  },
  {
    label: "Catalogue & releases",
    caps: ["products.view", "products.manage", "products.publish", "products.delete", "releases.upload", "releases.review", "releases.publish", "releases.reject", "releases.revoke"],
  },
  {
    label: "People",
    caps: ["users.view", "users.manage_roles", "people.invite", "people.offboard", "permissions.grant", "team.view", "team.manage"],
  },
  {
    label: "Workforce",
    caps: ["attendance.manage", "leave.approve", "calendar.manage", "hr.view"],
  },
  {
    label: "Relationships & support",
    caps: ["collab.view", "collab.manage", "collab.moderate", "support.respond"],
  },
  {
    label: "Company & ownership",
    caps: ["org.manage", "company.manage", "org.delete", "founder.transfer", "billing.manage", "secrets.manage", "security.policy"],
  },
];

/* Anything added to CAPABILITIES later still appears, so the matrix cannot
   silently omit a new power just because this file was not updated. */
const GROUPED = new Set(GROUPS.flatMap((g) => g.caps));
const UNGROUPED = CAPABILITIES.filter((c) => !GROUPED.has(c));

export function PermissionMatrix({
  people,
  grants,
}: {
  people: Person[];
  grants: Map<string, { capability: string; allow: boolean }[]>;
}) {
  const holds = (person: Person, cap: Capability): "yes" | "no" | "granted" | "revoked" => {
    // Founder-reserved is answered in code, never by a row — same rule the
    // server applies in effectiveCapabilities().
    if (isFounderReserved(cap)) return person.role === "FOUNDER" ? "yes" : "no";

    const byDefault = defaultCapabilities(person.role).includes(cap);
    const override = grants.get(person.id)?.find((g) => g.capability === cap);
    if (override) return override.allow ? "granted" : "revoked";
    return byDefault ? "yes" : "no";
  };

  const groups = [
    ...GROUPS,
    ...(UNGROUPED.length ? [{ label: "Other", caps: UNGROUPED }] : []),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Permission matrix</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-secondary">
            Every capability against every account. A tick is held, a dash is
            not; <span className="font-medium text-brand-cyan">G</span> is an
            explicit grant and <span className="font-medium text-warning">R</span>{" "}
            an explicit revoke beyond the role default. Locked rows are
            founder-reserved — they are held by the Founder alone and cannot be
            granted to anyone, by anyone.
          </p>
        </div>
        <p className="text-xs text-text-muted">
          {CAPABILITIES.length} capabilities · {FOUNDER_RESERVED.length} reserved
        </p>
      </div>

      <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Permission matrix">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
              <th scope="col" className="sticky left-0 z-10 rounded-l-card bg-surface-overlay px-4 py-3 font-medium">
                Capability
              </th>
              {people.map((p) => (
                <th key={p.id} scope="col" className="px-3 py-3 text-center font-medium">
                  <span className="block max-w-[110px] truncate">{p.name}</span>
                  <span className="block text-[10px] font-normal text-text-muted">{p.role}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="text-sm">
            {groups.map((group) => (
              /* Fragment with a key, not `<>`: the map returns this element, so
                 the key belongs here — putting it on the inner <tr> left React
                 without one for the list item itself. */
              <Fragment key={group.label}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={people.length + 1}
                    className="px-4 pb-1 pt-5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted"
                  >
                    {group.label}
                  </th>
                </tr>

                {group.caps.map((cap) => {
                  const reserved = isFounderReserved(cap);
                  return (
                    <tr
                      key={cap}
                      className={`border-b border-border-subtle last:border-0 ${
                        reserved ? "bg-ws-lilac/[0.18]" : ""
                      }`}
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-surface-raised px-4 py-2.5 text-left font-normal"
                      >
                        <span className="flex items-center gap-2">
                          {reserved && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="shrink-0 text-ws-ink">
                              <rect x="4" y="11" width="16" height="10" rx="2" />
                              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                            </svg>
                          )}
                          <code className="font-mono text-[12.5px]">{cap}</code>
                          {reserved && (
                            <span className="sr-only">(founder-reserved, not grantable)</span>
                          )}
                        </span>
                      </th>

                      {people.map((p) => {
                        const state = holds(p, cap);
                        return (
                          <td key={p.id} className="px-3 py-2.5 text-center">
                            {state === "granted" ? (
                              <span title="Explicitly granted" className="font-semibold text-brand-cyan">G</span>
                            ) : state === "revoked" ? (
                              <span title="Explicitly revoked" className="font-semibold text-warning">R</span>
                            ) : state === "yes" ? (
                              <span title="Held" aria-label="held" className="text-success">✓</span>
                            ) : (
                              <span title="Not held" aria-label="not held" className="text-text-muted">–</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-text-muted">
        To change a grantable capability, open the person below — the grant form
        records a reason and an optional expiry alongside it, which a grid of
        toggles could not.{" "}
        <Link href="#people" className="underline underline-offset-2 hover:text-text-secondary">
          Jump to people
        </Link>
      </p>
    </div>
  );
}

"use client";

import { PageHeader, Panel } from "@/components/dashboard/widgets";
import { useDemo } from "@/lib/demo/store";

/* Simulated settings. Toggles flip React state; the reset button restores the
   sandbox, which is the clearest possible demonstration that none of it is
   persisted anywhere. */
export default function DemoSettings() {
  const { settings, dispatch, blocked } = useDemo();

  const field =
    "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] text-text-primary";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        subtitle="Company profile and platform policy. Every control here is simulated."
        stats={[]}
      />

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Company profile</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          In production <code className="font-mono text-sm">company.manage</code>{" "}
          is founder-reserved — someone who can edit this could change the
          security contact address.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Company name", value: settings.companyName, id: "d-name" },
            { label: "Tagline", value: settings.tagline, id: "d-tag" },
            { label: "Support email", value: settings.supportEmail, id: "d-sup" },
            { label: "Security email", value: settings.securityEmail, id: "d-sec" },
          ].map((f) => (
            <div key={f.id}>
              <label htmlFor={f.id} className="mb-2 block text-sm font-medium text-text-secondary">
                {f.label}
              </label>
              <input id={f.id} defaultValue={f.value} className={field} />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => blocked("Saving the company profile")}
          className="mt-5 h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover"
        >
          Save changes
        </button>
      </Panel>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Platform policy</h2>
        <ul className="mt-5 flex flex-col gap-3">
          {[
            {
              key: "releaseSigning" as const,
              label: "Require signature before publishing a release",
              desc: "Every artifact is signed with ed25519 over its SHA-256 before it reaches the download centre.",
              on: settings.releaseSigning,
            },
            {
              key: "requireMfaForPrivileged" as const,
              label: "Require two-factor for privileged roles",
              desc: "Admin, Co-Founder and Founder accounts must enrol an authenticator before privileged surfaces open.",
              on: settings.requireMfaForPrivileged,
            },
          ].map((s) => (
            <li
              key={s.key}
              className="flex items-start justify-between gap-4 rounded-card border border-border-subtle p-4"
            >
              <span className="min-w-0">
                <span className="block font-medium">{s.label}</span>
                <span className="mt-1 block text-sm leading-relaxed text-text-secondary">{s.desc}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={s.on}
                aria-label={s.label}
                onClick={() => dispatch({ type: "toggleSetting", key: s.key })}
                className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
                  s.on ? "bg-brand-cyan" : "bg-surface-overlay"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1 h-4 w-4 rounded-full bg-surface-raised shadow transition-transform ${
                    s.on ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Retention</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-border-subtle p-4">
            <dt className="text-sm text-text-secondary">Audit log</dt>
            <dd className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em]">
              {settings.auditRetentionMonths} months
            </dd>
          </div>
          <div className="rounded-card border border-border-subtle p-4">
            <dt className="text-sm text-text-secondary">Attendance &amp; leave</dt>
            <dd className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em]">
              {settings.leaveRetentionMonths} months
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Reset the sandbox</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Puts every simulated change back to its starting state. Reloading the
          page does the same thing on its own — nothing in Demo Mode is stored
          anywhere, not in a database, not in a cookie, not in local storage.
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: "reset" })}
          className="mt-5 h-11 rounded-control border border-border-subtle px-5 text-sm font-medium transition-colors hover:bg-surface-overlay"
        >
          Reset demo data
        </button>
      </Panel>
    </div>
  );
}

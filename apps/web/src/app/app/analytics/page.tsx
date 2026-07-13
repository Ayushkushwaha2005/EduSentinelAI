import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import {
  RANGES,
  accountsByRole,
  downloadsByRelease,
  growth,
  invitationAcceptance,
  isRangeKey,
  posture,
  type RangeKey,
} from "@/lib/analytics";
import { Breadcrumb, GrowthChart, Panel } from "@/components/dashboard/widgets";
import { ExportButton } from "@/components/dashboard/export-button";

/*
 * Account analytics (Phase 6.3). Gated on `analytics.read` — grantable, so the
 * Founder can hand someone the numbers without handing them the directory.
 *
 * Every figure is computed from records we already hold (lib/analytics.ts). No
 * analytics SDK, no beacon, no third-party script: `npm run check:trackers` is a
 * CI invariant and this page does not get an exemption from it.
 */
export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireCapability("analytics.read");

  const { range: raw } = await searchParams;
  const range: RangeKey = isRangeKey(raw) ? raw : "30d";

  const [series, roles, p, downloads, invites] = await Promise.all([
    growth(range),
    accountsByRole(),
    posture(),
    downloadsByRelease(),
    invitationAcceptance(),
  ]);

  const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((n / d) * 100)}%`);
  const totalDownloads = downloads.reduce((sum, d) => sum + d.downloads, 0);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Analytics" }]} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Analytics</h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            Account growth and platform posture, computed from our own records.
          </p>
        </div>

        {/* Real links, so the range lives in a shareable URL and works without JS. */}
        <nav aria-label="Range" className="flex items-center gap-1 rounded-full bg-surface-raised p-1">
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <Link
              key={key}
              href={`/app/analytics?range=${key}`}
              aria-current={key === range ? "true" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-[--duration-fast] ${
                key === range
                  ? "bg-brand-cyan text-surface-raised"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {key === "all" ? "All" : key}
            </Link>
          ))}
        </nav>
      </div>

      {/* ---- posture ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Accounts" value={String(p.total)} note="Every registered identity" />
        <Metric
          label="Email verified"
          value={pct(p.verified, p.total)}
          note={`${p.verified} of ${p.total}`}
        />
        <Metric
          label="Privileged with MFA"
          value={pct(p.privilegedWithMfa, p.privileged)}
          note={
            p.privileged === 0
              ? "No privileged accounts"
              : `${p.privilegedWithMfa} of ${p.privileged} · mandatory`
          }
          tone={p.privileged > 0 && p.privilegedWithMfa < p.privileged ? "warning" : "success"}
        />
        <Metric
          label="Active (7 days)"
          value={String(p.activeLast7)}
          note={`${p.activeLast30} in the last 30`}
        />
      </div>

      {/* ---- growth ---- */}
      <GrowthChart
        title="Total accounts"
        caption={RANGES[range].label}
        data={series.cumulative}
        emptyNote="No accounts yet — the first signup starts this chart."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GrowthChart
          title="New accounts"
          caption="Signups per day"
          data={series.signups}
          emptyNote="Nobody signed up in this window."
        />
        <GrowthChart
          title="Active accounts"
          caption="Distinct sign-ins per day"
          data={series.active}
          emptyNote="No sign-ins recorded in this window."
        />
      </div>

      {/* ---- composition + retention ---- */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Accounts by role</h2>
            <ExportButton
              rows={roles.map((r) => ({ role: r.label, accounts: r.count }))}
              filename="edusentinel-accounts-by-role"
            />
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            {roles.map((r) => (
              <li key={r.role} className="flex items-center gap-4">
                <span className="w-28 shrink-0 text-[15px] text-text-secondary">{r.label}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-overlay">
                  <span
                    className="block h-full rounded-full bg-brand-cyan"
                    style={{
                      width: `${p.total === 0 ? 0 : Math.round((r.count / p.total) * 100)}%`,
                    }}
                  />
                </span>
                <span className="w-8 text-right text-[15px] font-semibold tabular-nums">
                  {r.count}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Retention</h2>
          {p.priorActive === 0 ? (
            <p className="mt-5 text-[15px] leading-relaxed text-text-muted">
              Not measurable yet. Retention compares who signed in during the last
              30 days against who signed in in the 30 days before that — and
              nobody signed in during that earlier window. The number will appear
              once the platform has two months of sign-ins behind it, and until
              then it stays blank rather than reading as 0%.
            </p>
          ) : (
            <div className="mt-5">
              <p className="text-[34px] font-semibold tracking-[-0.02em]">
                {pct(p.returning, p.priorActive)}
              </p>
              <p className="mt-1 text-[15px] text-text-secondary">
                {p.returning} of {p.priorActive} accounts active in the previous
                30-day window came back in this one.
              </p>
            </div>
          )}

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
            Invitation acceptance
          </h3>
          {invites.measured ? (
            <p className="mt-2 text-[15px]">
              {invites.accepted} of {invites.sent} invitations accepted.
            </p>
          ) : (
            <p className="mt-2 text-[15px] leading-relaxed text-text-muted">{invites.reason}</p>
          )}
        </Panel>
      </div>

      {/* ---- downloads ---- */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
              Downloads by release
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Lifetime pulls per published artifact — not a trend. We count each
              authorized download, but never recorded when it happened, so showing
              this over time would be an invention.
            </p>
          </div>
          {downloads.length > 0 && (
            <ExportButton rows={downloads} filename="edusentinel-downloads" />
          )}
        </div>

        {downloads.length === 0 ? (
          <p className="mt-6 text-[15px] text-text-muted">
            No published releases yet — sign and publish one to start counting.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="bg-surface-overlay/60 text-sm text-text-secondary">
                  <th className="rounded-l-card px-5 py-3.5 font-medium">Product</th>
                  <th className="px-5 py-3.5 font-medium">Version</th>
                  <th className="rounded-r-card px-5 py-3.5 text-right font-medium">
                    Downloads
                  </th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {downloads.map((d) => (
                  <tr
                    key={`${d.product}-${d.version}`}
                    className="border-b border-border-subtle last:border-0"
                  >
                    <td className="px-5 py-4 font-medium">{d.product}</td>
                    <td className="px-5 py-4 text-text-secondary">{d.version}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums">
                      {d.downloads}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border-subtle">
                  <td className="px-5 py-3.5 text-sm text-text-secondary" colSpan={2}>
                    Total
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums">
                    {totalDownloads}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const accent =
    tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-text-primary";
  return (
    <Panel>
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p className={`mt-2 text-[30px] font-semibold tracking-[-0.02em] ${accent}`}>{value}</p>
      <p className="mt-1 text-sm text-text-muted">{note}</p>
    </Panel>
  );
}

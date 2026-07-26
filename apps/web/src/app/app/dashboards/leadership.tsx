import Link from "next/link";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/guard";
import {
  greeting, leadershipStats, recentAudit, staffWithWork, teamCards,
} from "@/lib/dashboard";
import { growth } from "@/lib/analytics";
import { hrSummary } from "@/lib/hr";
import { directory } from "@/lib/people";
import { Avatar } from "@/components/dashboard/avatar";
import { ClockIcon, GlobeIcon } from "@/components/dashboard/icons";
import {
  WsActivityPanel, WsAddCard, WsAvatarCluster, WsHeadline, WsInkStat,
  WsInnerCard, WsMeters, WsMintStat, WsQuotaCard, WsResourceRow, WsTabs,
} from "@/components/dashboard/ws-widgets";

/*
 * Founder + Co-Founder dashboard, rebuilt to the approved reference.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAYOUT IS THE REFERENCE'S. DATA IS THIS PLATFORM'S.
 *
 * Every construction below maps one-for-one onto the screenshot — the enormous
 * headline with statistics hung beside it, the pill filter row, the mint
 * activity panel with its blocked bar chart, the three-column band of meters and
 * stat cards, and the right rail of add-card, resources and quota.
 *
 * What is NOT copied is the reference's content. This codebase forbids rendering
 * any number, name or state in /app that was not read from the database
 * (CLAUDE.md, enforced by `npm run test:data`), so "124 hours online" and "315
 * sites" are not reproduced as decoration — each slot is bound to the closest
 * real measurement this platform actually has. A dashboard that looks right and
 * lies is worse than one that looks wrong.
 *
 * Authority is unchanged: the same capability checks gate the same panels, and
 * founder-reserved actions are absent for a Co-Founder exactly as before,
 * because lib/permissions.ts never puts them in their effective set.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function LeadershipDashboard({ viewer }: { viewer: Viewer }) {
  const [stats, teams, series, audit, releases, people, staff, hr] =
    await Promise.all([
      leadershipStats(),
      teamCards(),
      growth("30d"),
      recentAudit(5),
      db.release.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          product: { select: { name: true } },
          artifact: { select: { scanStatus: true } },
        },
      }),
      viewer.can("users.view") ? directory("ALL") : [],
      staffWithWork(6),
      hrSummary(viewer),
    ]);

  const isFounder = viewer.role === "FOUNDER";
  const onlineNow = people.filter((p) => p.online).length;

  /* The chart. `growth("30d")` returns a cumulative series; the reference shows
     nine labelled columns, so it is thinned to the same shape rather than
     squeezing thirty into the space. */
  const step = Math.max(1, Math.ceil(series.cumulative.length / 9));
  const chart = series.cumulative.filter((_, i) => i % step === 0).slice(0, 9);

  /* "Most used" — real products ranked by how many releases they carry. */
  const products = await db.product.findMany({
    select: { id: true, name: true, status: true, _count: { select: { releases: true } } },
    orderBy: { releases: { _count: "desc" } },
    take: 5,
  });
  const topReleases = Math.max(1, ...products.map((p) => p._count.releases));

  /* Release health, measured — not invented. */
  const published = releases.filter((r) => r.status === "PUBLISHED").length;
  const cleanScans = releases.filter((r) => r.artifact?.scanStatus === "CLEAN").length;
  const scanPct = releases.length ? Math.round((cleanScans / releases.length) * 100) : 0;
  const mfaPct = people.length
    ? Math.round((people.filter((p) => p.mfaEnabled).length / people.length) * 100)
    : 0;

  /*
   * The pill row is NAVIGATION, not a filter.
   *
   * The reference shows "All" and "Activity" side by side; reproduced literally
   * that meant two pills pointing at this same page with no filtering behind
   * either — a control that changes nothing. So there is exactly one pill per
   * destination, "Overview" is this page and is correctly the active one, and
   * every other pill is gated on the capability that its page requires anyway.
   */
  const tabs = [
    { id: "overview", label: "Overview", href: "/app" },
    ...(viewer.can("users.view") ? [{ id: "people", label: "People", href: "/app/people" }] : []),
    ...(viewer.can("products.view")
      ? [{ id: "products", label: "Products", href: "/app/products" }]
      : []),
    ...(viewer.can("releases.review")
      ? [{ id: "releases", label: "Releases", href: "/app/admin/releases" }]
      : []),
    { id: "calendar", label: "Calendar", href: "/app/calendar" },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_248px]">
      {/* ─────────────────── main card ─────────────────── */}
      <div className="ws-card min-w-0 p-6 md:p-8">
        <WsHeadline
          title={greeting(viewer)}
          stats={[
            {
              icon: <ClockIcon size={20} />,
              label: "On the platform now",
              value: onlineNow,
              unit: onlineNow === 1 ? "person" : "people",
            },
            {
              icon: <GlobeIcon size={20} />,
              label: "Published releases",
              value: stats.releases,
              unit: stats.releases === 1 ? "release" : "releases",
            },
          ]}
        />

        <div className="mt-7">
          <WsTabs
            tabs={tabs}
            activeId="overview"
            /* Both shortcuts are gated on the capability their destination
               requires, so neither can lead to a refusal page. */
            action={
              viewer.can("analytics.read") || viewer.can("audit.read") ? (
                <span className="flex items-center gap-1.5 rounded-full border border-ws-line bg-white p-1.5">
                  {viewer.can("analytics.read") && (
                    <Link
                      href="/app/analytics"
                      prefetch
                      aria-label="Open analytics"
                      title="Analytics"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ws-dim transition-colors hover:bg-ws-canvas hover:text-ws-ink"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                      </svg>
                    </Link>
                  )}
                  {viewer.can("audit.read") && (
                    <Link
                      href="/app/audit"
                      prefetch
                      aria-label="Open the audit log"
                      title="Audit log"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-ws-ink text-white transition-transform hover:scale-105"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 7h16M4 12h16M4 17h10" />
                      </svg>
                    </Link>
                  )}
                </span>
              ) : undefined
            }
          />
        </div>

        {/* ── activity panel ── */}
        <div className="mt-5">
          <WsActivityPanel
            title="Account growth"
            caption="Last 30 days"
            series={chart}
            more={
              viewer.can("analytics.read")
                ? { label: "Analytics", href: "/app/analytics" }
                : undefined
            }
          >
            <WsInnerCard
              title="Your team"
              subtitle={`${stats.staff} staff · ${onlineNow} online now`}
              action={
                <Link
                  href="/app/people"
                  prefetch
                  aria-label="Open the directory"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-ws-line text-ws-ink transition-colors hover:bg-ws-canvas"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </Link>
              }
            >
              <span className="mt-3 flex -space-x-2">
                {staff.slice(0, 5).map((s) => (
                  <span key={s.id} className="ring-2 ring-white" style={{ borderRadius: 999 }}>
                    <Avatar name={s.name} size={28} src={s.avatarUrl} online={s.online} />
                  </span>
                ))}
              </span>
            </WsInnerCard>

            {hr && (
              <WsInnerCard
                title="Decisions waiting"
                subtitle={
                  hr.pendingRequests + hr.pendingFixes > 0
                    ? `${hr.pendingRequests + hr.pendingFixes} need an answer`
                    : "nothing pending"
                }
              >
                <span className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/app/leave"
                    prefetch
                    className="ws-pill flex h-8 items-center gap-2 px-3 text-[12px] font-medium text-ws-ink"
                  >
                    <span className="h-2 w-2 rounded-full bg-ws-lilac" />
                    Leave · {hr.pendingRequests}
                  </Link>
                  <Link
                    href="/app/attendance"
                    prefetch
                    className="ws-pill flex h-8 items-center gap-2 px-3 text-[12px] font-medium text-ws-ink"
                  >
                    <span className="h-2 w-2 rounded-full bg-ws-mint" />
                    Corrections · {hr.pendingFixes}
                  </Link>
                </span>
              </WsInnerCard>
            )}
          </WsActivityPanel>
        </div>

        {/* ── three-column band ── */}
        <div className="mt-7 grid gap-7 lg:grid-cols-3">
          <section>
            <h2 className="font-display text-[26px] font-semibold tracking-[-0.03em] text-ws-ink">
              Most used
            </h2>
            <p className="mt-0.5 text-[12px] text-ws-dim">
              {products.length} products by release count
            </p>
            <div className="mt-6">
              {products.length > 0 ? (
                <WsMeters
                  items={products.map((p) => ({
                    label: p.name,
                    percent: (p._count.releases / topReleases) * 100,
                  }))}
                />
              ) : (
                <p className="py-10 text-center text-[13px] text-ws-dim">
                  No products yet.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="font-display text-[26px] font-semibold tracking-[-0.03em] text-ws-ink">
              Protection
            </h2>
            <p className="mt-0.5 text-[12px] text-ws-dim">Measured from our own records</p>
            <div className="mt-6 flex flex-col gap-3">
              <WsMintStat
                label="Two-factor coverage"
                note={`${people.filter((p) => p.mfaEnabled).length} of ${people.length} accounts`}
                value={`${mfaPct}%`}
              />
              <WsInkStat
                label="Clean scans"
                note={`${cleanScans} of ${releases.length} recent artifacts`}
                value={`${scanPct}%`}
                /* The waveform is drawn from the real scan outcomes, so a run of
                   flagged artifacts visibly dents it. */
                bars={releases.flatMap((r) =>
                  r.artifact?.scanStatus === "CLEAN" ? [90, 70, 100, 60] : [22, 14, 30, 12],
                )}
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-[26px] font-semibold tracking-[-0.03em] text-ws-ink">
              Pipeline
            </h2>
            <p className="mt-0.5 text-[12px] text-ws-dim">
              {published} published · {releases.length - published} in review
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              {releases.slice(0, 4).map((r) => (
                <Link
                  key={r.id}
                  href="/app/admin/releases"
                  prefetch
                  className="ws-pill ws-lift flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-ws-ink">
                      {r.product.name}
                    </span>
                    <span className="block font-mono text-[11px] text-ws-dim">
                      v{r.version}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      r.status === "PUBLISHED"
                        ? "bg-ws-mint text-ws-ink"
                        : r.status === "REVOKED"
                          ? "bg-ws-ink text-white"
                          : "bg-ws-lilac text-ws-ink"
                    }`}
                  >
                    {r.status}
                  </span>
                </Link>
              ))}
              {releases.length === 0 && (
                <p className="py-10 text-center text-[13px] text-ws-dim">
                  No releases yet.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ── recent activity ── */}
        {viewer.can("audit.read") && (
          <section className="mt-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ws-ink">
                Recent activity
              </h2>
              <Link href="/app/audit" prefetch className="text-[13px] font-medium text-ws-ink underline underline-offset-4">
                Audit log
              </Link>
            </div>
            <ul className="mt-4 flex flex-col">
              {audit.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-4 border-b border-ws-line py-3 last:border-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[13px] font-medium text-ws-ink">
                      {e.action}
                    </span>
                    <span className="block truncate text-[11px] text-ws-dim">
                      {e.actorEmail ?? "system"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-ws-dim">
                    {e.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
              {audit.length === 0 && (
                <li className="py-8 text-center text-[13px] text-ws-dim">
                  No activity recorded.
                </li>
              )}
            </ul>
          </section>
        )}
      </div>

      {/* ─────────────────── right rail ─────────────────── */}
      <aside className="flex min-w-0 flex-col gap-3">
        {/*
          * Gated on being the Founder, not on `people.invite`.
          *
          * The only surface that sends an invitation is /app/access, and that
          * page is `requireFounder`. Showing this card to a Co-Founder who holds
          * people.invite would offer them a button whose destination refuses
          * them — the exact class of thing this audit removes. Where the
          * capability may be exercised is an authorization question, and
          * authorization is not changed here.
          */}
        {isFounder && (
          <WsAddCard
            title="Add user"
            subtitle="Invite someone to the workspace"
            href="/app/access"
          />
        )}

        {staff.length > 0 && <WsAvatarCluster names={staff.map((s) => s.name)} />}

        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[12px] text-ws-dim">
            {stats.staff} {stats.staff === 1 ? "person" : "people"} on the team
          </span>
          <Link
            href="/app/people"
            prefetch
            className="ws-pill flex h-8 items-center gap-1 px-3 text-[12px] font-medium text-ws-ink"
          >
            view all
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div className="mt-2 flex items-baseline justify-between px-1">
          <h2 className="text-[14px] font-semibold text-ws-ink">Products</h2>
          {/* `products` is the top five by release count, so it cannot be used
              as the catalogue total — that count comes from leadershipStats(). */}
          <span className="text-[11px] text-ws-dim">
            {products.length < stats.products
              ? `${products.length} of ${stats.products}`
              : `${stats.products} listed`}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <WsResourceRow
              key={p.id}
              label={p.name}
              state={p.status === "PUBLISHED" ? "on" : p.status === "DRAFT" ? "limited" : "off"}
              href="/app/products"
            />
          ))}
          {products.length === 0 && (
            <p className="px-1 py-4 text-[12px] text-ws-dim">No products yet.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/products"
            prefetch
            className="ws-pill flex h-9 flex-1 items-center justify-center gap-1 text-[12px] font-medium text-ws-ink"
          >
            view all
          </Link>
          {viewer.can("products.manage") && (
            <Link
              href="/app/products#new"
              prefetch
              className="ws-pill flex h-9 flex-1 items-center justify-center gap-1 text-[12px] font-medium text-ws-ink"
            >
              add
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </Link>
          )}
        </div>

        <WsQuotaCard
          used={stats.liveProducts}
          total={stats.products}
          unit="products live"
          title={isFounder ? "You hold full authority" : "Co-Founder view"}
          body={
            isFounder
              ? "Access, releases and permissions are yours. Signing stays with you alone."
              : "Release signing and access control remain with the Founder."
          }
          href={isFounder ? "/app/access" : "/app/products"}
        />

        {teams.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <h2 className="px-1 text-[14px] font-semibold text-ws-ink">Teams</h2>
            {teams.slice(0, 3).map((t) => (
              <Link
                key={t.id}
                href={`/app/teams/${t.id}`}
                prefetch
                className="ws-pill ws-lift flex items-center justify-between gap-2 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-ws-ink">
                    {t.name}
                  </span>
                  <span className="block text-[11px] text-ws-dim">
                    {t.memberCount} {t.memberCount === 1 ? "member" : "members"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

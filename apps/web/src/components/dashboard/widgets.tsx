import Link from "next/link";
import { AvatarStack } from "./avatar";
import { ExportButton, type ExportRow } from "./export-button";
import { ChevronLeft, ChevronRight, PlusIcon, SearchIcon } from "./icons";
import { Tilt } from "./tilt";

/* Reference widgets, re-skinned to EduSentinel tokens. Layout follows the
 * approved screenshots closely; colours/type/radius come from tokens.css only. */

export function Panel({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  /** Anchor target, so SectionTabs can jump to (and highlight) this panel. */
  id?: string;
}) {
  return (
    <section
      id={id}
      /*
       * `ws-card` — the reference's card: white, generously rounded, soft wide
       * shadow. Every other /app page is built out of Panel, so restyling it
       * here is what makes the whole workspace consistent with the redesigned
       * dashboard rather than only the dashboard itself matching.
       *
       * It also inherits the dark-mode override for free: `.ws-card` becomes
       * Phase 9.4 glass under `[data-theme="dark"]`, so the meteor theme reads
       * through every page, not just this one.
       *
       * scroll-mt clears the top bar when a section anchor jumps here.
       */
      className={`scroll-mt-24 ws-card p-6 ${className}`}
    >
      {children}
    </section>
  );
}

/*
 * The page header from the reference (Phase 10, Task 3).
 *
 * The reference leads with a very large display headline and hangs its headline
 * statistics INLINE beside it — "Verification stats · ⏱ 124 hours online · 🌐 315
 * sites" — rather than stacking another row of cards under it. It reads as one
 * sentence about the state of things, which is what a dashboard headline should
 * be, and it recovers a whole band of vertical space.
 *
 * `stats` is optional and every entry must be a measured value. A stat with
 * nothing behind it is not passed in — it is not rendered as a zero (CLAUDE.md:
 * a metric that cannot be measured is reported as unmeasured, never as zero).
 */
export function PageHeader({
  title,
  subtitle,
  stats = [],
  action,
}: {
  title: string;
  subtitle?: string;
  stats?: { icon: React.ReactNode; label: string; value: string | number; unit?: string }[];
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
      <div className="min-w-0">
        {/* Matched to the reference's headline scale, so a section page and the
            dashboard share one typographic voice. */}
        <h1 className="font-display text-[36px] font-semibold leading-[0.98] tracking-[-0.04em] md:text-[48px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
            {subtitle}
          </p>
        )}
      </div>

      {stats.length > 0 && (
        <dl className="flex flex-wrap items-center gap-x-8 gap-y-5">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-subtle text-text-secondary">
                {s.icon}
              </span>
              <span>
                <dt className="text-xs leading-tight text-text-secondary">{s.label}</dt>
                <dd className="flex items-baseline gap-1.5">
                  <span className="font-display text-[26px] font-semibold leading-none tracking-[-0.02em]">
                    {s.value}
                  </span>
                  {s.unit && (
                    <span className="text-xs text-text-muted">{s.unit}</span>
                  )}
                </dd>
              </span>
            </div>
          ))}
        </dl>
      )}

      {action}
    </div>
  );
}

export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[15px]">
      {trail.map((t, i) => (
        <span key={t.label} className="flex items-center gap-2">
          {i > 0 && <span className="text-text-muted">›</span>}
          {t.href && i < trail.length - 1 ? (
            <Link href={t.href} className="text-text-secondary hover:text-text-primary">
              {t.label}
            </Link>
          ) : (
            <span
              className={
                i === trail.length - 1 && trail.length > 1
                  ? "font-medium text-text-primary"
                  : "text-text-secondary"
              }
            >
              {t.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/*
 * The summary cards across the top of the reference dashboard.
 *
 * `people` and `href` are OPTIONAL (Phase 6.1). The avatar stack used to be
 * required, so every card carried one whether or not people had anything to do
 * with it — the member and collaborator dashboards passed `[viewer.name]` and
 * rendered a stack of you, alone, looking at yourself. A card now shows the
 * stack only when it is genuinely about those people, and the "More" link only
 * when there is somewhere else to go.
 */
export function StatCard({
  icon,
  title,
  subtitle,
  people,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  people?: string[];
  href?: string;
}) {
  const hasPeople = !!people?.length;
  const footer = hasPeople || !!href;

  return (
    // Tilt goes on the summary cards and nowhere else: they exist to be glanced
    // at. It is inert in light mode and under reduced motion (--tilt-max: 0deg).
    <Tilt>
      <Panel>
        <div className="flex items-start gap-4">
        {/* rounded-[18px]: the reference's icon tile is a squircle, noticeably
            rounder than the card token but not a circle. */}
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-brand-cyan/10 text-brand-cyan">
          {icon}
        </span>
        <span>
          <span className="block font-display text-[19px] font-semibold tracking-[-0.015em]">
            {title}
          </span>
          <span className="mt-0.5 block text-sm text-text-secondary">{subtitle}</span>
        </span>
      </div>
      {footer && (
        <div className="mt-6 flex items-end justify-between">
          {hasPeople ? <AvatarStack names={people!} /> : <span />}
          {href && (
            <Link
              href={href}
              className="text-sm font-medium text-brand-cyan transition-colors duration-[--duration-fast] hover:text-brand-teal"
            >
              More
            </Link>
          )}
        </div>
      )}
      </Panel>
    </Tilt>
  );
}

/*
 * Table toolbar. Search and Export are rendered ONLY when the page actually
 * implements them — a control that does nothing when clicked is worse than no
 * control, however closely it matches the reference.
 *
 * `searchPath` turns the box into a plain GET form, so search survives with
 * JavaScript disabled and the query lives in a shareable URL.
 */
export function TableToolbar({
  title,
  onAddHref,
  addLabel = "Add",
  searchPath,
  query = "",
  exportRows,
  exportName,
}: {
  title: string;
  onAddHref?: string;
  addLabel?: string;
  searchPath?: string;
  query?: string;
  exportRows?: ExportRow[];
  exportName?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">
        {searchPath && (
          <form action={searchPath} className="relative">
            <label className="sr-only" htmlFor={`q-${searchPath}`}>
              Search {title}
            </label>
            <SearchIcon
              size={17}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              id={`q-${searchPath}`}
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search for ..."
              className="h-10 w-[200px] rounded-full border border-border-subtle bg-surface-raised pl-4 pr-10 text-sm outline-none transition-colors duration-[--duration-fast] placeholder:text-text-muted focus:border-brand-cyan"
            />
          </form>
        )}
        {onAddHref && (
          <Link
            href={onAddHref}
            className="flex h-10 items-center gap-1.5 rounded-control border border-border-subtle px-4 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
          >
            {addLabel}
            <PlusIcon size={15} />
          </Link>
        )}
        {exportRows && exportName && (
          <ExportButton rows={exportRows} filename={exportName} />
        )}
      </div>
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const tone =
    status === "PUBLISHED" || status === "Active" || status === "APPROVED" || status === "CLEAN"
      ? "bg-success text-success"
      : status === "REVOKED" || status === "REJECTED" || status === "FLAGGED"
        ? "bg-danger text-danger"
        : status === "QUARANTINED" || status === "PENDING"
          ? "bg-warning text-warning"
          : "bg-brand-cyan text-brand-cyan";
  const [dot, text] = tone.split(" ");
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className={`text-sm font-medium ${text}`}>{status}</span>
    </span>
  );
}

/*
 * Pagination. Page controls appear only when there is more than one page, and
 * the current page is the real one — the reference's static "01" chip would be
 * lying to the operator about how much data they are looking at.
 *
 * `hrefFor` makes the pages real links (GET), so paging works without JS.
 */
export function Pagination({
  shown,
  total,
  page = 1,
  pageSize,
  hrefFor,
}: {
  shown: number;
  total: number;
  page?: number;
  pageSize?: number;
  hrefFor?: (page: number) => string;
}) {
  const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const paged = !!hrefFor && !!pageSize && pages > 1;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm text-text-secondary">
      <span>
        Showing{" "}
        <span className="rounded-control border border-border-subtle px-2 py-1 font-medium text-text-primary">
          {String(shown).padStart(2, "0")}
        </span>{" "}
        of {total} {total === 1 ? "result" : "results"}
      </span>

      {paged && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:bg-surface-overlay"
            >
              <ChevronLeft size={16} />
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-control text-border-subtle">
              <ChevronLeft size={16} />
            </span>
          )}

          <span className="flex h-8 min-w-8 items-center justify-center rounded-control bg-brand-cyan px-2 text-sm font-medium text-surface-raised">
            {String(page).padStart(2, "0")}
          </span>
          <span className="text-text-muted">/ {String(pages).padStart(2, "0")}</span>

          {page < pages ? (
            <Link
              href={hrefFor(page + 1)}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:bg-surface-overlay"
            >
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-control text-border-subtle">
              <ChevronRight size={16} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Segmented progress bar — the reference's ▪▪▪▫▫ project meters. */
export function SegmentedBar({ value }: { value: number }) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * 10);
  return (
    <span className="flex items-center gap-3">
      <span className="flex gap-[3px]" role="img" aria-label={`${value} percent`}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`h-[13px] w-[7px] rounded-[2px] ${
              i < filled ? "bg-success" : "bg-surface-overlay"
            }`}
          />
        ))}
      </span>
      <span className="w-9 text-right text-sm font-semibold tabular-nums">{value}%</span>
    </span>
  );
}

export type TeamCardData = {
  id: string;
  name: string;
  memberCount: number;
  members: string[];
  projects: { id: string; name: string; progress: number }[];
};

export function TeamCard({ team }: { team: TeamCardData }) {
  return (
    <Panel className="break-inside-avoid">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{team.name}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
            {team.memberCount} Members
            <Link href={`/app/teams/${team.id}`} className="text-brand-cyan underline">
              View All
            </Link>
          </p>
        </div>
        <AvatarStack names={team.members} size={32} />
      </div>

      <p className="mt-5 text-[15px] font-medium">
        Current Project ({team.projects.length})
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {team.projects.length === 0 && (
          <p className="text-sm text-text-muted">No active projects.</p>
        )}
        {team.projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-4 rounded-card border border-border-subtle px-4 py-3"
          >
            <span className="min-w-0 truncate text-sm text-text-secondary">{p.name}</span>
            <SegmentedBar value={p.progress} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

/*
 * Bar chart from the reference (pure CSS — no charting dependency).
 *
 * A series with nothing in it says so (`emptyNote`) instead of drawing a row of
 * floor-height bars, which reads as "we measured, and it is nearly zero" when the
 * truth is "there is nothing here yet". Long ranges thin out their labels rather
 * than overlapping them into mush.
 */
export function GrowthChart({
  title,
  data,
  caption,
  emptyNote = "Nothing to show for this range yet.",
}: {
  title: string;
  data: { label: string; value: number }[];
  caption?: string;
  emptyNote?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const empty = data.length === 0 || data.every((d) => d.value === 0);
  const every = Math.ceil(data.length / 12); // keep ~12 labels, whatever the range

  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
        {caption && <span className="text-sm text-text-secondary">{caption}</span>}
      </div>

      {empty ? (
        <p className="mt-8 flex h-[200px] items-center justify-center text-center text-[15px] text-text-muted">
          {emptyNote}
        </p>
      ) : (
        <div className="mt-8 flex h-[200px] items-end justify-between gap-1.5 sm:gap-3">
          {data.map((d, i) => {
            const pct = Math.round((d.value / max) * 100);
            return (
              <div key={d.label + i} className="flex flex-1 flex-col items-center gap-3">
                <div className="relative flex h-full w-full max-w-[46px] items-end rounded-[6px] bg-surface-overlay">
                  <div
                    className="w-full rounded-[6px] bg-brand-cyan transition-[height] duration-[--duration-reveal] ease-[--ease-brand]"
                    style={{ height: `${d.value === 0 ? 2 : Math.max(4, pct)}%` }}
                    title={`${d.label}: ${d.value}`}
                  />
                </div>
                <span className="h-4 whitespace-nowrap text-xs text-text-secondary">
                  {i % every === 0 ? d.label : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------- empty states ---- */

/**
 * A designed empty state.
 *
 * Panels used to report "nothing here" as a single line of muted text inside a
 * full-height card, which is why short pages read as broken rather than as
 * finished-but-quiet. The rule in this codebase is that we never invent data to
 * fill a space — so the space has to be made deliberate instead: an icon, a
 * sentence that says why it is empty, and, where one exists, the action that
 * would fill it.
 *
 * `action` is optional and should be omitted when the viewer lacks the
 * capability to perform it — offering a button that leads to a refusal is the
 * dead-control problem again.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-border-subtle px-6 text-center ${
        compact ? "py-8" : "py-14"
      }`}
    >
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-overlay text-text-muted">
          {icon}
        </span>
      )}
      <p className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">{title}</p>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-text-secondary">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * The workspace's page rhythm.
 *
 * Every /app page is a vertical stack of Panels. On a wide monitor a stack of
 * short panels leaves a large dead region below the fold — measured at 528px of
 * empty canvas on Collaboration at 1920x1080, which is what "there is a huge
 * blank space" means concretely.
 *
 * `PageColumns` is the fix, and it is a LAYOUT fix rather than a stretch: on
 * wide viewports the stack becomes two columns, so the same content is wider
 * and roughly half as tall, and the page fills the fold because it is better
 * arranged — not because anything was padded out. Below `xl` it collapses back
 * to the single stack, which is correct on a laptop and required on a phone.
 */
/*
 * The ratios are STATIC CLASS STRINGS, deliberately.
 *
 * `xl:grid-cols-[${ratio}]` would be a dynamic class name, and Tailwind extracts
 * classes by scanning source text — an interpolated one is never generated and
 * the column split silently does not happen. Same family of bug as the v3
 * `bg-[--var]` shorthand that produced transparent backgrounds here before.
 */
const COLUMN_RATIOS = {
  balanced: "xl:grid-cols-2",
  mainWide: "xl:grid-cols-[1.35fr_1fr]",
  sideWide: "xl:grid-cols-[1fr_1.35fr]",
} as const;

export function PageColumns({
  main,
  side,
  ratio = "mainWide",
  fill = true,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
  ratio?: keyof typeof COLUMN_RATIOS;
  /**
   * Grow to fill the page's remaining height, so the columns end at the fold
   * instead of leaving bare canvas beneath them. The panels inside decide what
   * to do with that height — an empty state centres in it; a list simply starts
   * at the top as it always did. Set false for a short section that should keep
   * its natural height.
   */
  fill?: boolean;
}) {
  return (
    <div
      className={`grid gap-4 ${COLUMN_RATIOS[ratio]} ${
        fill ? "grow items-stretch" : "items-start"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-4">{main}</div>
      <div className="flex min-w-0 flex-col gap-4">{side}</div>
    </div>
  );
}

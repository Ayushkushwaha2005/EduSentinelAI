import Link from "next/link";
import { AvatarStack } from "./avatar";
import { ExportButton, type ExportRow } from "./export-button";
import { ChevronLeft, ChevronRight, PlusIcon, SearchIcon } from "./icons";

/* Reference widgets, re-skinned to EduSentinel tokens. Layout follows the
 * approved screenshots closely; colours/type/radius come from tokens.css only. */

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card bg-surface-raised p-6 ${className}`}>
      {children}
    </section>
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

/** The three summary cards across the top of the reference dashboard. */
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
  people: string[];
  href: string;
}) {
  return (
    <Panel>
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-brand-cyan/10 text-brand-cyan">
          {icon}
        </span>
        <span>
          <span className="block text-[19px] font-semibold tracking-[-0.01em]">
            {title}
          </span>
          <span className="mt-0.5 block text-sm text-text-secondary">{subtitle}</span>
        </span>
      </div>
      <div className="mt-6 flex items-end justify-between">
        <AvatarStack names={people} />
        <Link
          href={href}
          className="text-sm font-medium text-brand-cyan transition-colors duration-[--duration-fast] hover:text-brand-teal"
        >
          More
        </Link>
      </div>
    </Panel>
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

/** Bar chart from the reference (pure CSS — no charting dependency). */
export function GrowthChart({
  title,
  data,
  caption,
}: {
  title: string;
  data: { label: string; value: number }[];
  caption?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
        {caption && <span className="text-sm text-text-secondary">{caption}</span>}
      </div>
      <div className="mt-8 flex h-[200px] items-end justify-between gap-3">
        {data.map((d) => {
          const pct = Math.round((d.value / max) * 100);
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-3">
              <div className="relative flex h-full w-full max-w-[46px] items-end rounded-[6px] bg-surface-overlay">
                <div
                  className="w-full rounded-[6px] bg-brand-cyan transition-[height] duration-[--duration-reveal] ease-[--ease-brand]"
                  style={{ height: `${Math.max(4, pct)}%` }}
                  title={`${d.label}: ${d.value}`}
                />
              </div>
              <span className="whitespace-nowrap text-xs text-text-secondary">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

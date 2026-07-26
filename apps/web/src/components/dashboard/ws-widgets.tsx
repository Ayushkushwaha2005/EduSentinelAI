import Link from "next/link";
import { Avatar } from "./avatar";

/*
 * The reference's content vocabulary.
 *
 * Each of these reproduces one construction from the approved screenshot. They
 * are presentational only — every value arrives as a prop, read from the
 * database by the page, because nothing in /app may render a figure that is not
 * real (CLAUDE.md, enforced by `npm run test:data`).
 */

/* ---------------------------------------------------------- headline ---- */

/**
 * "Verification stats" + the two inline statistics beside it.
 *
 * The reference sets the headline enormous (~54px, tight tracking) and hangs the
 * statistics to its right rather than stacking cards beneath — which is what
 * makes the top of the page read as one sentence about the state of things.
 */
export function WsHeadline({
  title,
  stats,
}: {
  title: string;
  stats: { icon: React.ReactNode; label: string; value: string | number; unit: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
      <h1 className="font-display text-[38px] font-semibold leading-[0.98] tracking-[-0.04em] text-ws-ink md:text-[52px]">
        {title}
      </h1>

      {stats.length > 0 && (
        <dl className="flex flex-wrap items-center gap-x-10 gap-y-5">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3.5">
              <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-ws-line text-ws-ink">
                {s.icon}
              </span>
              <span>
                <dt className="text-[13px] leading-tight text-ws-dim">{s.label}</dt>
                <dd className="flex items-baseline gap-1.5">
                  <span className="font-display text-[34px] font-semibold leading-none tracking-[-0.03em] text-ws-ink">
                    {s.value}
                  </span>
                  <span className="text-[11px] text-ws-dim">{s.unit}</span>
                </dd>
              </span>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- pills ---- */

export type WsTab = { id: string; label: string; href: string };

/** The reference's filter row: outlined pills, the active one filled mint. */
export function WsTabs({
  tabs,
  activeId,
  action,
}: {
  tabs: WsTab[];
  activeId: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav aria-label="Sections" className="-mx-1 overflow-x-auto">
        <ul className="flex w-max items-center gap-2.5 px-1">
          {tabs.map((t) => {
            const active = t.id === activeId;
            return (
              <li key={t.id}>
                <Link
                  href={t.href}
                  prefetch
                  aria-current={active ? "true" : undefined}
                  className={`ws-pill flex h-[42px] items-center whitespace-nowrap px-6 text-[15px] font-medium ${
                    active
                      ? "ws-pill-active text-ws-ink"
                      : "text-ws-dim hover:text-ws-ink"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------- activity ---- */

/**
 * The mint activity panel and its bar chart.
 *
 * Two details from the reference that are easy to miss and matter a lot:
 *   - bars are rounded SQUARES stacked in a column, not one continuous bar;
 *   - a period with no data is drawn HATCHED, not as a floor-height bar. That is
 *     also this codebase's own rule for empty series, so it is literal here.
 */
export function WsActivityPanel({
  title,
  series,
  caption,
  children,
}: {
  title: string;
  series: { label: string; value: number }[];
  caption?: string;
  children?: React.ReactNode;
}) {
  const max = Math.max(1, ...series.map((d) => d.value));
  // Column height in "cells": the reference's tallest column is 5 blocks.
  const CELLS = 5;

  return (
    <section className="ws-panel ws-mint relative overflow-hidden p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="ws-pill flex h-8 items-center gap-1.5 bg-ws-lilac px-4 text-[13px] font-medium text-ws-ink">
          More
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {caption && (
          <span className="text-[12px] font-medium text-ws-ink/55">{caption}</span>
        )}
      </div>

      <h2 className="mt-5 font-display text-[30px] font-semibold tracking-[-0.03em] text-ws-ink">
        {title}
      </h2>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr]">
        <div className="flex flex-col gap-3">{children}</div>

        {/* the chart */}
        <div className="min-w-0">
          <div className="flex h-[190px] items-end justify-between gap-1.5 sm:gap-2.5">
            {series.map((d, i) => {
              const filled = d.value === 0 ? 0 : Math.max(1, Math.round((d.value / max) * CELLS));
              return (
                <div key={d.label + i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full max-w-[42px] flex-1 flex-col-reverse gap-1.5">
                    {Array.from({ length: CELLS }).map((_, cell) => {
                      const on = cell < filled;
                      // The reference darkens the topmost block of the tallest
                      // columns — depth without a second hue.
                      const top = on && cell === filled - 1 && filled >= 4;
                      return (
                        <span
                          key={cell}
                          className={`aspect-square w-full rounded-[9px] ${
                            on
                              ? top
                                ? "bg-ws-ink"
                                : "bg-ws-ink/35"
                              : filled === 0
                                ? "ws-hatch rounded-[9px]"
                                : "bg-white/45"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className="truncate text-[10px] text-ws-ink/55">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The white inner card inside the activity panel. */
export function WsInnerCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] bg-white/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium text-ws-ink">{title}</span>
          <span className="block truncate text-[11px] text-ws-dim">{subtitle}</span>
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- meters ---- */

/**
 * "Most used" — the vertical thermometer meters.
 *
 * Light rounded track, coloured fill rising from the bottom, and the percentage
 * in a tinted chip at the foot of each. The reference cycles mint / lilac /
 * black across the row.
 */
const METER_TONES = [
  { fill: "bg-ws-mint", chip: "bg-ws-mint text-ws-ink" },
  { fill: "bg-ws-lilac", chip: "bg-ws-lilac text-ws-ink" },
  { fill: "bg-ws-ink", chip: "bg-ws-ink text-white" },
];

export function WsMeters({
  items,
}: {
  items: { label: string; percent: number }[];
}) {
  return (
    <div className="flex items-end justify-between gap-2.5">
      {items.map((m, i) => {
        const tone = METER_TONES[i % METER_TONES.length];
        const pct = Math.max(0, Math.min(100, Math.round(m.percent)));
        return (
          <div key={m.label} className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
            {/* The track needs a touch more contrast than the canvas grey: on a
                white card, #f0f1f3 all but disappears and the meters read as
                floating labels. */}
            <div
              className="ws-track relative flex h-[130px] w-full max-w-[34px] items-end overflow-hidden rounded-full"
              role="img"
              aria-label={`${m.label}: ${pct}%`}
              title={`${m.label}: ${pct}%`}
            >
              <span
                className={`w-full rounded-full transition-[height] duration-[--duration-reveal] ease-[--ease-brand] ${tone.fill}`}
                style={{ height: `${Math.max(pct, 6)}%` }}
              />
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.chip}`}>
              {pct}
              <span className="text-[8px]">%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------- stat cards ---- */

/** The mint statistic card — big percentage, label, trend note. */
export function WsMintStat({
  label,
  note,
  value,
  children,
}: {
  label: string;
  note: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="ws-panel ws-mint relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-[15px] font-medium text-ws-ink">{label}</span>
          <span className="block text-[11px] text-ws-ink/55">{note}</span>
        </span>
      </div>
      <p className="mt-6 font-display text-[36px] font-semibold leading-none tracking-[-0.03em] text-ws-ink">
        {value}
      </p>
      {children}
    </div>
  );
}

/** The black statistic card — inverted, with a waveform. */
export function WsInkStat({
  label,
  note,
  value,
  bars,
}: {
  label: string;
  note: string;
  value: string;
  bars: number[];
}) {
  return (
    <div className="ws-panel ws-ink p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[15px] font-medium">{label}</span>
          <span className="block text-[11px] text-white/50">{note}</span>
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        {/* the reference's dense hairline waveform */}
        <span aria-hidden="true" className="flex h-[54px] flex-1 items-end gap-[2px]">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-[2px] flex-1 rounded-full bg-white/70"
              style={{ height: `${Math.max(8, Math.min(100, h))}%` }}
            />
          ))}
        </span>
        <span className="shrink-0 font-display text-[32px] font-semibold leading-none tracking-[-0.03em]">
          {value}
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- right rail ---- */

/** The dashed "Add user" card at the top of the reference's right rail. */
export function WsAddCard({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="ws-lift group relative flex flex-col items-center justify-end rounded-[22px] border-2 border-dashed border-ws-line bg-white p-5 pt-12 text-center"
    >
      {/* the reference's minimal person illustration: a circle and a mint arc */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-7 flex flex-col items-center">
        <span className="h-11 w-11 rounded-full border-2 border-ws-line" />
        <span className="-mt-1.5 h-7 w-[104px] rounded-t-full bg-ws-mint" />
      </span>
      <span className="relative mt-14 block font-display text-[19px] font-semibold tracking-[-0.02em] text-ws-ink">
        {title}
      </span>
      <span className="relative block text-[11px] text-ws-dim">{subtitle}</span>
    </Link>
  );
}

/** The mint-bordered avatar cluster. */
export function WsAvatarCluster({ names }: { names: string[] }) {
  const shown = names.slice(0, 3);

  return (
    <div className="flex items-center justify-between gap-2 rounded-full border-2 border-ws-mint bg-white p-1.5">
      <span className="flex -space-x-2.5 pl-0.5">
        {shown.map((n) => (
          <span key={n} className="ring-2 ring-white" style={{ borderRadius: 999 }}>
            <Avatar name={n} size={32} />
          </span>
        ))}
      </span>
      <span className="flex items-center gap-1 pr-2.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-ws-ink" />
        <span className="h-1.5 w-1.5 rounded-full bg-ws-line" />
        <span className="h-1.5 w-1.5 rounded-full bg-ws-line" />
      </span>
    </div>
  );
}

/** A resource row: name, state pill, and a status toggle. */
export function WsResourceRow({
  label,
  state,
  href,
}: {
  label: string;
  state: "on" | "off" | "limited";
  href: string;
}) {
  const tone =
    state === "on"
      ? "bg-ws-mint"
      : state === "limited"
        ? "bg-ws-lilac"
        : "bg-ws-ink";
  return (
    <Link
      href={href}
      prefetch
      className="ws-pill flex h-[46px] items-center justify-between gap-2 px-4"
    >
      <span className="min-w-0 truncate text-[14px] font-medium text-ws-ink">
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span aria-hidden="true" className="text-ws-dim">···</span>
        <span className={`h-[22px] w-[22px] rounded-full ${tone}`} />
        <span className="w-[42px] text-[11px] text-ws-dim">{state}</span>
      </span>
    </Link>
  );
}

/** The dark quota card that closes the reference's right rail. */
export function WsQuotaCard({
  used,
  total,
  unit,
  title,
  body,
  href,
}: {
  used: number;
  total: number;
  unit: string;
  title: string;
  body: string;
  href: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const DOTS = 26;
  const lit = Math.round((pct / 100) * DOTS);

  return (
    <div className="ws-panel ws-ink relative overflow-hidden p-5">
      <div className="rounded-[16px] bg-ws-mint px-4 py-3 text-center text-ws-ink">
        <p className="font-display text-[26px] font-semibold leading-none tracking-[-0.02em]">
          {used}
          <span className="text-ws-ink/45">/{total}</span>
        </p>
        <p className="mt-1 text-[10px] text-ws-ink/60">{unit}</p>
      </div>

      {/* the reference's dotted progress arc */}
      <span aria-hidden="true" className="mt-3 flex items-center gap-[3px]">
        {Array.from({ length: DOTS }).map((_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full ${i < lit ? "bg-white" : "bg-white/25"}`}
          />
        ))}
      </span>

      <p className="mt-4 text-[15px] font-medium">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-white/55">{body}</p>

      <Link
        href={href}
        prefetch
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-white transition-opacity hover:opacity-70"
      >
        More info
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

/*
 * The workspace loading state (Phase 10, Tasks 8 + 9).
 *
 * There was no loading.tsx anywhere in this application. Every navigation —
 * including the one straight after a 2FA code is accepted — held the previous
 * screen, motionless, until every query for the next one had returned. On a
 * serverless Postgres that is the entire "verification succeeded, then a long
 * unexplained wait" complaint in Task 9: the work was never the bottleneck, the
 * absence of a boundary to stream into was.
 *
 * With this file present, Next.js wraps the route in a Suspense boundary and
 * paints this skeleton the instant navigation starts. The shape below is
 * deliberately the shape of the real dashboard — header, tab row, three summary
 * cards, a table — so the transition is a fill-in rather than a flash of
 * something else.
 *
 * `animate-pulse` is a Tailwind built-in and is switched off by the global
 * reduced-motion block in globals.css.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-full bg-surface-overlay ${className}`} />;
}

function Card() {
  return (
    <div className="rounded-panel bg-surface-raised p-6">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 rounded-[18px] bg-surface-overlay" />
        <div className="flex-1">
          <Bar className="h-4 w-1/2" />
          <Bar className="mt-2.5 h-3 w-3/4" />
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Bar className="h-7 w-24" />
        <Bar className="h-3 w-12" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    // aria-busy + a polite status role: someone using a screen reader is told the
    // page is loading, which is the half of this fix that is not visual.
    <div
      className="flex animate-pulse flex-col gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading your workspace"
    >
      {/* breadcrumb */}
      <Bar className="h-4 w-28" />

      {/* page header: headline + inline stats */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <Bar className="h-10 w-72 max-w-full" />
          <Bar className="mt-3 h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-8">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-surface-overlay" />
              <div>
                <Bar className="h-3 w-16" />
                <Bar className="mt-2 h-5 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* tab row — varied widths so it reads as words, not as four identical pills */}
      <div className="mt-1 flex gap-2">
        {["w-20", "w-16", "w-24", "w-20", "w-16"].map((w, i) => (
          <Bar key={i} className={`h-9 ${w}`} />
        ))}
      </div>

      {/* summary cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card />
        <Card />
        <Card />
      </div>

      {/* the main table */}
      <div className="rounded-panel bg-surface-raised p-6">
        <div className="flex items-center justify-between">
          <Bar className="h-5 w-32" />
          <Bar className="h-9 w-40" />
        </div>
        <div className="mt-6 flex flex-col gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 shrink-0 rounded-full bg-surface-overlay" />
              <Bar className="h-4 flex-1" />
              <Bar className="hidden h-4 w-40 sm:block" />
              <Bar className="hidden h-4 w-24 md:block" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading your workspace…</span>
    </div>
  );
}

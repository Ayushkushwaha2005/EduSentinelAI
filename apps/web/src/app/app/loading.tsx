/*
 * The workspace loading state.
 *
 * WHY THIS IS THE MAIN PERFORMANCE LEVER.
 *
 * Every /app route is a server component that reads the database, so a click can
 * never be answered in zero milliseconds — the payload has to come back. What it
 * CAN be answered with instantly is the shape of the answer. Next.js paints this
 * the moment navigation starts, so the click feels acknowledged immediately and
 * the real content fills in underneath it.
 *
 * The shape below is deliberately the shape of the real dashboard — headline,
 * pill row, mint activity panel, three-column band, right rail — so switching
 * pages reads as content arriving rather than as the page being replaced. A
 * generic spinner here would be worse than nothing: it would announce a wait.
 *
 * The rail and top bar are NOT in this file, on purpose. They live in the layout
 * and App Router preserves a layout across navigations within it, so they never
 * unmount, never re-fetch and never flicker. Only this region changes.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-full bg-black/[0.055] ${className}`} />;
}

export default function Loading() {
  return (
    <div
      className="grid animate-pulse gap-4 xl:grid-cols-[minmax(0,1fr)_248px]"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="ws-card min-w-0 p-6 md:p-8">
        {/* headline + inline stats */}
        <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
          <Bar className="h-12 w-[420px] max-w-full" />
          <div className="flex gap-10">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3.5">
                <div className="h-[52px] w-[52px] rounded-full bg-black/[0.055]" />
                <div>
                  <Bar className="h-3 w-28" />
                  <Bar className="mt-2 h-7 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* pill row */}
        <div className="mt-7 flex gap-2.5">
          {["w-20", "w-24", "w-24", "w-28", "w-24"].map((w, i) => (
            <Bar key={i} className={`h-[42px] ${w}`} />
          ))}
        </div>

        {/* activity panel */}
        <div className="ws-panel ws-mint mt-5 p-6 md:p-7">
          <Bar className="h-8 w-24 bg-black/[0.06]" />
          <Bar className="mt-5 h-9 w-64 bg-black/[0.06]" />
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr]">
            <div className="flex flex-col gap-3">
              <div className="h-[104px] rounded-[16px] bg-white/60" />
              <div className="h-[104px] rounded-[16px] bg-white/60" />
            </div>
            <div className="flex h-[190px] items-end gap-2.5">
              {[3, 5, 2, 4, 5, 3, 4, 2, 3].map((cells, i) => (
                <div key={i} className="flex flex-1 flex-col-reverse gap-1.5">
                  {Array.from({ length: cells }).map((_, c) => (
                    <span key={c} className="aspect-square w-full rounded-[9px] bg-white/45" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* three-column band */}
        <div className="mt-7 grid gap-7 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Bar className="h-7 w-40" />
              <Bar className="mt-2 h-3 w-48" />
              <div className="mt-6 flex flex-col gap-2.5">
                <Bar className="h-[86px] rounded-[20px]" />
                <Bar className="h-[86px] rounded-[20px]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* right rail */}
      <aside className="hidden flex-col gap-3 xl:flex">
        <Bar className="h-[170px] rounded-[22px]" />
        <Bar className="h-[52px]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Bar key={i} className="h-[46px]" />
        ))}
        <Bar className="mt-2 h-[190px] rounded-[20px]" />
      </aside>

      <span className="sr-only">Loading…</span>
    </div>
  );
}

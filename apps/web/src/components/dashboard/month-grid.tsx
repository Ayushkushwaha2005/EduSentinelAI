import Link from "next/link";
import { dayKey, monthGrid, KIND_LABELS, type CalendarItem } from "@/lib/calendar-types";

/*
 * The month grid.
 *
 * Presentational only: it receives the already-scoped feed and renders it. All
 * the "who may see this" thinking happened in lib/calendar.ts, which is the
 * point — a component that filters is a component that can get filtering wrong.
 */

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* Source decides colour, so the calendar is readable at a glance: away is one
   colour wherever it appears, a release is always the same, and so on. */
const TONE: Record<CalendarItem["kind"], string> = {
  HOLIDAY: "bg-ws-mint text-ws-ink",
  LEAVE: "bg-ws-lilac text-ws-ink",
  RELEASE: "bg-ws-ink text-white",
  TASK: "border border-border-subtle bg-surface-raised text-text-primary",
  MEETING: "bg-ws-mint text-ws-ink",
  COMPANY: "bg-ws-ink text-white",
  DEADLINE: "bg-ws-lilac text-ws-ink",
  SESSION: "bg-ws-mint text-ws-ink",
  REMINDER: "border border-border-subtle bg-surface-raised text-text-primary",
  BOOKMARK: "border border-border-subtle bg-surface-raised text-text-primary",
};

export function MonthGrid({
  year,
  month,
  byDay,
}: {
  year: number;
  month: number;
  byDay: Map<string, CalendarItem[]>;
}) {
  const days = monthGrid(year, month);
  const todayKey = dayKey(new Date());

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 pb-2">
        {DOW.map((d) => (
          <div key={d} className="px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = dayKey(day);
          const items = byDay.get(key) ?? [];
          const inMonth = day.getMonth() === month;
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={`min-h-[104px] rounded-card border p-1.5 transition-colors ${
                isToday
                  ? "border-ws-ink"
                  : "border-border-subtle"
              } ${inMonth ? "bg-surface-raised" : "bg-transparent opacity-45"}`}
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={`text-[12px] tabular-nums ${
                    isToday ? "font-semibold text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {day.getDate()}
                </span>
                {items.length > 2 && (
                  <span className="text-[10px] text-text-muted">+{items.length - 2}</span>
                )}
              </div>

              <ul className="mt-1 flex flex-col gap-1">
                {items.slice(0, 2).map((item) => {
                  const chip = (
                    <span
                      className={`block truncate rounded-[7px] px-1.5 py-1 text-[11px] leading-tight ${TONE[item.kind]}`}
                      title={`${KIND_LABELS[item.kind]} — ${item.title}`}
                    >
                      {item.title}
                    </span>
                  );
                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link href={item.href} prefetch>
                          {chip}
                        </Link>
                      ) : (
                        chip
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

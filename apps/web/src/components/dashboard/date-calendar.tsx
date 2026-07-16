"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/motion";
import { CalendarIcon, ChevronLeft, ChevronRight } from "./icons";

/*
 * The topbar date, made openable (Phase 9 polish).
 *
 * The trigger shows the full current date; clicking it opens a small month
 * calendar for looking around — viewing and navigation only, no events, no
 * scheduling, no persistence. Prev/Next move the VIEW; "today" is always the
 * real current date, passed down from the server component as an ISO string so
 * server and client render the same label (no hydration drift).
 *
 * Popover behaviour mirrors notification-bell.tsx exactly: click-outside and
 * Escape close it, and the container reuses the same raised-surface classes —
 * which is also what makes it glass in dark mode for free.
 */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DateCalendar({ now }: { now: string }) {
  const today = new Date(now);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = `${today.toLocaleDateString("en-US", {
    weekday: "long",
  })}, ${today.getDate()} ${today.toLocaleDateString("en-US", {
    month: "long",
  })} ${today.getFullYear()}`;

  const heading = `${new Date(view.year, view.month, 1).toLocaleDateString("en-US", {
    month: "long",
  })} ${view.year}`;

  // Monday-first grid: how many leading blanks before day 1.
  const leading = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const isTodayVisible =
    view.year === today.getFullYear() && view.month === today.getMonth();

  const step = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          // Re-open on today's month so the calendar never greets you with
          // wherever you last wandered off to.
          if (!open) setView({ year: today.getFullYear(), month: today.getMonth() });
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={`Calendar, today is ${label}`}
        className="flex items-center gap-2 text-[15px] font-medium text-text-primary transition-colors duration-[--duration-fast] hover:text-brand-cyan"
      >
        {label}
        <CalendarIcon size={18} className="text-text-secondary" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2, ease: EASE }}
            className="absolute left-0 top-[calc(100%+12px)] z-30 w-[300px] rounded-card border border-border-subtle bg-surface-raised p-4 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold tracking-[-0.01em]">
                {heading}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous month"
                  className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary transition-colors duration-[--duration-fast] hover:bg-surface-overlay hover:text-text-primary"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next month"
                  className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary transition-colors duration-[--duration-fast] hover:bg-surface-overlay hover:text-text-primary"
                >
                  <ChevronRight size={16} />
                </button>
              </span>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAYS.map((d) => (
                <span
                  key={d}
                  className="pb-1 text-xs font-medium text-text-muted"
                >
                  {d}
                </span>
              ))}
              {Array.from({ length: leading }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const isToday = isTodayVisible && day === today.getDate();
                return (
                  <span
                    key={day}
                    aria-current={isToday ? "date" : undefined}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                      isToday
                        ? "bg-brand-cyan font-semibold text-surface-raised"
                        : "text-text-secondary transition-colors duration-[--duration-fast] hover:bg-surface-overlay hover:text-text-primary"
                    }`}
                  >
                    {day}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

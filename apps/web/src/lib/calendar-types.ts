/*
 * Calendar vocabulary — pure constants and types, no database import.
 *
 * Client components need these (a form has to render the kind picker), and
 * anything importing lib/calendar.ts would drag `db` into the browser bundle.
 * Same split as lib/org-types.ts vs lib/org.ts.
 */

/** What a deliberately-created event IS. */
export const EVENT_KINDS = [
  "MEETING",
  "COMPANY", // company-wide: all-hands, socials, offsites
  "DEADLINE",
  "SESSION", // learning / onboarding sessions
  "REMINDER", // personal
  "BOOKMARK", // "keep this day in mind"
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/**
 * Who can see it. This single field IS the access model for created events —
 * see lib/calendar.ts for the read scoping it drives.
 */
export const VISIBILITIES = ["PERSONAL", "TEAM", "COMPANY"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const ATTENDEE_RESPONSES = ["INVITED", "ACCEPTED", "DECLINED"] as const;
export type AttendeeResponse = (typeof ATTENDEE_RESPONSES)[number];

/**
 * Sources the feed unions. The projected ones are NOT stored as calendar rows:
 * they are read from the tables that already own them, so they can never go
 * stale or disagree with the pipeline they came from.
 */
export type EventSource =
  | "EVENT" // a real CalendarEvent row
  | "HOLIDAY" // projected from Holiday
  | "LEAVE" // projected from LeaveRequest (approved only)
  | "RELEASE" // projected from Release
  | "TASK"; // projected from Task.dueAt

/** The one shape every calendar surface renders, whatever the source. */
export type CalendarItem = {
  id: string;
  source: EventSource;
  kind: EventKind | "HOLIDAY" | "LEAVE" | "RELEASE" | "TASK";
  title: string;
  detail: string | null;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  location: string | null;
  visibility: Visibility;
  ownerName: string | null;
  /** Only ever true for rows the viewer may actually edit. */
  canEdit: boolean;
  /** Where clicking it should go. */
  href: string | null;
};

export const KIND_LABELS: Record<CalendarItem["kind"], string> = {
  MEETING: "Meeting",
  COMPANY: "Company",
  DEADLINE: "Deadline",
  SESSION: "Session",
  REMINDER: "Reminder",
  BOOKMARK: "Bookmark",
  HOLIDAY: "Holiday",
  LEAVE: "Away",
  RELEASE: "Release",
  TASK: "Task due",
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PERSONAL: "Only me and invitees",
  TEAM: "My team",
  COMPANY: "Everyone at the company",
};

export function isEventKind(v: unknown): v is EventKind {
  return typeof v === "string" && (EVENT_KINDS as readonly string[]).includes(v);
}

export function isVisibility(v: unknown): v is Visibility {
  return typeof v === "string" && (VISIBILITIES as readonly string[]).includes(v);
}

/** Local YYYY-MM-DD. Used as the grid's bucket key. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The Monday-first 6x7 grid a month view needs, including spill days. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; shift so Monday is column 0.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

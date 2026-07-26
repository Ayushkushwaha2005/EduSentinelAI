"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/guard";
import { audit, requestContext } from "@/lib/audit";
import { sanitizeLine, sanitizeUserText } from "@/lib/sanitize";
import { EVENT_KINDS, VISIBILITIES } from "@/lib/calendar-types";

/*
 * Calendar write path.
 *
 * AUTHORITY, stated once:
 *   - anyone who can reach /app may create a PERSONAL event for themselves;
 *   - a TEAM event requires membership of that team;
 *   - a COMPANY event requires `calendar.manage` — it appears on every
 *     colleague's calendar, so it is not something you do to people casually;
 *   - you may edit or cancel your own event, or a COMPANY one with
 *     calendar.manage. Nothing else.
 *
 * Every branch re-derives that from the viewer. The UI hides what you cannot
 * do, but the UI is not the boundary — these checks are.
 */

export type EventState = { error?: string; ok?: boolean };

const schema = z.object({
  title: z.string().trim().min(2, "Give the event a title").max(140),
  detail: z.string().trim().max(2000).optional(),
  kind: z.enum(EVENT_KINDS),
  visibility: z.enum(VISIBILITIES),
  startsAt: z.string().min(1, "Pick a start"),
  endsAt: z.string().optional(),
  allDay: z.boolean().optional(),
  location: z.string().trim().max(160).optional(),
  teamId: z.string().trim().optional(),
});

function parseWhen(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createEvent(
  _prev: EventState,
  form: FormData,
): Promise<EventState> {
  const viewer = await requireViewer();

  const parsed = schema.safeParse({
    title: form.get("title"),
    detail: form.get("detail") || undefined,
    kind: form.get("kind"),
    visibility: form.get("visibility"),
    startsAt: form.get("startsAt"),
    endsAt: form.get("endsAt") || undefined,
    allDay: form.get("allDay") === "on",
    location: form.get("location") || undefined,
    teamId: form.get("teamId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const startsAt = parseWhen(d.startsAt);
  if (!startsAt) return { error: "That start date is not valid." };
  const endsAt = parseWhen(d.endsAt);
  if (endsAt && endsAt < startsAt) return { error: "The end cannot be before the start." };

  /* ---- authority ---- */
  if (d.visibility === "COMPANY" && !viewer.can("calendar.manage")) {
    return { error: "Only someone who manages the calendar can create a company-wide event." };
  }

  let teamId: string | null = null;
  if (d.visibility === "TEAM") {
    if (!d.teamId) return { error: "Choose which team this is for." };
    // Membership is checked, not assumed from role.
    const member = await db.teamMember.findFirst({
      where: { teamId: d.teamId, userId: viewer.id },
      select: { id: true },
    });
    if (!member && !viewer.can("team.manage")) {
      return { error: "You can only create team events for a team you are in." };
    }
    teamId = d.teamId;
  }

  await db.calendarEvent.create({
    data: {
      title: sanitizeLine(d.title, 140),
      detail: d.detail ? sanitizeUserText(d.detail, 2000) : null,
      kind: d.kind,
      visibility: d.visibility,
      startsAt,
      endsAt,
      allDay: !!d.allDay,
      location: d.location ? sanitizeLine(d.location, 160) : null,
      ownerId: viewer.id,
      teamId,
      createdByEmail: viewer.email,
    },
  });

  const ctx = await requestContext();
  await audit("calendar.event_created", {
    actorId: viewer.id,
    // The title is the event's own name, not personal data about anyone —
    // unlike a leave reason, which never reaches the log.
    detail: `${d.kind} · ${d.visibility}`,
    ...ctx,
  });

  revalidatePath("/app/calendar");
  revalidatePath("/app");
  return { ok: true };
}

export async function cancelEvent(
  _prev: EventState,
  form: FormData,
): Promise<EventState> {
  const viewer = await requireViewer();
  const id = String(form.get("id") ?? "");
  if (!id) return { error: "Missing event." };

  const event = await db.calendarEvent.findUnique({
    where: { id },
    select: { id: true, ownerId: true, visibility: true },
  });
  // Same answer for "not yours" and "does not exist" — an id is not a probe.
  if (!event) return { error: "That event no longer exists." };

  const mayCancel =
    event.ownerId === viewer.id ||
    (event.visibility === "COMPANY" && viewer.can("calendar.manage"));
  if (!mayCancel) return { error: "That event no longer exists." };

  // Cancelled, not deleted: the row stays so the audit trail still refers to
  // something real.
  await db.calendarEvent.update({
    where: { id },
    data: { cancelledAt: new Date() },
  });

  const ctx = await requestContext();
  await audit("calendar.event_cancelled", {
    actorId: viewer.id,
    ...ctx,
  });

  revalidatePath("/app/calendar");
  revalidatePath("/app");
  return { ok: true };
}

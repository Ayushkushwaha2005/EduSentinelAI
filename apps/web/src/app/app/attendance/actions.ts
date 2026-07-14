"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { assertCapability, requireViewer } from "@/lib/guard";
import { cleanNote, dayOf, isAttendanceStatus, todayFor } from "@/lib/hr";
import { holdersOf, notify, notifyMany } from "@/lib/notifications";

/*
 * Attendance (Phase 8.1).
 *
 * Clocking in is a statement about YOURSELF, so it needs no capability — only a
 * session. What needs a capability is touching someone ELSE'S record, and the only
 * way to do that is to approve a correction they asked for.
 *
 * CORRECTIONS ARE REQUESTED AND APPROVED, NEVER APPLIED SILENTLY. An attendance
 * record anyone can quietly rewrite is worthless as a record: it becomes a claim
 * about the past with no author. So we keep the old value, the proposed value, who
 * asked and who decided — and the change lands only when someone with
 * `attendance.manage` says so.
 */

export type HrState = { error?: string; notice?: string };

export async function clockIn(): Promise<void> {
  const viewer = await requireViewer();
  const today = dayOf(new Date());
  const existing = await todayFor(viewer.id);

  // Idempotent: a second click does not overwrite the time you actually arrived.
  if (existing?.clockIn) return;

  await db.attendance.upsert({
    where: { userId_date: { userId: viewer.id, date: today } },
    update: { clockIn: new Date(), status: existing?.status ?? "WORKING" },
    create: { userId: viewer.id, date: today, clockIn: new Date(), status: "WORKING" },
  });

  const ctx = await requestContext();
  await audit("attendance.clock_in", { actorId: viewer.id, ...ctx });
  revalidatePath("/app/attendance");
  revalidatePath("/app");
}

export async function clockOut(): Promise<void> {
  const viewer = await requireViewer();
  const existing = await todayFor(viewer.id);
  if (!existing?.clockIn || existing.clockOut) return;

  await db.attendance.update({
    where: { id: existing.id },
    data: { clockOut: new Date() },
  });

  const ctx = await requestContext();
  await audit("attendance.clock_out", { actorId: viewer.id, ...ctx });
  revalidatePath("/app/attendance");
  revalidatePath("/app");
}

/** Set today's day-state for yourself (remote, sick, absent). */
export async function setTodayStatus(
  _prev: HrState,
  formData: FormData,
): Promise<HrState> {
  const viewer = await requireViewer();
  const status = formData.get("status");
  if (!isAttendanceStatus(status)) return { error: "Unknown status." };
  // LEAVE and HOLIDAY are set by the leave and calendar systems, not by hand —
  // marking yourself on leave without a request would put the balance and the
  // record permanently out of step.
  if (status === "LEAVE" || status === "HOLIDAY") {
    return { error: "Book leave through Leave — it keeps your balance correct." };
  }

  const today = dayOf(new Date());
  const note = cleanNote(formData.get("note"));

  await db.attendance.upsert({
    where: { userId_date: { userId: viewer.id, date: today } },
    update: { status, note },
    create: { userId: viewer.id, date: today, status, note },
  });

  const ctx = await requestContext();
  await audit("attendance.status_set", { actorId: viewer.id, detail: status, ...ctx });
  revalidatePath("/app/attendance");
  return { notice: "Today updated." };
}

/**
 * Ask for a past day to be corrected. Anyone may ask about their OWN record; the
 * change does not land until an `attendance.manage` holder approves it.
 */
export async function requestCorrection(
  _prev: HrState,
  formData: FormData,
): Promise<HrState> {
  const viewer = await requireViewer();

  const attendanceId = String(formData.get("attendanceId") ?? "");
  const toStatus = formData.get("toStatus");
  const reason = cleanNote(formData.get("reason"));

  if (!isAttendanceStatus(toStatus)) return { error: "Unknown status." };
  if (!reason) return { error: "Say why the record is wrong." };

  const record = await db.attendance.findUnique({ where: { id: attendanceId } });
  // Your own record only. Asking about someone else's is not a correction, it is
  // an edit — and edits of other people's records do not exist in this system.
  if (!record || record.userId !== viewer.id) {
    return { error: "That record is not yours." };
  }
  if (record.status === toStatus) return { error: "That is already the status." };

  const already = await db.attendanceCorrection.findFirst({
    where: { attendanceId, status: "PENDING" },
  });
  if (already) return { error: "A correction for that day is already awaiting review." };

  await db.attendanceCorrection.create({
    data: {
      attendanceId,
      requestedById: viewer.id,
      fromStatus: record.status,
      toStatus,
      reason,
    },
  });

  const ctx = await requestContext();
  await audit("attendance.correction_requested", {
    actorId: viewer.id,
    detail: `${record.date.toISOString().slice(0, 10)}: ${record.status} -> ${toStatus}`,
    ...ctx,
  });
  // The reason for a correction can say anything ("I was at the hospital"), so it
  // does not travel either. A name and a date is enough to get someone to look.
  await notifyMany(await holdersOf("attendance.manage"), {
    kind: "attendance.correction_pending",
    title: "Attendance correction awaiting review",
    body: `${viewer.name} · ${record.date.toISOString().slice(0, 10)}`,
    href: "/app/attendance",
  });

  revalidatePath("/app/attendance");
  return { notice: "Correction requested — it will be reviewed." };
}

/** Approve or reject a correction. `attendance.manage`, and audited either way. */
export async function decideCorrection(
  _prev: HrState,
  formData: FormData,
): Promise<HrState> {
  const actor = await assertCapability("attendance.manage");

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = cleanNote(formData.get("note"));
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return { error: "Invalid decision." };
  }

  const correction = await db.attendanceCorrection.findUnique({
    where: { id },
    include: { attendance: { select: { id: true, userId: true, date: true } } },
  });
  if (!correction || correction.status !== "PENDING") {
    return { error: "That correction is no longer pending." };
  }
  // Nobody approves their own correction. An approval you can grant yourself is
  // not an approval, it is a delay.
  if (correction.attendance.userId === actor.id) {
    return { error: "You cannot approve your own correction." };
  }

  await db.$transaction(async (tx) => {
    await tx.attendanceCorrection.update({
      where: { id },
      data: {
        status: decision,
        decidedById: actor.id,
        decidedAt: new Date(),
        decisionNote: note,
      },
    });
    if (decision === "APPROVED") {
      await tx.attendance.update({
        where: { id: correction.attendance.id },
        data: { status: correction.toStatus },
      });
    }
  });

  const ctx = await requestContext();
  await audit("attendance.correction_decided", {
    actorId: actor.id,
    detail: `${correction.attendance.date.toISOString().slice(0, 10)} ${correction.fromStatus}->${correction.toStatus}: ${decision}`,
    ...ctx,
  });
  await notify({
    userId: correction.attendance.userId,
    kind: "attendance.correction_decided",
    title: `Your attendance correction was ${decision.toLowerCase()}`,
    href: "/app/attendance",
  });

  revalidatePath("/app/attendance");
  return { notice: `Correction ${decision.toLowerCase()}.` };
}

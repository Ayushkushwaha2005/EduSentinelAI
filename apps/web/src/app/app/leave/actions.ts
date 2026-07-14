"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { assertCapability, requireViewer } from "@/lib/guard";
import {
  cleanNote,
  currentYear,
  dayOf,
  ensureBalance,
  workingDaysBetween,
} from "@/lib/hr";

/*
 * Leave (Phase 8.2).
 *
 * The balance is the part that has to be right, so it is arithmetic done on the
 * SERVER, in a transaction, against numbers the server computed:
 *
 *   - Days are WORKING days: weekends and public holidays inside the range are not
 *     charged. Booking a week that contains a bank holiday must not cost someone a
 *     day of their entitlement for a day the company was shut.
 *   - A PENDING request holds its days against the balance. Otherwise five
 *     overlapping requests would each look affordable, and approving them all
 *     would silently overdraw.
 *   - A balance CANNOT go negative. The server refuses; the form is a convenience.
 *   - Cancelling or rejecting returns the days. Approving moves them from pending
 *     to used. Every transition is one transaction — a balance that is half-updated
 *     because a request failed halfway is worse than no balance at all.
 */

export type LeaveState = { error?: string; notice?: string };

export async function requestLeave(
  _prev: LeaveState,
  formData: FormData,
): Promise<LeaveState> {
  const viewer = await requireViewer();

  const leaveTypeId = String(formData.get("leaveTypeId") ?? "");
  const startRaw = String(formData.get("startDate") ?? "");
  const endRaw = String(formData.get("endDate") ?? "");
  const reason = cleanNote(formData.get("reason"), 300);

  if (!leaveTypeId || !startRaw || !endRaw) return { error: "Fill in the dates." };

  const start = dayOf(startRaw);
  const end = dayOf(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Those dates are not valid." };
  }
  if (end < start) return { error: "The end date is before the start date." };

  const type = await db.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!type || !type.active) return { error: "That leave type is not available." };

  // Charged days, computed server-side from the same function the form previews —
  // so what someone is shown is what they are billed.
  const days = (await workingDaysBetween(start, end)).length;
  if (days === 0) {
    return {
      error: "That range is all weekends and holidays — there is nothing to book.",
    };
  }

  // Overlap: you cannot be on leave twice on the same day.
  const clash = await db.leaveRequest.findFirst({
    where: {
      userId: viewer.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (clash) return { error: "You already have leave booked over those dates." };

  const year = start.getUTCFullYear();
  const balance = await ensureBalance(viewer.id, leaveTypeId, year);
  if (!balance) return { error: "That leave type is not available." };

  const remaining = balance.entitled - balance.used - balance.pending;
  if (days > remaining) {
    return {
      error: `That is ${days} day${days === 1 ? "" : "s"}, and you have ${remaining} left.`,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.leaveRequest.create({
      data: {
        userId: viewer.id,
        leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        reason,
      },
    });
    // Held, not spent: a pending request must not be bookable twice.
    await tx.leaveBalance.update({
      where: { id: balance.id },
      data: { pending: { increment: days } },
    });
  });

  const ctx = await requestContext();
  // The REASON IS NOT AUDITED. The audit log is read by anyone with `audit.read`,
  // which is a wider circle than the approver chain — writing "hospital
  // appointment" into it would leak the one field this phase works hardest to
  // protect. What happened is recorded; why is not.
  await audit("leave.requested", {
    actorId: viewer.id,
    detail: `${type.code} ${startRaw}..${endRaw} (${days}d)`,
    ...ctx,
  });

  revalidatePath("/app/leave");
  revalidatePath("/app/calendar");
  return { notice: `Requested ${days} day${days === 1 ? "" : "s"} of ${type.name}.` };
}

/** Approve or reject. `leave.approve` — explicit, and never your own request. */
export async function decideLeave(
  _prev: LeaveState,
  formData: FormData,
): Promise<LeaveState> {
  const actor = await assertCapability("leave.approve");

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = cleanNote(formData.get("note"));
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return { error: "Invalid decision." };
  }

  const request = await db.leaveRequest.findUnique({
    where: { id },
    include: { leaveType: { select: { code: true } } },
  });
  if (!request || request.status !== "PENDING") {
    return { error: "That request is no longer pending." };
  }
  // Approving your own leave is not an approval.
  if (request.userId === actor.id) {
    return { error: "You cannot decide your own leave request." };
  }

  const year = request.startDate.getUTCFullYear();
  const balance = await ensureBalance(request.userId, request.leaveTypeId, year);

  await db.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id },
      data: {
        status: decision,
        decidedById: actor.id,
        decidedAt: new Date(),
        decisionNote: note,
      },
    });

    if (!balance) return;
    if (decision === "APPROVED") {
      // Held → spent.
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pending: { decrement: request.days },
          used: { increment: request.days },
        },
      });
      // The attendance record for those days follows the decision, so the two
      // systems cannot disagree about whether someone was at work.
      const days = await workingDaysBetween(request.startDate, request.endDate);
      for (const date of days) {
        await tx.attendance.upsert({
          where: { userId_date: { userId: request.userId, date } },
          update: { status: "LEAVE" },
          create: { userId: request.userId, date, status: "LEAVE" },
        });
      }
    } else {
      // Rejected: the held days come straight back.
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { pending: { decrement: request.days } },
      });
    }
  });

  const ctx = await requestContext();
  await audit("leave.decided", {
    actorId: actor.id,
    detail: `${request.leaveType.code} ${request.days}d -> ${decision}`,
    ...ctx,
  });

  revalidatePath("/app/leave");
  revalidatePath("/app/calendar");
  revalidatePath("/app/attendance");
  return { notice: `Request ${decision.toLowerCase()}.` };
}

/** Cancel your own request — pending or already approved. The days come back. */
export async function cancelLeave(
  _prev: LeaveState,
  formData: FormData,
): Promise<LeaveState> {
  const viewer = await requireViewer();
  const id = String(formData.get("id") ?? "");

  const request = await db.leaveRequest.findUnique({ where: { id } });
  if (!request || request.userId !== viewer.id) {
    return { error: "That request is not yours." };
  }
  if (request.status !== "PENDING" && request.status !== "APPROVED") {
    return { error: "That request cannot be cancelled." };
  }

  const year = request.startDate.getUTCFullYear();
  const balance = await db.leaveBalance.findUnique({
    where: {
      userId_leaveTypeId_year: {
        userId: request.userId,
        leaveTypeId: request.leaveTypeId,
        year,
      },
    },
  });

  await db.$transaction(async (tx) => {
    await tx.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });

    if (balance) {
      // Return the days to wherever they were being held — pending if it was never
      // decided, used if it had been approved. Clamped at zero: a bug in this file
      // must not be able to mint entitlement out of nothing.
      if (request.status === "PENDING") {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { pending: Math.max(0, balance.pending - request.days) },
        });
      } else {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { used: Math.max(0, balance.used - request.days) },
        });
      }
    }

    if (request.status === "APPROVED") {
      // The attendance days go back to being ordinary working days.
      const days = await workingDaysBetween(request.startDate, request.endDate);
      for (const date of days) {
        await tx.attendance.updateMany({
          where: { userId: request.userId, date, status: "LEAVE" },
          data: { status: "WORKING" },
        });
      }
    }
  });

  const ctx = await requestContext();
  await audit("leave.cancelled", {
    actorId: viewer.id,
    detail: `${request.days}d`,
    ...ctx,
  });

  revalidatePath("/app/leave");
  revalidatePath("/app/calendar");
  revalidatePath("/app/attendance");
  return { notice: "Leave cancelled — the days are back in your balance." };
}

/* ---------- calendar & leave types: `calendar.manage` ---------- */

export async function saveHoliday(
  _prev: LeaveState,
  formData: FormData,
): Promise<LeaveState> {
  const actor = await assertCapability("calendar.manage");

  const name = cleanNote(formData.get("name"), 80);
  const dateRaw = String(formData.get("date") ?? "");
  if (!name || !dateRaw) return { error: "A holiday needs a name and a date." };

  const date = dayOf(dateRaw);
  if (Number.isNaN(date.getTime())) return { error: "That date is not valid." };

  const clash = await db.holiday.findFirst({ where: { date, region: null } });
  if (clash) return { error: "There is already a holiday on that date." };

  await db.holiday.create({ data: { name, date } });

  const ctx = await requestContext();
  await audit("calendar.holiday_added", {
    actorId: actor.id,
    detail: `${name} ${dateRaw}`,
    ...ctx,
  });
  revalidatePath("/app/calendar");
  revalidatePath("/app/leave");
  return { notice: "Holiday added — it will not be charged to anyone's leave." };
}

export async function removeHoliday(formData: FormData): Promise<void> {
  const actor = await assertCapability("calendar.manage");
  const id = String(formData.get("id") ?? "");
  const holiday = await db.holiday.findUnique({ where: { id } });
  if (!holiday) return;

  await db.holiday.delete({ where: { id } });

  const ctx = await requestContext();
  await audit("calendar.holiday_removed", {
    actorId: actor.id,
    detail: holiday.name,
    ...ctx,
  });
  revalidatePath("/app/calendar");
  revalidatePath("/app/leave");
}

export async function saveLeaveType(
  _prev: LeaveState,
  formData: FormData,
): Promise<LeaveState> {
  const actor = await assertCapability("calendar.manage");

  const id = String(formData.get("id") ?? "");
  const name = cleanNote(formData.get("name"), 60);
  const code = cleanNote(formData.get("code"), 20)?.toUpperCase().replace(/[^A-Z_]/g, "");
  const defaultDays = Number(formData.get("defaultDays") ?? 0);
  const paid = formData.get("paid") === "on";

  if (!name || !code) return { error: "A leave type needs a name and a code." };
  if (!Number.isFinite(defaultDays) || defaultDays < 0 || defaultDays > 365) {
    return { error: "Entitlement must be between 0 and 365 days." };
  }

  const clash = await db.leaveType.findFirst({
    where: { OR: [{ name }, { code }], ...(id ? { NOT: { id } } : {}) },
  });
  if (clash) return { error: "A leave type with that name or code already exists." };

  const data = { name, code, defaultDays: Math.trunc(defaultDays), paid };
  if (id) await db.leaveType.update({ where: { id }, data });
  else await db.leaveType.create({ data });

  const ctx = await requestContext();
  await audit(id ? "calendar.leave_type_updated" : "calendar.leave_type_added", {
    actorId: actor.id,
    detail: `${code} (${defaultDays}d)`,
    ...ctx,
  });
  revalidatePath("/app/calendar");
  revalidatePath("/app/leave");
  return { notice: id ? "Leave type updated." : "Leave type added." };
}

/**
 * Set one person's entitlement for the year. Someone joining in July does not get
 * a full year's allowance, and someone's allowance grows with tenure — neither is
 * expressible by a default alone.
 */
export async function setEntitlement(
  _prev: LeaveState,
  formData: FormData,
): Promise<LeaveState> {
  const actor = await assertCapability("calendar.manage");

  const userId = String(formData.get("userId") ?? "");
  const leaveTypeId = String(formData.get("leaveTypeId") ?? "");
  const entitled = Number(formData.get("entitled") ?? 0);
  const year = currentYear();

  if (!Number.isFinite(entitled) || entitled < 0 || entitled > 365) {
    return { error: "Entitlement must be between 0 and 365 days." };
  }

  const balance = await ensureBalance(userId, leaveTypeId, year);
  if (!balance) return { error: "Unknown person or leave type." };

  // You cannot set an entitlement below what has already been taken and booked —
  // that would create a negative balance by fiat, which the rest of the system
  // is carefully built to make impossible.
  const floor = balance.used + balance.pending;
  if (entitled < floor) {
    return {
      error: `They have already used or booked ${floor} day(s) — the entitlement cannot be lower.`,
    };
  }

  await db.leaveBalance.update({
    where: { id: balance.id },
    data: { entitled },
  });

  const ctx = await requestContext();
  await audit("hr.entitlement_set", {
    actorId: actor.id,
    detail: `${userId}: ${entitled}d`,
    ...ctx,
  });
  revalidatePath("/app/calendar");
  revalidatePath("/app/leave");
  return { notice: "Entitlement updated." };
}

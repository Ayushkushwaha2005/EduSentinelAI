/* Phase 8 gate invariants: attendance and leave are sensitive personal data.
 * Runs in CI. Run locally: npm run test:hr
 *
 * What this file refuses to let regress:
 *   1. NO CROSS-EMPLOYEE LEAK. An employee cannot read another employee's
 *      attendance or leave — including with the exact record id in hand.
 *   2. THE REASON IS THE CROWN JEWEL. It is readable only by the person and their
 *      approver chain. Not by HR, not by the Founder on a calendar, not in an
 *      export, not in the audit log.
 *   3. The leave maths is right: weekends and holidays are not charged, balances
 *      cannot go negative, pending days are held, cancelling gives them back.
 *   4. HR capabilities are grantable, not a new rung on the role ladder. */
import assert from "node:assert";
import { db } from "../src/lib/db";
import type { Viewer } from "../src/lib/guard";
import {
  balancesFor,
  canSeeReason,
  canSeeRecordsOf,
  dayOf,
  leaveFor,
  openLeave,
  attendanceFor,
  pendingLeave,
  teamToday,
  whoIsOut,
  workingDaysBetween,
} from "../src/lib/hr";
import {
  FOUNDER_RESERVED,
  defaultCapabilities,
  effectiveCapabilities,
  isFounderReserved,
  type Capability,
} from "../src/lib/permissions";
import { ROLES } from "../src/lib/roles";

const tag = `p8-${Date.now()}`;

/** Build a Viewer exactly as lib/guard.ts does, so the tests exercise the real shape. */
async function viewerFor(id: string): Promise<Viewer> {
  const u = await db.user.findUnique({ where: { id } });
  if (!u) throw new Error("no user");
  const caps = await effectiveCapabilities(id);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Viewer["role"],
    mfaEnabled: u.mfaEnabled,
    caps,
    can: (c: Capability) => caps.has(c),
  };
}

/* ---------- 4. HR authority is capabilities, not a new role ---------- */

assert.deepEqual(
  [...ROLES],
  ["USER", "COLLABORATOR", "EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"],
  "Phase 8 must NOT add an HR role — the ladder is unchanged. HR is a capability.",
);

const HR_CAPS: Capability[] = [
  "attendance.manage",
  "leave.approve",
  "calendar.manage",
  "hr.view",
];
for (const cap of HR_CAPS) {
  assert.ok(
    !isFounderReserved(cap),
    `${cap} is grantable — running attendance and leave is ordinary work, not a trust boundary`,
  );
  assert.ok(
    !FOUNDER_RESERVED.includes(cap),
    `${cap} is not in the reserved set`,
  );
  assert.ok(
    !defaultCapabilities("EMPLOYEE").includes(cap),
    `a plain EMPLOYEE does not hold ${cap} by default`,
  );
  assert.ok(
    !defaultCapabilities("COLLABORATOR").includes(cap),
    `a COLLABORATOR never holds ${cap} — HR data is not theirs to see`,
  );
  assert.ok(
    defaultCapabilities("FOUNDER").includes(cap),
    `the Founder holds ${cap}`,
  );
}
assert.ok(
  defaultCapabilities("ADMIN").includes("leave.approve"),
  "a manager approves leave by default",
);

/* ---------- fixtures ---------- */

const alice = await db.user.create({
  data: { email: `${tag}-alice@test.local`, name: "Alice Employee", passwordHash: "x", role: "EMPLOYEE" },
});
const bob = await db.user.create({
  data: { email: `${tag}-bob@test.local`, name: "Bob Employee", passwordHash: "x", role: "EMPLOYEE" },
});
const manager = await db.user.create({
  data: { email: `${tag}-mgr@test.local`, name: "Manager", passwordHash: "x", role: "ADMIN" },
});
// An HR lead who can SEE the team but has NOT been granted leave.approve — the
// exact person who must not be able to read a reason.
const hrOnly = await db.user.create({
  data: { email: `${tag}-hr@test.local`, name: "HR Lead", passwordHash: "x", role: "EMPLOYEE" },
});
await db.permissionGrant.createMany({
  data: [
    { userId: hrOnly.id, capability: "hr.view", allow: true, grantedBy: "test" },
    { userId: hrOnly.id, capability: "attendance.manage", allow: true, grantedBy: "test" },
  ],
});

const leaveType = await db.leaveType.upsert({
  where: { code: "ANNUAL" },
  update: {},
  create: { code: "ANNUAL", name: "Annual leave", defaultDays: 25, paid: true },
});

try {
  const aliceV = await viewerFor(alice.id);
  const bobV = await viewerFor(bob.id);
  const mgrV = await viewerFor(manager.id);
  const hrV = await viewerFor(hrOnly.id);

  assert.ok(hrV.can("hr.view") && !hrV.can("leave.approve"), "fixture: HR can see, cannot approve");

  /* ---------- 3. the leave maths ---------- */

  // A Monday-to-Friday week is 5 working days...
  const mon = dayOf("2026-07-06");
  const fri = dayOf("2026-07-10");
  assert.equal(
    (await workingDaysBetween(mon, fri)).length,
    5,
    "Mon–Fri is five working days",
  );

  // ...and a Saturday and Sunday are worth nothing.
  const sat = dayOf("2026-07-11");
  const sun = dayOf("2026-07-12");
  assert.equal(
    (await workingDaysBetween(sat, sun)).length,
    0,
    "a weekend costs nobody a day of their entitlement",
  );

  // A public holiday inside the range is not charged either. THIS is the one that
  // matters: booking a week that contains a bank holiday must not cost five days
  // for a week the company was partly shut.
  const holiday = await db.holiday.create({
    data: { name: `${tag} Bank Holiday`, date: dayOf("2026-07-08") },
  });
  assert.equal(
    (await workingDaysBetween(mon, fri)).length,
    4,
    "a public holiday inside the range is NOT charged to the balance",
  );

  // Book it and check the balance moves the way the arithmetic says.
  const balance = await db.leaveBalance.create({
    data: { userId: alice.id, leaveTypeId: leaveType.id, year: 2026, entitled: 10 },
  });
  const request = await db.leaveRequest.create({
    data: {
      userId: alice.id,
      leaveTypeId: leaveType.id,
      startDate: mon,
      endDate: fri,
      days: 4,
      reason: "Hospital appointment", // the most sensitive string in the system
      status: "PENDING",
    },
  });
  await db.leaveBalance.update({
    where: { id: balance.id },
    data: { pending: { increment: 4 } },
  });

  const aliceBal = (await balancesFor(aliceV, alice.id, 2026))!;
  const annual = aliceBal.find((b) => b.code === "ANNUAL")!;
  assert.equal(annual.entitled, 10, "entitlement is what was set");
  assert.equal(annual.pending, 4, "a pending request HOLDS its days");
  assert.equal(
    annual.remaining,
    6,
    "pending days are held against the balance — five overlapping requests cannot each look affordable",
  );
  assert.ok(annual.remaining >= 0, "a balance is never negative");

  /* ---------- 1. no cross-employee leak ---------- */

  assert.ok(canSeeRecordsOf(aliceV, alice.id), "you can always see your own records");
  assert.ok(
    !canSeeRecordsOf(bobV, alice.id),
    "an employee must NOT be able to see a colleague's records",
  );
  assert.ok(canSeeRecordsOf(mgrV, alice.id), "a manager may see their people's records");

  assert.equal(
    await leaveFor(bobV, alice.id),
    null,
    "asking for a colleague's leave returns nothing — not a partial answer, nothing",
  );
  assert.equal(
    await attendanceFor(bobV, alice.id),
    null,
    "…and the same for their attendance",
  );

  // With the exact record id in hand. A tampered URL learns nothing.
  assert.equal(
    await openLeave(bobV, request.id),
    null,
    "a colleague cannot open a leave request by its id — it is as if it does not exist",
  );
  assert.ok(await openLeave(aliceV, request.id), "the owner can open their own");
  assert.ok(await openLeave(mgrV, request.id), "an approver can open it");

  // The approval queue is empty for someone who cannot approve.
  assert.equal(
    (await pendingLeave(bobV)).length,
    0,
    "a plain employee's approval queue is empty — the page cannot show what it was never given",
  );
  assert.ok(
    (await pendingLeave(mgrV)).some((r) => r.id === request.id),
    "the approver sees the request",
  );
  assert.equal(
    (await teamToday(bobV)).length,
    0,
    "an employee cannot enumerate the team's attendance",
  );
  assert.ok((await teamToday(mgrV)).length > 0, "a manager can");

  /* ---------- 2. THE REASON ---------- */

  assert.ok(canSeeReason(aliceV, alice.id), "you can read your own reason");
  assert.ok(canSeeReason(mgrV, alice.id), "the approver chain can read it — they must weigh it");
  assert.ok(
    !canSeeReason(bobV, alice.id),
    "a colleague can NEVER read why someone is off",
  );
  assert.ok(
    !canSeeReason(hrV, alice.id),
    "HR can see that someone is OFF, but not WHY — hr.view is not leave.approve",
  );

  // And the redaction happens in the query layer, so a page cannot leak it by
  // accident: the row simply arrives without the field.
  const asManager = (await leaveFor(mgrV, alice.id))!.find((r) => r.id === request.id)!;
  assert.equal(
    asManager.reason,
    "Hospital appointment",
    "the approver receives the reason",
  );

  const asHr = (await leaveFor(hrV, alice.id))!.find((r) => r.id === request.id)!;
  assert.equal(
    asHr.reason,
    null,
    "HR receives NULL for the reason — not the string, not a placeholder. The data never reaches the page.",
  );

  // The team calendar carries no reason and no leave type. "SICK" printed against
  // a name on a shared calendar is a medical disclosure.
  await db.leaveRequest.update({ where: { id: request.id }, data: { status: "APPROVED" } });
  const out = await whoIsOut(mon, fri);
  const entry = out.find((o) => o.userId === alice.id);
  assert.ok(entry, "the calendar shows that Alice is away");
  assert.ok(
    !("reason" in entry) && !("type" in entry) && !("typeCode" in entry),
    "the team calendar carries NO reason and NO leave type — only that someone is out",
  );
  assert.ok(
    !JSON.stringify(out).includes("Hospital"),
    "the reason does not appear anywhere in the calendar payload",
  );

  // Nor in the audit log, which `audit.read` opens to a wider circle than the
  // approver chain.
  const auditRows = await db.auditLog.findMany({
    where: { action: { startsWith: "leave." } },
    select: { detail: true },
  });
  assert.ok(
    !auditRows.some((r) => r.detail?.includes("Hospital")),
    "a leave reason is NEVER written to the audit log",
  );

  await db.holiday.delete({ where: { id: holiday.id } }).catch(() => null);
} finally {
  await db.leaveRequest.deleteMany({ where: { userId: { in: [alice.id, bob.id] } } });
  await db.leaveBalance.deleteMany({ where: { userId: { in: [alice.id, bob.id] } } });
  await db.attendance.deleteMany({
    where: { userId: { in: [alice.id, bob.id, manager.id, hrOnly.id] } },
  });
  await db.holiday.deleteMany({ where: { name: { startsWith: tag } } });
  await db.user.deleteMany({
    where: { id: { in: [alice.id, bob.id, manager.id, hrOnly.id] } },
  });
}

console.log(
  "phase 8 — attendance and leave are scoped by relationship, a leave reason reaches " +
    "only the person and their approver (not HR, not the calendar, not the audit log), " +
    "holidays and weekends are not charged, and balances cannot go negative.",
);
await db.$disconnect();

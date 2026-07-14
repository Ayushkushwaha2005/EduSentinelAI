// Phase 8 bootstrap: the leave types a company needs before anyone can book a day.
//
// This is NOT demo data — it is configuration a real company must have on day one,
// and the Founder edits all of it from /app/calendar afterwards. Idempotent:
// re-running changes nothing that already exists, because by then the Founder's
// numbers are the truth and this file is just a starting point.
//
// Usage: npm run db:seed:hr
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const TYPES = [
  { code: "ANNUAL", name: "Annual leave", defaultDays: 25, paid: true, sortOrder: 0 },
  { code: "SICK", name: "Sick leave", defaultDays: 10, paid: true, sortOrder: 1 },
  { code: "UNPAID", name: "Unpaid leave", defaultDays: 0, paid: false, sortOrder: 2 },
];

let created = 0;
for (const t of TYPES) {
  const existing = await db.leaveType.findUnique({ where: { code: t.code } });
  if (existing) continue;
  await db.leaveType.create({ data: t });
  created++;
}

console.log(
  `db:seed:hr — ${created} leave type(s) created (${TYPES.length - created} already existed). ` +
    `Company holidays are added from /app/calendar — they are a decision, not a default.`,
);
await db.$disconnect();

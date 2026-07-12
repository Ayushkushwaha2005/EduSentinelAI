/* R7b: verify the audit hash chain end-to-end. Any deleted or edited row
 * breaks the chain and is reported here. Run: npm run audit:verify */
import { db } from "../src/lib/db";
import { sha256 } from "../src/lib/crypto";

const rows = await db.auditLog.findMany({ orderBy: { createdAt: "asc" } });
let prevHash = "genesis";
let broken = 0;

for (const r of rows) {
  const expected = sha256(
    [
      prevHash,
      r.action,
      r.actorId ?? "",
      r.detail ?? "",
      r.ip ?? "",
      r.userAgent ?? "",
      r.createdAt.toISOString(),
    ].join("|"),
  );
  if (r.prevHash !== prevHash || r.hash !== expected) {
    broken++;
    console.error(
      `BROKEN at ${r.createdAt.toISOString()} (${r.action}): chain mismatch — row edited, or a preceding row was deleted.`,
    );
  }
  prevHash = r.hash ?? "";
}

console.log(
  broken === 0
    ? `audit chain intact: ${rows.length} rows verified.`
    : `AUDIT CHAIN BROKEN: ${broken} of ${rows.length} rows failed verification.`,
);
await db.$disconnect();
process.exit(broken === 0 ? 0 : 1);

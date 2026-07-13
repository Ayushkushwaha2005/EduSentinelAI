// Founder bootstrap: creates/promotes the founder account from env vars.
// Usage: npm run db:seed  (reads FOUNDER_EMAIL, FOUNDER_NAME, FOUNDER_PASSWORD)
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { createHash } from "node:crypto";

const db = new PrismaClient();
const email = process.env.FOUNDER_EMAIL?.toLowerCase();
const name = process.env.FOUNDER_NAME ?? "Founder";
const password = process.env.FOUNDER_PASSWORD;

if (!email || !password) {
  console.log("db:seed — set FOUNDER_EMAIL and FOUNDER_PASSWORD in apps/web/.env to bootstrap the founder account. Skipping.");
  process.exit(0);
}
if (password.length < 10) {
  console.error("db:seed — FOUNDER_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
const user = await db.user.upsert({
  where: { email },
  update: { role: "FOUNDER" },
  create: { email, name, passwordHash, role: "FOUNDER" },
});
// The audit trail is a hash chain (R7b): every row commits to its predecessor.
// This row must be chained like any other — writing it raw (as this script did
// before) leaves a null hash and breaks `npm run audit:verify` for every row
// that follows it. Mirrors src/lib/audit.ts; kept in JS because seeds run
// outside the Next build.
const prev = await db.auditLog.findFirst({
  orderBy: { createdAt: "desc" },
  select: { hash: true },
});
const createdAt = new Date();
const prevHash = prev?.hash ?? "genesis";
const action = "admin.seed_founder";
const chainHash = createHash("sha256")
  .update([prevHash, action, user.id, email, "", "", createdAt.toISOString()].join("|"))
  .digest("hex");

await db.auditLog.create({
  data: {
    action,
    actorId: user.id,
    detail: email,
    createdAt,
    prevHash,
    hash: chainHash,
  },
});
console.log(`db:seed — founder account ready: ${email}`);
await db.$disconnect();

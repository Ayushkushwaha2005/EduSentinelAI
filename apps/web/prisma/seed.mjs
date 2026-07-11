// Founder bootstrap: creates/promotes the founder account from env vars.
// Usage: npm run db:seed  (reads FOUNDER_EMAIL, FOUNDER_NAME, FOUNDER_PASSWORD)
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

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
await db.auditLog.create({
  data: { action: "admin.seed_founder", actorId: user.id, detail: email },
});
console.log(`db:seed — founder account ready: ${email}`);
await db.$disconnect();

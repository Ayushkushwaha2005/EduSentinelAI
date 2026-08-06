// Founder bootstrap: creates/promotes the founder account from env vars.
// Usage: npm run db:seed  (reads FOUNDER_EMAIL, FOUNDER_NAME, FOUNDER_PASSWORD)
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { createHash } from "node:crypto";

const db = new PrismaClient();
const email = process.env.FOUNDER_EMAIL?.toLowerCase();
/*
 * NO PLACEHOLDER IDENTITY.
 *
 * This used to fall back to the literal string "Founder" when FOUNDER_NAME was
 * unset — which is the name that then appeared everywhere the product shows a
 * PERSON: the dashboard greeting ("Good morning, Founder"), the workspace
 * topbar, the profile header, the org chart, the directory. Combined with the
 * role badge beside it the account read as a generic, demo-grade login rather
 * than as its owner. An environment that forgot the variable therefore got a
 * silently wrong identity instead of an error.
 *
 * A role is not a name. If we do not know the name, we say so and stop.
 */
const name = process.env.FOUNDER_NAME?.trim();
const password = process.env.FOUNDER_PASSWORD;

if (!email || !password) {
  console.log("db:seed — set FOUNDER_EMAIL and FOUNDER_PASSWORD in apps/web/.env to bootstrap the founder account. Skipping.");
  process.exit(0);
}
if (!name) {
  console.error("db:seed — FOUNDER_NAME must be set (the founder's real name, e.g. \"Ayush Kushwaha\"). It is shown wherever the product names a person.");
  process.exit(1);
}
if (password.length < 10) {
  console.error("db:seed — FOUNDER_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
const user = await db.user.upsert({
  where: { email },
  /*
   * `name` is repaired on re-seed, not only written on create.
   *
   * The bootstrap is the ONE path that can put an existing founder account back
   * into a correct state from the command line. While this clause only wrote
   * `role`, an account created in an environment that had no FOUNDER_NAME kept
   * the placeholder for ever: re-running the seed with the variable set changed
   * nothing, and there was no other repair path. Now `npm run db:seed` fixes it.
   *
   * Nothing else is updated here — not the password hash, not the MFA state, not
   * sessionVersion. Only the two things this script exists to guarantee: that
   * the account is the FOUNDER, and that it is named after a person.
   */
  update: { role: "FOUNDER", name },
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
    actorEmail: email, // snapshot; the log holds no FK to User
    detail: email,
    createdAt,
    prevHash,
    hash: chainHash,
  },
});
console.log(`db:seed — founder account ready: ${email}`);
await db.$disconnect();

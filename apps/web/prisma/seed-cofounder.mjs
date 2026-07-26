// Co-Founder bootstrap — LOCAL DEVELOPMENT ONLY.
//
// Reads CO_FOUNDER_EMAIL / CO_FOUNDER_NAME / CO_FOUNDER_PASSWORD from .env.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS GRANTS NOTHING BEYOND THE ROLE
//
// It sets `role: "CO_FOUNDER"` and writes no PermissionGrant rows at all. The
// capability set comes from BASE_CO_FOUNDER in lib/permissions.ts, which already
// carries every non-reserved capability — so a Co-Founder can exercise almost
// the whole portal, while the founder-reserved set (release signing, rejection
// and revocation, product deletion, role management, permission granting, org
// and company identity, offboarding) is stripped in code on every check and can
// never be held here.
//
// That is exactly the requested shape: review nearly every workflow, but no
// action that permanently affects production. It needed no permission change.
//
// Refuses to run against production, like the demo seed.
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { createHash } from "node:crypto";

if (process.env.NODE_ENV === "production") {
  console.error("db:seed:cofounder — refusing to run: local development only.");
  process.exit(1);
}

const email = process.env.CO_FOUNDER_EMAIL?.toLowerCase();
const name = process.env.CO_FOUNDER_NAME ?? "Co-Founder";
const password = process.env.CO_FOUNDER_PASSWORD;

if (!email || !password) {
  console.log("db:seed:cofounder — set CO_FOUNDER_EMAIL and CO_FOUNDER_PASSWORD in apps/web/.env. Skipping.");
  process.exit(0);
}
if (password.length < 10) {
  console.error("db:seed:cofounder — CO_FOUNDER_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const db = new PrismaClient();
const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

// The password set here is TEMPORARY by intent: it is an ordinary argon2id hash
// on the same field the account will overwrite from Settings → Password, using
// the existing changePassword action. Nothing marks it special, so nothing has
// to be undone later.
const user = await db.user.upsert({
  where: { email },
  update: { role: "CO_FOUNDER" },
  create: { email, name, passwordHash, role: "CO_FOUNDER" },
});

/* The audit chain (R7b) commits to its predecessor; a seed writes a real row
   like any other action, or `npm run audit:verify` breaks from here on. */
const prev = await db.auditLog.findFirst({
  orderBy: { createdAt: "desc" },
  select: { hash: true },
});
const createdAt = new Date();
const prevHash = prev?.hash ?? "genesis";
const action = "admin.seed_cofounder";
const chainHash = createHash("sha256")
  .update([prevHash, action, user.id, email, "", "", createdAt.toISOString()].join("|"))
  .digest("hex");

await db.auditLog.create({
  data: {
    action,
    actorId: user.id,
    actorEmail: email,
    detail: email,
    createdAt,
    prevHash,
    hash: chainHash,
  },
});

console.log(`db:seed:cofounder — Co-Founder ready: ${email}`);
console.log("  capabilities come from the CO_FOUNDER role; no grants were written.");
await db.$disconnect();

/* Phase 2.1 verification: Founder Trust Model rules, tokens, crypto, lockout.
 * Run: npx tsx --env-file=.env scripts/test-phase21.ts */
import assert from "node:assert";
import { roleChangeError } from "../src/lib/authz";
import { encryptSecret, decryptSecret, sha256 } from "../src/lib/crypto";
import { lockoutMs } from "../src/lib/rate-limit";
import { createAuthToken, consumeAuthToken } from "../src/lib/tokens";
import { db } from "../src/lib/db";

const F = { actorId: "f1", actorRole: "FOUNDER" };
const A = { actorId: "a1", actorRole: "ADMIN" };

// --- Founder Trust Model (R3) ---
// FOUNDER is never grantable, by anyone
assert(roleChangeError({ ...F, targetId: "u1", targetRole: "USER", newRole: "FOUNDER" }));
assert(roleChangeError({ ...A, targetId: "u1", targetRole: "USER", newRole: "FOUNDER" }));
// FOUNDER account is never modifiable
assert(roleChangeError({ ...F, targetId: "f2", targetRole: "FOUNDER", newRole: "USER" }));
assert(roleChangeError({ ...A, targetId: "f1", targetRole: "FOUNDER", newRole: "USER" }));
// No self-change
assert(roleChangeError({ ...F, targetId: "f1", targetRole: "FOUNDER", newRole: "ADMIN" }));
assert(roleChangeError({ ...A, targetId: "a1", targetRole: "ADMIN", newRole: "USER" }));
// ADMIN cannot mint or manage ADMINs (one-directional, capped)
assert(roleChangeError({ ...A, targetId: "u1", targetRole: "USER", newRole: "ADMIN" }));
assert(roleChangeError({ ...A, targetId: "a2", targetRole: "ADMIN", newRole: "USER" }));
// USER/EMPLOYEE can never grant
assert(roleChangeError({ actorId: "u9", actorRole: "USER", targetId: "u1", targetRole: "USER", newRole: "EMPLOYEE" }));
// Phase 5 tightening: role assignment is founder-reserved. An ADMIN granting
// EMPLOYEE was permitted in Phase 2.1; it is now denied, because any delegated
// grant path is an indirect route up the ladder. The Founder decides access.
assert(roleChangeError({ ...A, targetId: "u1", targetRole: "USER", newRole: "EMPLOYEE" }));
// Allowed paths — the Founder, and only the Founder
assert.equal(roleChangeError({ ...F, targetId: "u1", targetRole: "USER", newRole: "ADMIN" }), null);
assert.equal(roleChangeError({ ...F, targetId: "a2", targetRole: "ADMIN", newRole: "USER" }), null);
assert.equal(roleChangeError({ ...F, targetId: "u1", targetRole: "USER", newRole: "EMPLOYEE" }), null);
console.log("authz: Founder Trust Model rules OK");

// --- crypto ---
const enc = encryptSecret("JBSWY3DPEHPK3PXP");
assert.notEqual(enc, "JBSWY3DPEHPK3PXP");
assert.equal(decryptSecret(enc), "JBSWY3DPEHPK3PXP");
assert.equal(sha256("a").length, 64);
console.log("crypto: AES-256-GCM roundtrip OK");

// --- lockout progression ---
assert.equal(lockoutMs(4), 0);
assert.equal(lockoutMs(5), 60_000);
assert.equal(lockoutMs(6), 120_000);
assert.equal(lockoutMs(20), 15 * 60_000);
console.log("lockout: progressive schedule OK");

// --- tokens (single-use, expiry) ---
const u = await db.user.upsert({
  where: { email: "tokentest@test.local" },
  update: {},
  create: { email: "tokentest@test.local", name: "T", passwordHash: "x" },
});
const t1 = await createAuthToken(u.id, "reset-password");
assert.equal(await consumeAuthToken(t1, "verify-email"), null); // wrong type
assert.equal(await consumeAuthToken(t1, "reset-password"), u.id); // consume once
assert.equal(await consumeAuthToken(t1, "reset-password"), null); // single-use
const t2 = await createAuthToken(u.id, "reset-password");
const t3 = await createAuthToken(u.id, "reset-password"); // invalidates t2
assert.equal(await consumeAuthToken(t2, "reset-password"), null);
await db.authToken.updateMany({
  where: { tokenHash: sha256(t3) },
  data: { expiresAt: new Date(Date.now() - 1000) },
});
assert.equal(await consumeAuthToken(t3, "reset-password"), null); // expired
await db.authToken.deleteMany({ where: { userId: u.id } });
await db.user.delete({ where: { id: u.id } });
console.log("tokens: single-use + expiry + supersession OK");

console.log("\nALL PHASE 2.1 UNIT CHECKS PASSED");
await db.$disconnect();

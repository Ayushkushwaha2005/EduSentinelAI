/* Phase 7 gate invariants: an invitation is a link in an email, and a link in an
 * email must not be able to mint the company's leadership.
 * Runs in CI. Run locally: npm run test:invites
 *
 * What this file refuses to let regress:
 *   1. FOUNDER and CO_FOUNDER are never invitable, by anyone, ever.
 *   2. Nobody invites a peer or a superior; only the Founder attaches capabilities;
 *      reserved capabilities are refused on write AND ignored on read.
 *   3. An invitation token is single-use, expiring, and stored only as a hash.
 *   4. Offboarding removes ACCESS, keeps the ACCOUNT, and leaves the audit chain
 *      verifying — the whole reason AuditLog holds no FK to User.
 *   5. Grant expiry is real: an expired grant grants nothing. */
import assert from "node:assert";
import { db } from "../src/lib/db";
import { sha256 } from "../src/lib/crypto";
import {
  INVITABLE_ROLES,
  claimInvitation,
  createInvitation,
  findInvitation,
  invitableBy,
  inviteError,
  parseCapabilities,
} from "../src/lib/invitations";
import {
  FOUNDER_RESERVED,
  defaultCapabilities,
  effectiveCapabilities,
  isFounderReserved,
} from "../src/lib/permissions";
import { audit } from "../src/lib/audit";

const tag = `p7-${Date.now()}`;
const base = { actorId: "f1", email: "new@example.com", capabilities: [] as string[] };

/* ---------- 1. the roles an invitation can never confer ---------- */

assert.ok(!INVITABLE_ROLES.includes("FOUNDER" as never), "FOUNDER is not an invitable role");
assert.ok(
  !INVITABLE_ROLES.includes("CO_FOUNDER" as never),
  "CO_FOUNDER is not an invitable role",
);

for (const actorRole of ["FOUNDER", "CO_FOUNDER", "ADMIN", "EMPLOYEE"]) {
  assert.ok(
    inviteError({ ...base, actorRole, role: "FOUNDER" }),
    `${actorRole} must not be able to invite a FOUNDER`,
  );
  assert.ok(
    inviteError({ ...base, actorRole, role: "CO_FOUNDER" }),
    `${actorRole} must not be able to invite a CO_FOUNDER`,
  );
  assert.ok(
    !invitableBy(actorRole).includes("FOUNDER" as never),
    `${actorRole} is never offered FOUNDER`,
  );
}

/* ---------- 2. one-directional, and capabilities are founder-only ---------- */

assert.equal(
  inviteError({ ...base, actorRole: "FOUNDER", role: "ADMIN" }),
  null,
  "the Founder may invite an Admin",
);
assert.equal(
  inviteError({ ...base, actorRole: "CO_FOUNDER", role: "EMPLOYEE" }),
  null,
  "a Co-Founder may invite an Employee",
);
assert.ok(
  inviteError({ ...base, actorRole: "ADMIN", role: "ADMIN" }),
  "nobody invites a peer",
);
assert.ok(
  inviteError({ ...base, actorRole: "EMPLOYEE", role: "ADMIN" }),
  "nobody invites a superior",
);
assert.deepEqual(
  invitableBy("EMPLOYEE"),
  ["USER", "COLLABORATOR"],
  "an employee may only invite strictly below themselves",
);

// Attaching capabilities IS permissions.grant, which is founder-reserved.
assert.ok(
  inviteError({
    ...base,
    actorRole: "CO_FOUNDER",
    role: "EMPLOYEE",
    capabilities: ["products.manage"],
  }),
  "only the Founder may attach capabilities to an invitation",
);
assert.equal(
  inviteError({
    ...base,
    actorRole: "FOUNDER",
    role: "EMPLOYEE",
    capabilities: ["products.manage"],
  }),
  null,
  "the Founder may attach a grantable capability",
);
for (const cap of FOUNDER_RESERVED) {
  assert.ok(
    inviteError({ ...base, actorRole: "FOUNDER", role: "EMPLOYEE", capabilities: [cap] }),
    `a reserved capability (${cap}) can never ride in on an invitation`,
  );
}

// …and even a row that somehow HOLDS a reserved capability grants nothing: the
// list is re-validated on read, not merely on write.
assert.deepEqual(
  parseCapabilities(JSON.stringify(["permissions.grant", "users.manage_roles", "products.manage"])),
  ["products.manage"],
  "reserved capabilities are stripped when an invitation is read back",
);
assert.deepEqual(parseCapabilities("not json"), [], "a malformed capability list grants nothing");
assert.deepEqual(parseCapabilities('["system.root"]'), [], "an unknown key grants nothing");
assert.ok(
  inviteError({ ...base, actorRole: "FOUNDER", role: "EMPLOYEE", email: "not-an-email" }),
  "a malformed address is refused before anything is written",
);

/* ---------- 3. the token: single-use, expiring, hash-only ---------- */

const founder = await db.user.create({
  data: {
    email: `${tag}-founder@test.local`,
    name: "Invite Founder",
    passwordHash: "x",
    role: "FOUNDER",
  },
});
const joiner = await db.user.create({
  data: {
    email: `${tag}-joiner@test.local`,
    name: "Joiner",
    passwordHash: "x",
    role: "USER",
  },
});

try {
  const { invitation, token } = await createInvitation({
    actorId: founder.id,
    actorRole: "FOUNDER",
    actorEmail: founder.email,
    email: `${tag}-invitee@test.local`,
    role: "EMPLOYEE",
    capabilities: ["products.manage"],
  });

  // The plaintext is NOT in the database. A dump of this table cannot be replayed
  // into an account — only the hash is stored, exactly like AuthToken (R9).
  const row = await db.invitation.findUnique({ where: { id: invitation.id } });
  assert.ok(row, "the invitation exists");
  assert.notEqual(row.tokenHash, token, "the plaintext token is never stored");
  assert.equal(row.tokenHash, sha256(token), "only the hash is stored");

  assert.ok(await findInvitation(token), "a live invitation is found by its token");
  assert.equal(await findInvitation("wrong-token"), null, "a wrong token finds nothing");

  // Single-use, and atomic: two racers produce one acceptance.
  const [a, b] = await Promise.all([
    claimInvitation(token, joiner.id),
    claimInvitation(token, founder.id),
  ]);
  assert.equal(
    [a, b].filter(Boolean).length,
    1,
    "two people racing the same link produce exactly ONE acceptance",
  );
  assert.equal(
    await findInvitation(token),
    null,
    "the token is dead once used",
  );

  // Expiry is enforced on read, not by a background job that might not run.
  const { invitation: old, token: oldToken } = await createInvitation({
    actorId: founder.id,
    actorRole: "FOUNDER",
    actorEmail: founder.email,
    email: `${tag}-expired@test.local`,
    role: "USER",
    capabilities: [],
  });
  await db.invitation.update({
    where: { id: old.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal(
    await findInvitation(oldToken),
    null,
    "an expired invitation is not valid, whatever its status column says",
  );

  // Re-inviting an address supersedes the outstanding link, so two live links with
  // different roles cannot exist for the same person.
  const first = await createInvitation({
    actorId: founder.id,
    actorRole: "FOUNDER",
    actorEmail: founder.email,
    email: `${tag}-resend@test.local`,
    role: "USER",
    capabilities: [],
  });
  const second = await createInvitation({
    actorId: founder.id,
    actorRole: "FOUNDER",
    actorEmail: founder.email,
    email: `${tag}-resend@test.local`,
    role: "EMPLOYEE",
    capabilities: [],
  });
  assert.equal(
    await findInvitation(first.token),
    null,
    "re-inviting supersedes the previous link — no two live links for one address",
  );
  assert.ok(await findInvitation(second.token), "the new link works");
} finally {
  await db.invitation.deleteMany({ where: { email: { startsWith: tag } } });
}

/* ---------- 5. grant expiry is real ---------- */
{
  await db.permissionGrant.create({
    data: {
      userId: joiner.id,
      capability: "collab.moderate",
      allow: true,
      grantedBy: founder.id,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  assert.ok(
    (await effectiveCapabilities(joiner.id)).has("collab.moderate"),
    "a live time-limited grant applies",
  );

  await db.permissionGrant.updateMany({
    where: { userId: joiner.id, capability: "collab.moderate" },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.ok(
    !(await effectiveCapabilities(joiner.id)).has("collab.moderate"),
    "an EXPIRED grant grants nothing — temporary access stays temporary",
  );
  await db.permissionGrant.deleteMany({ where: { userId: joiner.id } });
}

/* ---------- 4. offboarding ---------- */

// people.offboard is founder-reserved: taking access away is, in the wrong hands,
// how you silence someone who has noticed something.
assert.ok(isFounderReserved("people.offboard"), "people.offboard is founder-reserved");
assert.ok(
  !defaultCapabilities("CO_FOUNDER").includes("people.offboard"),
  "a co-founder cannot offboard anyone",
);
// people.invite, by contrast, IS grantable — bringing someone on board is ordinary work.
assert.ok(!isFounderReserved("people.invite"), "people.invite is grantable");
assert.ok(
  defaultCapabilities("CO_FOUNDER").includes("people.invite"),
  "a co-founder may invite",
);

{
  const leaver = await db.user.create({
    data: {
      email: `${tag}-leaver@test.local`,
      name: "Leaver",
      passwordHash: "x",
      role: "ADMIN",
      sessionVersion: 3,
    },
  });
  await db.permissionGrant.create({
    data: {
      userId: leaver.id,
      capability: "collab.moderate",
      allow: true,
      grantedBy: founder.id,
    },
  });
  await audit("test.before_offboard", { actorId: leaver.id, detail: "probe" });

  const auditBefore = await db.auditLog.findFirst({
    where: { action: "test.before_offboard", actorId: leaver.id },
  });
  assert.ok(auditBefore, "the probe row was written");

  // The offboarding transaction, as the action performs it.
  await db.$transaction(async (tx) => {
    await tx.permissionGrant.deleteMany({ where: { userId: leaver.id } });
    await tx.user.update({
      where: { id: leaver.id },
      data: { role: "USER", sessionVersion: { increment: 1 } },
    });
  });

  const after = await db.user.findUnique({ where: { id: leaver.id } });
  assert.ok(after, "the ACCOUNT still exists — offboarding is not deletion");
  assert.equal(after.role, "USER", "the role is stripped");
  assert.equal(after.sessionVersion, 4, "every session is revoked");
  assert.equal(
    (await db.permissionGrant.count({ where: { userId: leaver.id } })),
    0,
    "every explicit capability is removed",
  );
  assert.ok(
    !(await effectiveCapabilities(leaver.id)).has("collab.moderate"),
    "…and they can no longer do the thing they were granted",
  );

  // The audit trail survives the offboarding, unchanged. This is the Phase 5.6 fix
  // earning its keep: AuditLog holds no FK to User, so nothing here rewrites
  // actorId — which the R7b hash commits to, and which would otherwise read as
  // tampering the next time the chain was verified.
  const auditAfter = await db.auditLog.findUnique({ where: { id: auditBefore.id } });
  assert.ok(auditAfter, "offboarding does not delete their audit history");
  assert.equal(auditAfter.actorId, leaver.id, "…and does not rewrite it");
  assert.equal(auditAfter.hash, auditBefore.hash, "the row is byte-for-byte unchanged");

  await db.user.delete({ where: { id: leaver.id } }).catch(() => null);
}

await db.user.deleteMany({ where: { id: { in: [founder.id, joiner.id] } } });

console.log(
  "phase 7 — an invitation cannot mint a Founder, cannot invite a peer, cannot carry " +
    "a reserved capability, works once and expires; offboarding removes access, keeps " +
    "the account, and leaves the audit chain intact.",
);
await db.$disconnect();

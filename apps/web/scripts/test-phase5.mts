/* Phase 5 gate invariants: the capability system cannot be used to escalate.
 * Runs in CI. Run locally: npm run test:permissions
 *
 * The Founder Trust Model is only real if a grant row in the database cannot
 * produce a reserved capability. These tests write hostile rows straight into
 * PermissionGrant — bypassing every server action and every UI check — and
 * assert that effectiveCapabilities() still refuses to hand them out. */
import assert from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import {
  CAPABILITIES,
  FOUNDER_RESERVED,
  defaultCapabilities,
  effectiveCapabilities,
  grantError,
  isFounderReserved,
} from "../src/lib/permissions";
import { roleChangeError, grantableRoles } from "../src/lib/authz";
import { ROLES, rankOf, outranks, isAdminRole } from "../src/lib/roles";
import {
  contactableBy,
  isParticipant,
  listConversations,
  openConversation,
} from "../src/lib/messages";

// ---------- role ladder ----------
assert.deepEqual(
  [...ROLES],
  ["USER", "COLLABORATOR", "EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"],
  "role ladder order is load-bearing (rank comparisons depend on it)",
);
assert.ok(rankOf("FOUNDER") > rankOf("CO_FOUNDER"), "founder outranks co-founder");
assert.ok(outranks("FOUNDER", "ADMIN"), "founder outranks admin");
assert.ok(!outranks("CO_FOUNDER", "CO_FOUNDER"), "peers do not outrank peers");
assert.ok(!outranks("ADMIN", "FOUNDER"), "nobody outranks the founder");
assert.ok(!isAdminRole("EMPLOYEE"), "employee is not an admin role");
assert.ok(isAdminRole("CO_FOUNDER"), "co-founder reaches admin surfaces");

// ---------- role defaults never contain reserved capabilities ----------
for (const role of ROLES) {
  if (role === "FOUNDER") continue;
  for (const cap of FOUNDER_RESERVED) {
    assert.ok(
      !defaultCapabilities(role).includes(cap),
      `${role} must not hold reserved capability ${cap} by default`,
    );
  }
}
for (const cap of FOUNDER_RESERVED) {
  assert.ok(
    defaultCapabilities("FOUNDER").includes(cap),
    `FOUNDER must hold ${cap}`,
  );
}

// ---------- grantError: reserved capabilities are non-delegable ----------
for (const cap of FOUNDER_RESERVED) {
  assert.ok(
    grantError({
      actorId: "f1",
      actorRole: "FOUNDER",
      targetId: "c1",
      targetRole: "CO_FOUNDER",
      capability: cap,
    }),
    `even the Founder cannot delegate ${cap}`,
  );
}
assert.equal(
  grantError({
    actorId: "f1",
    actorRole: "FOUNDER",
    targetId: "e1",
    targetRole: "EMPLOYEE",
    capability: "products.manage",
  }),
  null,
  "Founder may grant a non-reserved capability",
);
assert.ok(
  grantError({
    actorId: "c1",
    actorRole: "CO_FOUNDER",
    targetId: "e1",
    targetRole: "EMPLOYEE",
    capability: "products.manage",
  }),
  "only the Founder may manage permissions",
);
assert.ok(
  grantError({
    actorId: "f1",
    actorRole: "FOUNDER",
    targetId: "f1",
    targetRole: "FOUNDER",
    capability: "products.manage",
  }),
  "nobody edits their own permissions",
);

// ---------- role changes ----------
assert.ok(
  roleChangeError({
    actorId: "f1",
    actorRole: "FOUNDER",
    targetId: "e1",
    targetRole: "EMPLOYEE",
    newRole: "FOUNDER",
  }),
  "FOUNDER role is never grantable",
);
assert.ok(
  roleChangeError({
    actorId: "c1",
    actorRole: "CO_FOUNDER",
    targetId: "e1",
    targetRole: "EMPLOYEE",
    newRole: "ADMIN",
  }),
  "role assignment is founder-reserved — a co-founder cannot grant roles",
);
assert.ok(
  roleChangeError({
    actorId: "a1",
    actorRole: "ADMIN",
    targetId: "f1",
    targetRole: "FOUNDER",
    newRole: "USER",
  }),
  "the FOUNDER account cannot be demoted",
);
assert.deepEqual(grantableRoles("CO_FOUNDER"), [], "co-founder grants no roles");
assert.deepEqual(grantableRoles("ADMIN"), [], "admin grants no roles");
assert.ok(
  grantableRoles("FOUNDER").length > 0 && !grantableRoles("FOUNDER").includes("FOUNDER" as never),
  "founder grants every role except FOUNDER",
);

// ---------- the real test: hostile rows written directly to the database ----------
const suffix = Date.now();
const victim = await db.user.create({
  data: {
    email: `phase5-escalation-${suffix}@test.local`,
    name: "Escalation Probe",
    passwordHash: "x",
    role: "CO_FOUNDER",
  },
});

try {
  // Attacker (or a bug, or a bad migration) writes every reserved capability
  // straight into the grant table, bypassing grantError entirely.
  for (const cap of FOUNDER_RESERVED) {
    await db.permissionGrant.create({
      data: {
        userId: victim.id,
        capability: cap,
        allow: true,
        grantedBy: "forged",
      },
    });
  }

  const caps = await effectiveCapabilities(victim.id);
  for (const cap of FOUNDER_RESERVED) {
    assert.ok(
      !caps.has(cap),
      `forged grant row must NOT yield reserved capability ${cap}`,
    );
  }

  // A non-reserved grant does work — the system is not simply refusing everything.
  await db.permissionGrant.create({
    data: {
      userId: victim.id,
      capability: "team.manage",
      allow: true,
      grantedBy: "founder",
    },
  });
  assert.ok(
    (await effectiveCapabilities(victim.id)).has("team.manage"),
    "a legitimate grant must take effect",
  );

  // An unknown capability key is ignored rather than granted.
  await db.permissionGrant.create({
    data: {
      userId: victim.id,
      capability: "system.root",
      allow: true,
      grantedBy: "forged",
    },
  });
  const after = await effectiveCapabilities(victim.id);
  assert.ok(
    ![...after].some((c) => !CAPABILITIES.includes(c)),
    "unknown capability keys are never granted",
  );

  // Expired grants do not apply.
  const expiredUser = await db.user.create({
    data: {
      email: `phase5-expired-${suffix}@test.local`,
      name: "Expiry Probe",
      passwordHash: "x",
      role: "EMPLOYEE",
    },
  });
  await db.permissionGrant.create({
    data: {
      userId: expiredUser.id,
      capability: "collab.moderate",
      allow: true,
      grantedBy: "founder",
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  assert.ok(
    !(await effectiveCapabilities(expiredUser.id)).has("collab.moderate"),
    "an expired grant must not apply",
  );

  // A revoke row cannot strip the Founder of reserved capabilities.
  const founder = await db.user.create({
    data: {
      email: `phase5-founder-${suffix}@test.local`,
      name: "Founder Probe",
      passwordHash: "x",
      role: "FOUNDER",
    },
  });
  await db.permissionGrant.create({
    data: {
      userId: founder.id,
      capability: "releases.publish",
      allow: false,
      grantedBy: "forged",
    },
  });
  assert.ok(
    (await effectiveCapabilities(founder.id)).has("releases.publish"),
    "the Founder cannot be locked out of a reserved capability",
  );

  await db.user.deleteMany({
    where: { id: { in: [expiredUser.id, founder.id] } },
  });
} finally {
  await db.user.delete({ where: { id: victim.id } }).catch(() => null);
}

// ---------- reserved set is internally consistent ----------
for (const cap of FOUNDER_RESERVED) {
  assert.ok(isFounderReserved(cap), `${cap} reports itself as reserved`);
  assert.ok(CAPABILITIES.includes(cap), `${cap} is a real capability`);
}

// ---------- 5.3: message center isolation ----------
// A conversation is readable only by its participants. These probes ask for a
// thread they are not in, exactly as a tampered URL would.
const m = Date.now();
const alice = await db.user.create({
  data: { email: `msg-a-${m}@test.local`, name: "Alice Staff", passwordHash: "x", role: "EMPLOYEE" },
});
const bob = await db.user.create({
  data: { email: `msg-b-${m}@test.local`, name: "Bob Staff", passwordHash: "x", role: "EMPLOYEE" },
});
const mallory = await db.user.create({
  data: { email: `msg-m-${m}@test.local`, name: "Mallory Outsider", passwordHash: "x", role: "EMPLOYEE" },
});
const extern = await db.user.create({
  data: { email: `msg-x-${m}@test.local`, name: "Ext Collab", passwordHash: "x", role: "COLLABORATOR" },
});
const extern2 = await db.user.create({
  data: { email: `msg-x2-${m}@test.local`, name: "Ext Two", passwordHash: "x", role: "COLLABORATOR" },
});

try {
  const convo = await db.conversation.create({
    data: {
      kind: "TEAM",
      createdById: alice.id,
      participants: { create: [{ userId: alice.id }, { userId: bob.id }] },
      messages: { create: [{ authorId: alice.id, body: "internal only" }] },
    },
  });

  assert.ok(await openConversation(alice.id, convo.id), "a participant can open the thread");
  assert.equal(
    await openConversation(mallory.id, convo.id),
    null,
    "a non-participant must not read the thread, even with its exact id",
  );
  assert.equal(
    await openConversation(extern.id, convo.id),
    null,
    "an external collaborator must not read an internal thread",
  );
  assert.equal(
    (await listConversations(mallory.id)).length,
    0,
    "a non-participant's conversation list must not include the thread",
  );
  assert.ok(!(await isParticipant(mallory.id, convo.id)), "isParticipant is honest");

  // Collaborators may reach staff, but never each other — we must not become a
  // directory or a channel between external parties.
  const staffContacts = await contactableBy(alice.id, "EMPLOYEE");
  assert.ok(
    staffContacts.some((u) => u.id === extern.id),
    "staff may contact a collaborator",
  );

  const collabContacts = await contactableBy(extern.id, "COLLABORATOR");
  assert.ok(
    collabContacts.some((u) => u.id === alice.id),
    "a collaborator may contact staff",
  );
  assert.ok(
    !collabContacts.some((u) => u.id === extern2.id),
    "a collaborator must NOT be able to contact another collaborator",
  );
  assert.ok(
    !collabContacts.some((u) => u.id === extern.id),
    "nobody is offered themselves as a contact",
  );
} finally {
  await db.user.deleteMany({
    where: { id: { in: [alice.id, bob.id, mallory.id, extern.id, extern2.id] } },
  });
}

// ---------- MFA is mandatory for every privileged role ----------
// Regression: disableMfa named ADMIN and FOUNDER explicitly, so CO_FOUNDER —
// added in this phase — could have switched off its own mandatory MFA. Rank
// checks, not role names.
for (const role of ["ADMIN", "CO_FOUNDER", "FOUNDER"]) {
  assert.ok(isAdminRole(role), `${role} must be treated as privileged (MFA mandatory)`);
}
for (const role of ["USER", "COLLABORATOR", "EMPLOYEE"]) {
  assert.ok(!isAdminRole(role), `${role} must not be treated as privileged`);
}

// ---------- deny-by-default: every workspace surface goes through the guard ----------
// A page or action that authorizes by hand is how the boundary rots. This walks
// the real files, so a new route added without a guard fails CI rather than
// quietly shipping open.
const APP_DIR = path.join(process.cwd(), "src", "app", "app");
const GUARDS = [
  "requireViewer",
  "requireCapability",
  "requireFounder",
  "assertCapability",
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

const guarded: string[] = [];
const unguarded: string[] = [];

for (const file of walk(APP_DIR)) {
  const base = path.basename(file);
  const isPage = base === "page.tsx";
  const isActions = base === "actions.ts";
  if (!isPage && !isActions) continue;

  const src = readFileSync(file, "utf8");
  const rel = path.relative(APP_DIR, file).replace(/\\/g, "/");

  // A page that only redirects (the retired /app/admin console) holds no data.
  const redirectOnly = isPage && /redirect\(/.test(src) && !/db\./.test(src);
  if (redirectOnly) continue;

  if (GUARDS.some((g) => src.includes(g))) guarded.push(rel);
  else unguarded.push(rel);
}

assert.deepEqual(
  unguarded,
  [],
  `every /app page and action must authorize through lib/guard.ts — unguarded: ${unguarded.join(", ")}`,
);
assert.ok(guarded.length >= 10, "the guard sweep must actually be finding files");

// Nothing under /app may authorize by hand-rolling a role comparison against
// the session — that path bypasses capabilities and the MFA gate entirely.
for (const file of walk(APP_DIR)) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const src = readFileSync(file, "utf8");
  const rel = path.relative(APP_DIR, file).replace(/\\/g, "/");
  assert.ok(
    !/session\??\.user\??\.role/.test(src),
    `${rel}: authorize via lib/guard.ts, never by reading the role off the session`,
  );
}

console.log(
  `phase 5 — permission, message-isolation and deny-by-default invariants hold ` +
    `(${guarded.length} guarded surfaces; no escalation path found).`,
);
await db.$disconnect();

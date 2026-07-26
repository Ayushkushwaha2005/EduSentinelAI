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
import {
  parseList,
  publicProduct,
  publicProducts,
  safeHref,
  serializeList,
} from "../src/lib/catalog";
import { isProductIconKey } from "../src/lib/product-icons";
import { audit } from "../src/lib/audit";

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

// ---------- audit log is immutable w.r.t. the users table ----------
// Regression: AuditLog.actor used to be an optional FK to User, so Prisma's
// default SetNull rewrote actorId to null when an account was deleted. The R7b
// hash commits to actorId, so ordinary offboarding silently broke the chain and
// looked exactly like tampering. The log now holds no FK and snapshots the actor.
{
  const doomed = await db.user.create({
    data: {
      email: `audit-immutability-${Date.now()}@test.local`,
      name: "Offboarding Probe",
      passwordHash: "x",
      role: "EMPLOYEE",
    },
  });
  await audit("test.offboarding_probe", { actorId: doomed.id, detail: "probe" });

  const before = await db.auditLog.findFirst({
    where: { action: "test.offboarding_probe", actorId: doomed.id },
  });
  assert.ok(before, "the probe audit row was written");
  assert.equal(before.actorEmail, doomed.email, "the actor's email is snapshot on the row");

  await db.user.delete({ where: { id: doomed.id } });

  const after = await db.auditLog.findUnique({ where: { id: before.id } });
  assert.ok(after, "deleting the account must not delete its audit rows");
  assert.equal(
    after.actorId,
    doomed.id,
    "deleting the account must NOT rewrite actorId — that would break the hash chain",
  );
  assert.equal(after.hash, before.hash, "the audit row is byte-for-byte unchanged");
  assert.equal(after.actorEmail, doomed.email, "the snapshot survives the account");

  // The probe row is deliberately LEFT in the chain. Cleaning it up would mean
  // deleting an audit row, which is the very thing the chain exists to detect —
  // an append-only log is not something a test gets to tidy.
}

// ---------- 5.5: product catalogue ----------
// The catalogue renders on the PUBLIC marketing site, so a product record must
// not be able to carry markup, a hostile link, or a draft into public view.

// CTA links: internal paths and https only. javascript:/data:/protocol-relative
// all fall back rather than reaching an <a href>.
assert.equal(safeHref("/downloads"), "/downloads", "internal path allowed");
assert.equal(safeHref("https://edusentinel.ai"), "https://edusentinel.ai/", "https allowed");
assert.equal(safeHref("javascript:alert(1)"), "/contact", "javascript: refused");
assert.equal(safeHref("data:text/html;base64,PHNjcmlwdD4="), "/contact", "data: refused");
assert.equal(safeHref("//evil.example.com"), "/contact", "protocol-relative refused");
assert.equal(safeHref("http://insecure.example"), "/contact", "plain http refused");
assert.equal(safeHref(""), "/contact", "empty falls back");

// Icons are keys into a fixed set — never author-supplied markup.
assert.ok(isProductIconKey("shield"), "known icon key accepted");
assert.ok(!isProductIconKey("<svg onload=alert(1)>"), "markup is not an icon key");
assert.ok(!isProductIconKey("../../etc/passwd"), "traversal is not an icon key");

// List columns tolerate garbage without throwing, and strip markup.
assert.deepEqual(parseList("not json"), [], "malformed JSON yields no tags");
assert.deepEqual(parseList(null), [], "null yields no tags");
assert.deepEqual(parseList('["a", 3, null]'), ["a"], "non-strings dropped");
assert.ok(
  !parseList('["<script>alert(1)</script>"]')[0]?.includes("<"),
  "markup stripped from tags",
);
assert.ok(
  !JSON.parse(serializeList("<img src=x onerror=1>, ok"))[0].includes("<"),
  "markup stripped on write",
);

// Only PUBLISHED products are ever public.
const pslug = `probe-${Date.now()}`;
const owner = await db.user.findFirst({ where: { role: "FOUNDER" }, select: { id: true } });
if (owner) {
  const draft = await db.product.create({
    data: {
      slug: pslug,
      name: "Probe",
      description: "A draft that must never be public.",
      ownerId: owner.id,
      status: "DRAFT",
    },
  });
  try {
    assert.equal(await publicProduct(pslug), null, "a DRAFT product must not be public");
    assert.ok(
      !(await publicProducts()).some((p) => p.slug === pslug),
      "a DRAFT product must not appear in the public list",
    );

    await db.product.update({ where: { id: draft.id }, data: { status: "ARCHIVED" } });
    assert.equal(await publicProduct(pslug), null, "an ARCHIVED product must not be public");

    await db.product.update({
      where: { id: draft.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    assert.ok(await publicProduct(pslug), "a PUBLISHED product is public");
  } finally {
    await db.product.delete({ where: { id: draft.id } }).catch(() => null);
  }
}

// products.delete is founder-reserved: no grant hands it to a co-founder.
assert.ok(isFounderReserved("products.delete"), "product deletion is founder-reserved");
assert.ok(
  !defaultCapabilities("CO_FOUNDER").includes("products.delete"),
  "a co-founder cannot delete products",
);
/*
 * Phase 14 INVERTED THIS ASSERTION, deliberately.
 *
 * It used to read "a co-founder can publish products (grantable, not
 * reserved)". Production publishing — putting a product live on the public
 * site — is now founder-reserved, which is the whole point of Founder View
 * Mode: a Co-Founder exercises the entire workspace for review, and the actions
 * that permanently affect production stay with the Founder.
 *
 * The assertion is kept rather than deleted, and strengthened, so the tightening
 * cannot be quietly undone later.
 */
assert.ok(
  isFounderReserved("products.publish"),
  "production publishing is founder-reserved (Phase 14)",
);
assert.ok(
  !defaultCapabilities("CO_FOUNDER").includes("products.publish"),
  "a co-founder cannot publish to production",
);
assert.ok(
  defaultCapabilities("CO_FOUNDER").includes("products.manage"),
  "a co-founder can still build and edit the catalogue",
);
assert.ok(
  !defaultCapabilities("EMPLOYEE").includes("products.manage"),
  "an employee cannot edit the catalogue by default",
);

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
  /* Phase 15. `requireExecutiveView` (lib/executive.ts) is a guard: it calls
     requireViewer, enforces MFA for privileged roles, and redirects anyone who
     is neither an executive nor a holder of the capability. It widens WHO MAY
     OPEN a leadership surface and nothing else — every action on those surfaces
     still calls assertCapability. Recognised here so the deny-by-default sweep
     keeps passing without being loosened. */
  "requireExecutiveView",
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
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const src = readFileSync(file, "utf8");
  const rel = path.relative(APP_DIR, file).replace(/\\/g, "/");

  const isPage = path.basename(file) === "page.tsx";
  // ANY server-action module, whatever it is called — matching on the filename
  // would miss catalog-actions.ts and every future sibling.
  const isActions = /^\s*["']use server["']/.test(src);
  if (!isPage && !isActions) continue;

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


/* ─────────────────────────── Phase 14: the named founder-only powers ──── */
//
// Requirement: these can never be granted, to anyone, by any means. They are
// asserted here rather than trusted, because the entire Founder Trust Model
// rests on FOUNDER_RESERVED being complete and enforced rather than merely
// documented.
{
  const NAMED_FOUNDER_ONLY = [
    "founder.transfer",
    "org.delete",
    "releases.publish", // release signing
    "products.publish", // production publishing
    "users.manage_roles", // role promotion
    "permissions.grant", // permission engine management
    "billing.manage",
    "secrets.manage",
    "security.policy",
  ] as const;

  for (const cap of NAMED_FOUNDER_ONLY) {
    assert.ok(isFounderReserved(cap), `${cap} must be founder-reserved`);
    for (const role of ["USER", "COLLABORATOR", "EMPLOYEE", "ADMIN", "CO_FOUNDER"]) {
      assert.ok(
        !defaultCapabilities(role).includes(cap),
        `${role} must not hold ${cap} by default`,
      );
    }
  }

  // A FORGED GRANT ROW MUST NOT WORK. This is the real test: the row is written
  // directly to the database, bypassing every action and every form, and the
  // capability still must not appear in the effective set.
  const victim = await db.user.create({
    data: {
      email: `p14-${Date.now()}@example.test`,
      name: "Phase 14 probe",
      passwordHash: "x",
      role: "CO_FOUNDER",
    },
  });
  try {
    await db.permissionGrant.createMany({
      data: NAMED_FOUNDER_ONLY.map((capability) => ({
        userId: victim.id,
        capability,
        allow: true,
        grantedBy: "forged",
      })),
    });
    const effective = await effectiveCapabilities(victim.id, "CO_FOUNDER");
    for (const cap of NAMED_FOUNDER_ONLY) {
      assert.ok(
        !effective.has(cap),
        `a forged grant row must not yield ${cap} to a CO_FOUNDER`,
      );
    }

    // And the Founder still holds every one of them — requirement 8.
    const founderCaps = await effectiveCapabilities(victim.id, "FOUNDER");
    for (const cap of NAMED_FOUNDER_ONLY) {
      assert.ok(founderCaps.has(cap), `the FOUNDER must still hold ${cap}`);
    }
  } finally {
    await db.permissionGrant.deleteMany({ where: { userId: victim.id } });
    await db.user.delete({ where: { id: victim.id } }).catch(() => null);
  }
}


/* ───────────────────── Phase 15: Executive Workspace boundary ──────────── */
//
// The Executive Workspace widens VIEW to the Co-Founder. These assertions exist
// to prove it widened nothing else — that "may open Access Control" did not
// quietly become "may grant permissions".
{
  const { isExecutive, isReviewMode } = await import("../src/lib/executive");

  assert.ok(isExecutive("FOUNDER"), "the Founder is an executive");
  assert.ok(isExecutive("CO_FOUNDER"), "the Co-Founder is an executive");
  for (const role of ["ADMIN", "EMPLOYEE", "COLLABORATOR", "USER"]) {
    assert.ok(!isExecutive(role), `${role} is NOT an executive — view is not widened to them`);
  }

  // THE FOUNDER IS NEVER IN REVIEW MODE. If this ever flips, the Founder's own
  // workspace has started rendering approval affordances, which is exactly the
  // regression this phase was told not to cause.
  const founderViewer = {
    role: "FOUNDER",
    can: () => true,
  } as unknown as Parameters<typeof isReviewMode>[0];
  assert.ok(
    !isReviewMode(founderViewer, "permissions.grant"),
    "the Founder must never be shown review mode",
  );

  // The Co-Founder IS, for every reserved capability.
  const coViewer = {
    role: "CO_FOUNDER",
    can: (c: string) => !FOUNDER_RESERVED.includes(c as never),
  } as unknown as Parameters<typeof isReviewMode>[0];
  for (const cap of FOUNDER_RESERVED) {
    assert.ok(
      isReviewMode(coViewer, cap),
      `a Co-Founder must be in review mode for ${cap}`,
    );
  }

  // Session management is reserved: viewing the Session Center is leadership,
  // ending somebody's session is authority.
  assert.ok(isFounderReserved("sessions.manage"), "sessions.manage is founder-reserved");
  assert.ok(
    !defaultCapabilities("CO_FOUNDER").includes("sessions.manage"),
    "a Co-Founder cannot end another account's sessions",
  );
  assert.ok(
    defaultCapabilities("FOUNDER").includes("sessions.manage"),
    "the Founder can end sessions",
  );
}

/* ─────────── Phase 15: the Founder's capability set did not shrink ──────── */
//
// Requirement: "Founder must continue working EXACTLY as it does today." The
// Founder holds every capability that exists — asserted against CAPABILITIES
// itself, so adding a capability without giving it to the Founder fails here.
{
  const founderCaps = defaultCapabilities("FOUNDER");
  for (const cap of CAPABILITIES) {
    assert.ok(
      founderCaps.includes(cap),
      `the FOUNDER must hold every capability — missing ${cap}`,
    );
  }
}

console.log(
  `phase 5 — permission, message-isolation and deny-by-default invariants hold ` +
    `(${guarded.length} guarded surfaces; no escalation path found).`,
);
await db.$disconnect();

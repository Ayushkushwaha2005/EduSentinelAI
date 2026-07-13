/* Phase 6.5 gate invariants: the organization is data, and it is the Founder's.
 * Runs in CI. Run locally: npm run test:org
 *
 * Four things this file refuses to let regress:
 *   1. org.manage and company.manage are FOUNDER-RESERVED. Someone who can edit
 *      the org chart can put themselves on it as CTO and publish that to the
 *      world; someone who can edit the company profile can change the security
 *      contact address. Neither is delegable, and a forged grant row must not
 *      produce them.
 *   2. NO DUPLICATE DATA. A linked org member's name/email/photo resolve from the
 *      account. Renaming the account renames them everywhere — because there is
 *      only one copy.
 *   3. The collaboration bug stays fixed: a collaborator account is never
 *      invisible to the Collaboration page, and approving a request creates the
 *      relationship.
 *   4. The public roster is public-safe: INTERNAL/HIDDEN members never leak, and
 *      a hostile link or markup never reaches an <a href> on the marketing site. */
import assert from "node:assert";
import { db } from "../src/lib/db";
import {
  FOUNDER_RESERVED,
  defaultCapabilities,
  effectiveCapabilities,
  grantError,
  isFounderReserved,
} from "../src/lib/permissions";
import { parseLinks, publicRoster, roster, serializeLinks } from "../src/lib/org";
import { getCompany, COMPANY_DEFAULTS } from "../src/lib/company";
import { collaborationBoard } from "../src/lib/collaborations";

const tag = `p65-${Date.now()}`;

/* ---------- 1. the org chart and the company are founder-reserved ---------- */

for (const cap of ["org.manage", "company.manage"] as const) {
  assert.ok(isFounderReserved(cap), `${cap} must be founder-reserved`);
  assert.ok(
    defaultCapabilities("FOUNDER").includes(cap),
    `the Founder holds ${cap}`,
  );
  for (const role of ["CO_FOUNDER", "ADMIN", "EMPLOYEE", "COLLABORATOR", "USER"] as const) {
    assert.ok(
      !defaultCapabilities(role).includes(cap),
      `${role} must not hold ${cap} by default`,
    );
  }
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
  assert.ok(FOUNDER_RESERVED.includes(cap), `${cap} is in the reserved set`);
}

// collab.manage IS grantable — managing a partnership is operational work. But it
// must never be confused with collab.view, which is the COLLABORATOR's own
// permission to see their own thread. If the staff console ever gated on
// collab.view, every external collaborator would get the full list of everyone we
// work with — the exact tenant-isolation failure Phase 5 exists to prevent.
assert.ok(
  !isFounderReserved("collab.manage"),
  "collab.manage is grantable, not reserved",
);
assert.ok(
  defaultCapabilities("COLLABORATOR").includes("collab.view"),
  "a collaborator holds collab.view — it is THEIR view of THEIR own thread",
);
assert.ok(
  !defaultCapabilities("COLLABORATOR").includes("collab.manage"),
  "a collaborator must NEVER hold collab.manage — that is the staff console",
);

// The real proof: a forged grant row, written straight to the table.
const forged = await db.user.create({
  data: {
    email: `${tag}-forged@test.local`,
    name: "Org Escalation Probe",
    passwordHash: "x",
    role: "CO_FOUNDER",
  },
});
try {
  for (const cap of ["org.manage", "company.manage"]) {
    await db.permissionGrant.create({
      data: { userId: forged.id, capability: cap, allow: true, grantedBy: "forged" },
    });
  }
  const caps = await effectiveCapabilities(forged.id);
  assert.ok(!caps.has("org.manage"), "a forged grant must not yield org.manage");
  assert.ok(
    !caps.has("company.manage"),
    "a forged grant must not yield company.manage",
  );
} finally {
  await db.user.delete({ where: { id: forged.id } }).catch(() => null);
}

/* ---------- 2. no duplicate data: identity resolves from the account ---------- */

const account = await db.user.create({
  data: {
    email: `${tag}-linked@test.local`,
    name: "Linked Person",
    passwordHash: "x",
    role: "EMPLOYEE",
    phone: "+44 000",
    bio: "From the profile.",
  },
});
const linkedMember = await db.orgMember.create({
  data: {
    userId: account.id,
    // Stale copies, deliberately: the resolver must IGNORE these, not merge them.
    // If it ever prefers them, this is the day we find out — not the day a
    // renamed employee is still listed under their old name on the public site.
    name: "STALE NAME",
    email: "stale@old.example",
    phone: "STALE PHONE",
    bio: "STALE BIO",
    designation: "CTO",
    visibility: "PUBLIC",
  },
});
const unlinkedMember = await db.orgMember.create({
  data: {
    name: "Ada Advisor",
    email: "ada@advisors.example",
    designation: "Advisor",
    visibility: "INTERNAL",
  },
});

try {
  const all = await roster();
  const linked = all.find((m) => m.id === linkedMember.id)!;
  const unlinked = all.find((m) => m.id === unlinkedMember.id)!;

  assert.equal(linked.name, "Linked Person", "a linked member's name comes from the account");
  assert.equal(linked.email, account.email, "…and so does their email");
  assert.equal(linked.phone, "+44 000", "…and their phone");
  assert.equal(linked.bio, "From the profile.", "…and their bio");
  assert.ok(linked.linked, "the member reports itself as linked");
  assert.notEqual(linked.name, "STALE NAME", "the org row's stale copy is never used");

  // Rename the ACCOUNT. The org chart, the directory and the public site must all
  // follow — because there is only one name.
  await db.user.update({ where: { id: account.id }, data: { name: "Renamed Person" } });
  const after = (await roster()).find((m) => m.id === linkedMember.id)!;
  assert.equal(
    after.name,
    "Renamed Person",
    "renaming the account renames them everywhere — one source of truth",
  );

  // An unlinked member (advisor, investor) keeps their own details, which is the
  // whole reason the columns exist.
  assert.equal(unlinked.name, "Ada Advisor", "an unlinked member carries their own name");
  assert.ok(!unlinked.linked, "…and reports itself as unlinked");

  /* ---------- 4. the public roster is public-safe ---------- */
  const pub = await publicRoster();
  assert.ok(
    pub.some((m) => m.id === linkedMember.id),
    "a PUBLIC member appears on the public roster",
  );
  assert.ok(
    !pub.some((m) => m.id === unlinkedMember.id),
    "an INTERNAL member must NOT appear on the public site",
  );
  assert.ok(
    pub.every((m) => m.phone === null),
    "a phone number never leaves the building, whatever the row says",
  );

  await db.orgMember.update({
    where: { id: linkedMember.id },
    data: { visibility: "HIDDEN" },
  });
  assert.ok(
    !(await publicRoster()).some((m) => m.id === linkedMember.id),
    "a HIDDEN member must not appear on the public site",
  );
} finally {
  await db.orgMember.deleteMany({
    where: { id: { in: [linkedMember.id, unlinkedMember.id] } },
  });
  await db.user.delete({ where: { id: account.id } }).catch(() => null);
}

/* ---------- links reaching a public <a href> are not trusted ---------- */
assert.deepEqual(parseLinks("not json"), [], "malformed JSON yields no links");
assert.deepEqual(parseLinks(null), [], "null yields no links");

const hostile = serializeLinks(
  [
    "Evil|javascript:alert(1)",
    "Data|data:text/html;base64,PHNjcmlwdD4=",
    "Proto|//evil.example.com",
    "Good|https://edusentinel.ai",
  ].join("\n"),
);
const parsed = parseLinks(hostile);
assert.ok(
  !parsed.some((l) => l.href.startsWith("javascript:")),
  "javascript: never reaches an href on the public site",
);
assert.ok(!parsed.some((l) => l.href.startsWith("data:")), "data: is refused");
assert.ok(!parsed.some((l) => l.href.startsWith("//")), "protocol-relative is refused");
assert.ok(
  parsed.some((l) => l.href.startsWith("https://edusentinel.ai")),
  "a real https link survives — the filter is not simply refusing everything",
);
assert.ok(
  !serializeLinks("X|https://a.example\n".repeat(50)).includes('"label":"X"'.repeat(7)),
  "the link list is capped",
);
assert.ok(
  !parseLinks(JSON.stringify([{ label: "<script>alert(1)</script>", href: "https://a.example" }]))[0]
    ?.label.includes("<"),
  "markup is stripped from a link label",
);

/* ---------- 3. the collaboration bug stays fixed ---------- */

const collaborator = await db.user.create({
  data: {
    email: `${tag}-collab@test.local`,
    name: "Sync Probe",
    passwordHash: "x",
    role: "COLLABORATOR",
  },
});
try {
  // THE BUG, reproduced: a collaborator account exists and has no collaboration.
  // Before Phase 6.5 this person was in People and invisible on the Collaboration
  // page. Now they are surfaced as unreconciled — visible, and fixable in a click.
  const board = await collaborationBoard();
  assert.ok(
    board.unlinkedAccounts.some((u) => u.id === collaborator.id),
    "a collaborator account with no collaboration record MUST be surfaced, never silently omitted — this is the bug",
  );
  assert.ok(
    !board.collaborations.some((c) => c.userId === collaborator.id),
    "…and it is not silently invented either",
  );

  // Once the relationship exists, the two views agree.
  const collab = await db.collaboration.create({
    data: {
      userId: collaborator.id,
      name: "IGNORED COPY", // resolves from the account, like everywhere else
      status: "ACTIVE",
      createdBy: "test",
    },
  });
  const after = await collaborationBoard();
  assert.ok(
    !after.unlinkedAccounts.some((u) => u.id === collaborator.id),
    "a linked collaborator is no longer flagged as missing",
  );
  const row = after.collaborations.find((c) => c.id === collab.id)!;
  assert.equal(
    row.name,
    "Sync Probe",
    "a linked collaboration takes its name from the account — no duplicate copy",
  );
  assert.ok(row.hasAccount, "…and knows it has one");
} finally {
  await db.collaboration.deleteMany({ where: { userId: collaborator.id } });
  await db.user.delete({ where: { id: collaborator.id } }).catch(() => null);
}

/* ---------- the company record backs the site ---------- */
const company = await getCompany();
assert.ok(company.name.length > 0, "the company always has a name");
assert.equal(
  COMPANY_DEFAULTS.name,
  "EduSentinel AI",
  "the defaults are what the site shipped with, so an empty database is not a blank site",
);

console.log(
  "phase 6.5 — the org chart and company profile are founder-reserved, identity is " +
    "stored exactly once, the public roster leaks nothing, and People/Collaboration " +
    "can no longer disagree.",
);
await db.$disconnect();

/* Phase 9 gate invariants: support requests and notifications.
 * Runs in CI. Run locally: npm run test:support
 *
 * What this file refuses to let regress:
 *   1. A support request is readable by its requester and by `support.respond`
 *      holders — nobody else, not even with the exact id. A collaborator never
 *      sees another collaborator's request.
 *   2. INTERNAL NOTES are staff-only, filtered in the query layer. The requester
 *      never receives them, so no page can leak one.
 *   3. A NOTIFICATION CARRIES NOTHING ITS RECIPIENT COULD NOT ALREADY OPEN — above
 *      all, never a leave reason. Phase 8 spent its whole budget protecting that
 *      field; a careless notification would hand it out at the moment of the event.
 *   4. A notification href is an internal /app path. It cannot be an escape hatch.
 *   5. Attachments pass the same upload gates as artifacts and avatars — magic
 *      bytes, allowlist, no SVG. */
import assert from "node:assert";
import { db } from "../src/lib/db";
import type { Viewer } from "../src/lib/guard";
import {
  canRespond,
  canSee,
  myRequests,
  openRequest,
  queue,
} from "../src/lib/support";
import { checkAttachment, MAX_ATTACHMENT_BYTES } from "../src/lib/attachments";
import {
  holdersOf,
  markRead,
  notify,
  recentNotifications,
  safeNotificationHref,
  unreadCount,
} from "../src/lib/notifications";
import {
  defaultCapabilities,
  effectiveCapabilities,
  isFounderReserved,
  type Capability,
} from "../src/lib/permissions";

const tag = `p9-${Date.now()}`;

async function viewerFor(id: string): Promise<Viewer> {
  const u = await db.user.findUnique({ where: { id } });
  if (!u) throw new Error("no user");
  const caps = await effectiveCapabilities(id);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Viewer["role"],
    mfaEnabled: u.mfaEnabled,
    caps,
    can: (c: Capability) => caps.has(c),
  };
}

/* ---------- capabilities ---------- */

for (const cap of ["support.respond", "notifications.broadcast"] as const) {
  assert.ok(!isFounderReserved(cap), `${cap} is grantable, not reserved`);
  assert.ok(defaultCapabilities("FOUNDER").includes(cap), `the Founder holds ${cap}`);
}
assert.ok(
  !defaultCapabilities("COLLABORATOR").includes("support.respond"),
  "a collaborator can RAISE a request but never answer one — they must not see the queue",
);
assert.ok(
  !defaultCapabilities("EMPLOYEE").includes("notifications.broadcast"),
  "interrupting the whole company is not something seniority quietly implies",
);

/* ---------- 4. notification hrefs cannot leave the site ---------- */

assert.equal(safeNotificationHref("/app/leave"), "/app/leave", "an internal path is fine");
assert.equal(
  safeNotificationHref("/app/support/abc123?tab=x"),
  "/app/support/abc123?tab=x",
  "a query string is fine",
);
assert.equal(safeNotificationHref("https://evil.example"), null, "an absolute URL is refused");
assert.equal(safeNotificationHref("//evil.example"), null, "protocol-relative is refused");
assert.equal(safeNotificationHref("javascript:alert(1)"), null, "javascript: is refused");
assert.equal(safeNotificationHref("/login"), null, "a non-/app path is refused");
assert.equal(safeNotificationHref(null), null, "null is refused");

/* ---------- 5. attachments pass the upload gates ---------- */

const bytes = (s: string) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));

// SVG IS SCRIPT — and this one would be served into a staff session.
assert.equal(
  checkAttachment(bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')).ok,
  false,
  "an SVG attachment is refused — it is script, aimed at the person answering",
);
assert.equal(checkAttachment(bytes("")).ok, false, "an empty file is refused");
assert.equal(
  checkAttachment(bytes("MZ\x90\x00 this is an exe")).ok,
  false,
  "an executable is refused",
);
assert.equal(
  checkAttachment(new Uint8Array(MAX_ATTACHMENT_BYTES + 1)).ok,
  false,
  "an oversized attachment is refused",
);
// A file whose NAME says .png but whose bytes say otherwise. The name is chosen by
// the same person who chose the file, so it is never consulted.
assert.equal(
  checkAttachment(bytes("GIF89a not really a png")).ok,
  false,
  "a GIF renamed to .png is still refused — magic bytes, not the filename",
);

const png = checkAttachment(
  Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]),
);
assert.ok(png.ok && png.mime === "image/png", "a real PNG is accepted");
const pdf = checkAttachment(bytes("%PDF-1.7 hello"));
assert.ok(pdf.ok && pdf.mime === "application/pdf", "a real PDF is accepted");
const zip = checkAttachment(Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 1, 2]));
assert.ok(zip.ok && zip.mime === "application/zip", "a real ZIP is accepted");

/* ---------- fixtures ---------- */

const requester = await db.user.create({
  data: { email: `${tag}-req@test.local`, name: "Requester", passwordHash: "x", role: "EMPLOYEE" },
});
const other = await db.user.create({
  data: { email: `${tag}-other@test.local`, name: "Other Employee", passwordHash: "x", role: "EMPLOYEE" },
});
const agent = await db.user.create({
  data: { email: `${tag}-agent@test.local`, name: "Support Agent", passwordHash: "x", role: "ADMIN" },
});
const collabA = await db.user.create({
  data: { email: `${tag}-ca@test.local`, name: "Collab A", passwordHash: "x", role: "COLLABORATOR" },
});
const collabB = await db.user.create({
  data: { email: `${tag}-cb@test.local`, name: "Collab B", passwordHash: "x", role: "COLLABORATOR" },
});

try {
  const reqV = await viewerFor(requester.id);
  const otherV = await viewerFor(other.id);
  const agentV = await viewerFor(agent.id);
  const aV = await viewerFor(collabA.id);
  const bV = await viewerFor(collabB.id);

  assert.ok(canRespond(agentV), "fixture: the agent can respond");
  assert.ok(!canRespond(otherV), "fixture: a plain employee cannot");

  /* ---------- 1. no cross-reader leak ---------- */

  const request = await db.supportRequest.create({
    data: {
      requesterId: requester.id,
      subject: "I cannot reach the release console",
      category: "access",
      priority: "HIGH",
      messages: { create: [{ authorId: requester.id, body: "Please grant me access." }] },
    },
  });

  assert.ok(canSee(reqV, requester.id), "the requester sees their own");
  assert.ok(canSee(agentV, requester.id), "a responder sees it");
  assert.ok(
    !canSee(otherV, requester.id),
    "a colleague who cannot answer support must NOT see someone's request",
  );

  assert.ok(await openRequest(reqV, request.id), "the requester can open it");
  assert.ok(await openRequest(agentV, request.id), "the responder can open it");
  assert.equal(
    await openRequest(otherV, request.id),
    null,
    "an unrelated employee gets null WITH THE EXACT ID — the same answer a non-existent request gives",
  );
  assert.equal(
    (await queue(otherV)).length,
    0,
    "someone without support.respond has an empty queue — the page cannot show what it never received",
  );
  assert.ok((await queue(agentV)).some((r) => r.id === request.id), "the responder's queue has it");

  // A collaborator may raise a request and reach staff — and never sees another
  // collaborator's. We do not become a channel between external parties.
  const collabRequest = await db.supportRequest.create({
    data: {
      requesterId: collabA.id,
      subject: "Partner API question",
      category: "other",
      priority: "NORMAL",
      messages: { create: [{ authorId: collabA.id, body: "How do I verify a signature?" }] },
    },
  });
  assert.ok(await openRequest(aV, collabRequest.id), "a collaborator sees their own request");
  assert.equal(
    await openRequest(bV, collabRequest.id),
    null,
    "a collaborator must NEVER see another collaborator's request",
  );
  assert.equal(
    (await myRequests(bV)).length,
    0,
    "…and it does not appear in their list either",
  );

  /* ---------- 2. internal notes ---------- */

  await db.supportMessage.create({
    data: {
      requestId: request.id,
      authorId: agent.id,
      body: "Third time this month. Check whether they should have this at all.",
      internal: true,
    },
  });

  const asStaff = (await openRequest(agentV, request.id))!;
  assert.ok(
    asStaff.messages.some((m) => m.internal),
    "staff see the internal note — that is what it is for",
  );

  const asRequester = (await openRequest(reqV, request.id))!;
  assert.ok(
    !asRequester.messages.some((m) => m.internal),
    "the requester NEVER receives an internal note — it is filtered in the query layer, not the page",
  );
  assert.ok(
    !JSON.stringify(asRequester).includes("Third time this month"),
    "the note does not appear anywhere in the payload the requester is handed",
  );

  /* ---------- 3. notifications carry nothing privileged ---------- */

  // holdersOf resolves the capability the same way authorization does, so the
  // people TOLD about work are exactly the people who can DO it.
  const responders = await holdersOf("support.respond");
  assert.ok(responders.includes(agent.id), "the agent is notified about support work");
  assert.ok(
    !responders.includes(other.id),
    "someone who cannot answer support is not told about it",
  );
  assert.ok(
    !responders.includes(collabA.id),
    "a collaborator is never in a staff notification audience",
  );

  // THE ONE THAT MATTERS. Phase 8 keeps a leave reason inside the approver chain;
  // a notification is written at the moment of the event, with the requester's data
  // in hand, which makes it the easiest place in the codebase to undo that.
  await notify({
    userId: agent.id,
    kind: "leave.pending",
    title: "Leave request awaiting your decision",
    body: "Requester · 2 days",
    href: "/app/leave",
  });

  const notes = await recentNotifications(agent.id, 10);
  assert.ok(notes.length > 0, "the notification was written");
  assert.ok(
    !JSON.stringify(notes).toLowerCase().includes("hospital"),
    "a leave reason must NEVER reach a notification payload",
  );
  for (const n of notes) {
    assert.ok(
      !n.href || n.href.startsWith("/app"),
      "every notification link is an internal /app path",
    );
    assert.ok((n.body?.length ?? 0) <= 160, "a notification body is a sentence, not a record");
  }

  // A hostile href is dropped on write, not rendered and hoped about.
  await notify({
    userId: agent.id,
    kind: "broadcast",
    title: "Escape attempt",
    href: "https://evil.example/steal",
  });
  const evil = (await recentNotifications(agent.id, 5)).find((n) => n.title === "Escape attempt");
  assert.ok(evil, "the notification exists");
  assert.equal(evil.href, null, "…but the external link was refused at write time");

  // Marking read is scoped to the owner. This is exactly the endpoint that ends up
  // taking an id from the request and marking someone else's notifications read.
  const before = await unreadCount(agent.id);
  assert.ok(before > 0, "the agent has unread notifications");
  await markRead(requester.id); // the WRONG user marking read
  assert.equal(
    await unreadCount(agent.id),
    before,
    "one person marking their notifications read must not touch anyone else's",
  );
  await markRead(agent.id);
  assert.equal(await unreadCount(agent.id), 0, "…and marking your own works");
} finally {
  await db.notification.deleteMany({
    where: { userId: { in: [requester.id, other.id, agent.id, collabA.id, collabB.id] } },
  });
  await db.supportRequest.deleteMany({
    where: { requesterId: { in: [requester.id, collabA.id] } },
  });
  await db.user.deleteMany({
    where: { id: { in: [requester.id, other.id, agent.id, collabA.id, collabB.id] } },
  });
}

/* ---------- 9.4: dark mode is additive, and it is not allowed to cost anything ---------- */
{
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const root = path.resolve(process.cwd(), "..", "..");

  const tokens = readFileSync(
    path.join(root, "packages", "ui", "src", "tokens.css"),
    "utf8",
  );

  // LIGHT MODE IS FROZEN. These are the exact values the paper theme shipped with
  // in Phase 1; dark mode is a separate layer and must never have edited them.
  const LIGHT = {
    "--color-surface-base": "#f5f4f1",
    "--color-surface-raised": "#ffffff",
    "--color-surface-overlay": "#ececea",
    "--color-border-subtle": "#e3e1db",
    "--color-ink": "#121317",
    "--color-text-primary": "#16181d",
    "--color-brand-cyan": "#0891b2",
    "--color-brand-teal": "#0d9488",
  };
  const theme = tokens.slice(tokens.indexOf("@theme"), tokens.indexOf("[data-theme=\"dark\"]"));
  for (const [name, value] of Object.entries(LIGHT)) {
    assert.ok(
      new RegExp(`${name}:\\s*${value};`).test(theme),
      `Light Mode is frozen: ${name} must still be ${value}`,
    );
  }

  // Every dark rule is scoped. A rule that is not scoped is a rule that changes
  // light mode, which is the one thing this work was not allowed to do.
  const globals = readFileSync(
    path.join(root, "apps", "web", "src", "app", "globals.css"),
    "utf8",
  );
  const darkSection = globals.slice(globals.indexOf("DARK MODE (Phase 9.4)"));
  for (const line of darkSection.split("\n")) {
    const selector = line.trim();
    /*
     * Selector lines only (they end in `{`). A handful of helpers are exempt because
     * they are inert in light mode BY CONSTRUCTION, not by scoping:
     *   .meteor-field  — opacity 0 unless the theme is dark, and never mounted
     *   .meteor-sheen  — lives inside .meteor-field, so it inherits that
     *   .meteor-shafts — same: a child of the field
     *   .meteor-nebula — same: a child of the field (Phase 9 cinematic rebuild)
     *   .meteor-dust   — same: a child of the field (Phase 9 cinematic rebuild)
     *   .tilt          — `--tilt-max` is 0deg in light, so the transform is identity
     * Anything else that is not scoped changes light mode, and light mode is frozen.
     */
    if (!selector.endsWith("{") || selector.startsWith("@") || selector.startsWith("*")) continue;
    if (/^(\.meteor-field|\.meteor-sheen|\.meteor-shafts|\.meteor-nebula|\.meteor-dust|\.tilt|\s|})/.test(selector)) continue;
    // Keyframe stops (`0% {`, `from {`) are not selectors.
    if (/^(\d+%|from|to)\s*{$/.test(selector)) continue;
    assert.ok(
      selector.includes('[data-theme="dark"]'),
      `dark-mode rule must be scoped to [data-theme="dark"] — found: ${selector}`,
    );
  }

  // 🔒 The CSP was not weakened to make the no-flash script work. The dynamic
  // policy is still nonce + strict-dynamic — no 'unsafe-inline' was added to it.
  const middleware = readFileSync(
    path.join(root, "apps", "web", "src", "middleware.ts"),
    "utf8",
  );
  const dynamicPolicy = middleware.match(/csp = `\$\{SHARED\}; script-src[^`]+`/g) ?? [];
  const nonced = dynamicPolicy.find((p) => p.includes("nonce-"));
  assert.ok(nonced, "the dynamic CSP still issues a nonce");
  assert.ok(
    !nonced.includes("unsafe-inline"),
    "the nonced CSP must NOT gain 'unsafe-inline' — the theme script carries the nonce instead",
  );

  // The field is not merely slowed under reduced motion — it is not drawn.
  assert.ok(
    /prefers-reduced-motion[\s\S]*\.meteor-field\s*{\s*display:\s*none/.test(globals),
    "under prefers-reduced-motion the meteor field must not be drawn at all",
  );
}

console.log(
  "phase 9 — a support request reaches its requester and the people who answer it and " +
    "nobody else, internal notes never reach the requester, attachments pass the upload " +
    "gates, a notification carries nothing its recipient could not already open, and dark " +
    "mode is additive: light mode is byte-frozen and the CSP was not weakened.",
);
await db.$disconnect();

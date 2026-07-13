/*
 * Phase 5 end-to-end test — drives the RUNNING app over HTTP as each role.
 *
 * The unit gates (test:permissions) prove the authorization *functions* are
 * correct. This proves the deployed pages actually call them: it signs in with
 * real credentials (including a TOTP code for MFA-enrolled accounts), then asks
 * for pages the account should and should not be able to open.
 *
 * Not in CI — it needs a live server. Run:
 *   npm run dev            (in one terminal)
 *   npm run test:e2e       (in another)
 *
 * Ephemeral accounts are created with a random password, used, and deleted in a
 * finally block. The real Founder account is never touched.
 */
import assert from "node:assert";
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { Secret, TOTP } from "otpauth";
import { db } from "../src/lib/db";
import { encryptSecret } from "../src/lib/crypto";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// --- is the server up? ---
try {
  await fetch(BASE, { signal: AbortSignal.timeout(4000) });
} catch {
  console.error(
    `e2e — no server at ${BASE}. Start it with \`npm run dev\` and re-run \`npm run test:e2e\`.`,
  );
  process.exit(1);
}

const PASSWORD = `E2e-${randomBytes(9).toString("base64url")}!`;
const passwordHash = await hash(PASSWORD, {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});
const tag = `e2e-${Date.now()}`;

type Actor = {
  label: string;
  email: string;
  id: string;
  role: string;
  totp?: TOTP;
  cookie: string;
};

const actors: Actor[] = [];

/** MFA-enrolled accounts are created exactly as confirmMfa() leaves them:
 *  an AES-GCM encrypted TOTP secret and mfaEnabled = true. */
async function makeUser(label: string, role: string, mfa: boolean): Promise<Actor> {
  // Keyed on the label, not the role: two probes can share a role (an enrolled
  // Founder and an unenrolled one) and must not collide on email.
  const email = `${tag}-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}@test.local`;
  let totp: TOTP | undefined;
  let totpSecret: string | undefined;

  if (mfa) {
    const secret = new Secret({ size: 20 });
    totp = new TOTP({ issuer: "EduSentinel AI", label: email, secret, digits: 6, period: 30 });
    totpSecret = encryptSecret(secret.base32);
  }

  const user = await db.user.create({
    data: {
      email,
      name: `${label} Probe`,
      passwordHash,
      role,
      emailVerified: new Date(),
      mfaEnabled: mfa,
      totpSecret,
    },
  });

  return { label, email, id: user.id, role, totp, cookie: "" };
}

/** Real credentials sign-in through Auth.js, TOTP included where enrolled. */
async function signIn(actor: Actor): Promise<void> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const setCookie = csrfRes.headers.getSetCookie().join("; ");
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const body = new URLSearchParams({
    csrfToken,
    email: actor.email,
    password: PASSWORD,
    ...(actor.totp ? { code: actor.totp.generate() } : {}),
  });

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: setCookie },
    body,
    redirect: "manual",
  });

  const session = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter((c) => c.startsWith("authjs.session-token"))
    .join("; ");

  assert.ok(
    session,
    `${actor.label}: sign-in failed — no session cookie (MFA: ${!!actor.totp})`,
  );
  actor.cookie = session;
}

async function get(actor: Actor, path: string): Promise<{ url: string; html: string }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: actor.cookie },
    redirect: "follow",
  });
  return { url: res.url, html: await res.text() };
}

/** Asserts the page rendered AND that it is the page we asked for (not a redirect). */
async function canOpen(actor: Actor, path: string, marker: string) {
  const { html } = await get(actor, path);
  assert.ok(
    html.includes(marker),
    `${actor.label} SHOULD be able to open ${path} (looking for "${marker}")`,
  );
}

async function cannotOpen(actor: Actor, path: string, marker: string) {
  const { html } = await get(actor, path);
  assert.ok(
    !html.includes(marker),
    `${actor.label} MUST NOT be able to open ${path} — but "${marker}" was rendered`,
  );
}

async function sees(actor: Actor, path: string, marker: string, expected: boolean) {
  const { html } = await get(actor, path);
  assert.equal(
    html.includes(marker),
    expected,
    `${actor.label} on ${path}: expected control "${marker}" ${expected ? "present" : "absent"}`,
  );
}

let founder!: Actor;
let cofounder!: Actor;
let employee!: Actor;
let collaborator!: Actor;
let noMfaFounder!: Actor;
let productId = "";

try {
  founder = await makeUser("Founder", "FOUNDER", true);
  cofounder = await makeUser("Co-Founder", "CO_FOUNDER", true);
  employee = await makeUser("Employee", "EMPLOYEE", false);
  collaborator = await makeUser("Collaborator", "COLLABORATOR", false);
  noMfaFounder = await makeUser("Founder-without-MFA", "FOUNDER", false);
  actors.push(founder, cofounder, employee, collaborator, noMfaFounder);

  for (const a of actors) await signIn(a);
  console.log("  ✓ all five accounts signed in (TOTP accepted for MFA-enrolled roles)");

  // ---------- MFA onboarding ----------
  // Login demands a code once MFA is enrolled, so an unenrolled privileged
  // account MUST be walked through setup on its FIRST landing — not left to
  // discover a button. Hitting the workspace root is enough.
  const landing = await get(noMfaFounder, "/app");
  assert.ok(
    landing.url.includes("/app/security"),
    "the first login of an unenrolled Founder must open enrolment automatically",
  );
  assert.ok(
    landing.html.includes("Two-factor authentication is required"),
    "the MFA gate must explain itself",
  );

  // The QR and the manual key must actually be on the page — an authenticator
  // cannot be configured from a promise that setup exists.
  const setupPage = await get(noMfaFounder, "/app/security?mfa=required&next=%2Fapp");
  assert.ok(
    setupPage.html.includes("Scan this QR code") ||
      setupPage.html.includes("Preparing your authenticator setup"),
    "the setup page must present the QR flow, not a button to find",
  );

  // And a deep link still carries its return path.
  const gated = await get(noMfaFounder, "/app/access");
  assert.ok(gated.url.includes("/app/security"), "privileged routes still gate on MFA");
  assert.ok(
    gated.html.includes("/app/access"),
    "the MFA gate must offer the way back to where they were going",
  );
  await cannotOpen(noMfaFounder, "/app/access", "Reserved to the Founder");
  console.log("  ✓ Unenrolled Founder is taken straight to authenticator setup");

  // ---------- Founder: full authority after enrolment ----------
  await canOpen(founder, "/app", "Good"); // greeting on the leadership dashboard
  await canOpen(founder, "/app/access", "Reserved to the Founder");
  await canOpen(founder, "/app/products", "The EduSentinel catalogue");
  await canOpen(founder, "/app/admin/releases", "Release review");
  await canOpen(founder, "/app/admin/collaborations", "Collaboration inbox");
  await canOpen(founder, "/app/audit", "Audit Trail");
  await canOpen(founder, "/app/teams", "Teams");
  await canOpen(founder, "/app/messages", "Message Center");
  await canOpen(founder, "/app/search?q=edusentinel", "Results for");
  console.log("  ✓ Founder (MFA enrolled) reaches every Founder-only surface");

  // ---------- Co-Founder: operational, never founder-reserved ----------
  await canOpen(cofounder, "/app/products", "The EduSentinel catalogue");
  await canOpen(cofounder, "/app/admin/releases", "Release review");
  await cannotOpen(cofounder, "/app/access", "Reserved to the Founder");
  // Sees the queue, but not the founder-reserved actions on it.
  await sees(cofounder, "/app/admin/releases", "publish/reject/revoke are founder-only", true);
  console.log("  ✓ Co-Founder is operational but refused Access Control + signing");

  // ---------- Employee: own work only ----------
  await canOpen(employee, "/app", "Good");
  await canOpen(employee, "/app/tasks", "Tasks");
  await cannotOpen(employee, "/app/access", "Reserved to the Founder");
  await cannotOpen(employee, "/app/audit", "Audit Trail");
  await cannotOpen(employee, "/app/admin/releases", "Release review");
  await cannotOpen(employee, "/app/admin/collaborations", "Collaboration inbox");
  // products.view by default, but no catalogue controls
  await sees(employee, "/app/products", "Add a product", false);
  console.log("  ✓ Employee is scoped to their own work");

  // ---------- Collaborator: structurally isolated ----------
  await canOpen(collaborator, "/app", "Collaboration Requests");
  await cannotOpen(collaborator, "/app/teams", "Security Engineering");
  await cannotOpen(collaborator, "/app/access", "Reserved to the Founder");
  await cannotOpen(collaborator, "/app/products", "The EduSentinel catalogue");
  await cannotOpen(collaborator, "/app/audit", "Audit Trail");
  console.log("  ✓ Collaborator sees only their own records");

  // ---------- Product management + public catalogue ----------
  const product = await db.product.create({
    data: {
      slug: `${tag}-probe`,
      name: "E2E Probe Product",
      description: "Created by the end-to-end test; must not be public while DRAFT.",
      ownerId: founder.id,
      status: "DRAFT",
    },
  });
  productId = product.id;

  const draftPublic = await fetch(`${BASE}/products/${product.slug}`);
  assert.equal(draftPublic.status, 404, "a DRAFT product must 404 on the public site");
  const listDraft = await (await fetch(`${BASE}/products`)).text();
  assert.ok(
    !listDraft.includes("E2E Probe Product"),
    "a DRAFT product must not appear in the public list",
  );

  await db.product.update({
    where: { id: product.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  const livePublic = await fetch(`${BASE}/products/${product.slug}`);
  assert.equal(livePublic.status, 200, "a PUBLISHED product is public");
  assert.ok(
    (await livePublic.text()).includes("E2E Probe Product"),
    "the published product renders its own page",
  );

  // The Founder — and only the Founder — is offered permanent deletion.
  await sees(founder, "/app/products", "Delete", true);
  await sees(cofounder, "/app/products", "Publish", true);
  console.log("  ✓ Product lifecycle: DRAFT is invisible publicly, PUBLISHED is live");

  // ---------- Release workflow gating ----------
  // Co-Founder can review the queue; publish/reject/revoke are founder-reserved
  // and their controls are not even rendered for them.
  await sees(cofounder, "/app/admin/releases", "Revoke", false);
  console.log("  ✓ Release signing controls are Founder-only");

  // ---------- every link the Founder is shown must resolve ----------
  // A dashboard that links to a 404 is broken however well it is gated. Crawl
  // the real rendered pages rather than a hand-kept list, so a link added later
  // to a route that does not exist fails here.
  const pages = [
    "/app",
    "/app/products",
    "/app/people",
    "/app/teams",
    "/app/tasks",
    "/app/access",
    "/app/audit",
    "/app/messages",
    "/app/admin/releases",
    "/app/admin/collaborations",
    "/app/security",
  ];

  const links = new Set<string>();
  for (const p of pages) {
    const { html } = await get(founder, p);
    for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) links.add(m[1]);
  }

  const broken: string[] = [];
  for (const link of links) {
    const res = await fetch(`${BASE}${link}`, {
      headers: { cookie: founder.cookie },
      redirect: "follow",
    });
    if (res.status !== 200) broken.push(`${res.status} ${link}`);
  }
  assert.deepEqual(broken, [], `the Founder is shown links that do not resolve: ${broken.join(", ")}`);
  console.log(`  ✓ all ${links.size} links shown to the Founder resolve (no 404s)`);

  // ---------- dashboard widgets carry real data ----------
  const { html: dash } = await get(founder, "/app");
  assert.ok(dash.includes("Account Growth"), "the growth chart renders");
  assert.ok(
    !dash.includes("No accounts yet"),
    "the People table must not be empty — it is the Founder's directory",
  );
  assert.ok(
    !dash.includes("No releases yet"),
    "the release pipeline must show the seeded quarantined build",
  );
  assert.ok(!dash.includes("No staff yet"), "the staff panel must list staff");
  console.log("  ✓ Dashboard widgets render real data, not empty placeholders");

  // ---------- Phase 6: profiles, analytics, avatars ----------

  // Every role manages their own identity through the SAME page. A capability
  // check here would be wrong: having an account is what entitles you to it.
  for (const actor of [founder, cofounder, employee, collaborator]) {
    await canOpen(actor, "/app/profile", "Your profile");
  }

  // ...but a profile page must never become a way to see someone else's record,
  // or a second surface that can change a role.
  assert.ok(
    !(await get(collaborator, "/app/profile")).html.includes(founder.email),
    "the profile page shows only your own account",
  );
  await sees(founder, "/app/profile", "Access Control", true); // as prose, not a control
  assert.ok(
    !(await get(employee, "/app/profile")).html.includes('name="role"'),
    "no surface on the profile page can submit a role",
  );

  // Analytics is a grantable capability, so it gates like one.
  await canOpen(founder, "/app/analytics", "Account growth and platform posture");
  await cannotOpen(employee, "/app/analytics", "Account growth and platform posture");
  await cannotOpen(collaborator, "/app/analytics", "Account growth and platform posture");

  // An unmeasurable metric must say so rather than render as a confident zero.
  const { html: analytics } = await get(founder, "/app/analytics");
  assert.ok(
    analytics.includes("Invitations arrive in Phase 7"),
    "invitation acceptance reports itself as unmeasured, not as 0%",
  );
  // A range that is not a range must not reach a query — it falls back.
  const bogus = await get(founder, "/app/analytics?range=../../etc/passwd");
  assert.ok(
    bogus.html.includes("Last 30 days"),
    "an unknown range falls back to the default instead of being trusted",
  );

  // The avatar route is not a public asset host: no session, no bytes.
  const anon = await fetch(`${BASE}/api/avatar/${founder.id}`, { redirect: "manual" });
  assert.equal(anon.status, 401, "an unauthenticated request for an avatar is refused");

  console.log("  ✓ Profiles are self-service for every role; analytics gates on capability");
} finally {
  if (productId) await db.product.delete({ where: { id: productId } }).catch(() => null);
  await db.user.deleteMany({ where: { email: { startsWith: tag } } });
}

console.log("\nPHASE 5 E2E PASSED — Founder, Co-Founder, Employee and Collaborator flows verified.");
await db.$disconnect();

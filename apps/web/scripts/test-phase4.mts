/* Phase 4 gate invariants: output sanitization, bot defense, moderation.
 * Runs in CI. Run locally: npm run test:content */
import assert from "node:assert";
import { sanitizeUserText, sanitizeLine } from "../src/lib/sanitize";
import { issueFormToken, checkHuman } from "../src/lib/bot-defense";
import { db } from "../src/lib/db";

// ---------- output sanitization (user-influenced content) ----------
const xss = '<script>alert("x")</script>';
const clean = sanitizeUserText(xss);
assert.ok(!clean.includes("<"), "angle brackets must not survive");
assert.ok(!clean.includes(">"), "angle brackets must not survive");
assert.ok(!/<script/i.test(clean), "no script tag can survive");

const img = '<img src=x onerror="steal()">';
assert.ok(!sanitizeUserText(img).includes("<img"), "img tag neutralized");

assert.ok(
  !/javascript:/i.test(sanitizeUserText("javascript:alert(1)")),
  "javascript: scheme neutralized",
);
assert.ok(
  !/data:/i.test(sanitizeUserText("data:text/html;base64,PHNjcmlwdD4=")),
  "data: scheme neutralized",
);
assert.ok(
  !/vbscript:/i.test(sanitizeUserText("vbscript:msgbox")),
  "vbscript: scheme neutralized",
);

// control characters stripped; tab/newline preserved
const withControls = "a" + String.fromCharCode(0) + String.fromCharCode(27) + "b\nc\td";
const s = sanitizeUserText(withControls);
assert.ok(!s.includes(String.fromCharCode(0)), "NUL stripped");
assert.ok(!s.includes(String.fromCharCode(27)), "ESC stripped");
assert.ok(s.includes("\n") && s.includes("\t"), "tab/newline preserved");

// length caps + single-line collapse
assert.equal(sanitizeUserText("x".repeat(5000), 4000).length, 4000, "long input capped");
assert.ok(!sanitizeLine("a\nb\nc").includes("\n"), "sanitizeLine collapses newlines");
assert.equal(sanitizeUserText(null), "", "non-strings rejected safely");
assert.equal(sanitizeUserText(123), "", "non-strings rejected safely");
console.log("Sanitization OK (tags, schemes, control chars, caps)");

// ---------- bot defense ----------
function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const goodToken = issueFormToken(Date.now() - 5_000); // filled 5s ago
assert.ok(checkHuman(fd({ formToken: goodToken })).ok, "human submission accepted");

const honeyed = checkHuman(fd({ formToken: goodToken, website: "spam.example" }));
assert.ok(!honeyed.ok && honeyed.reason === "honeypot", "honeypot catches bots");

const tooFast = checkHuman(fd({ formToken: issueFormToken(Date.now()) }));
assert.ok(!tooFast.ok && tooFast.reason === "too-fast", "instant submissions rejected");

const stale = checkHuman(fd({ formToken: issueFormToken(Date.now() - 3 * 60 * 60_000) }));
assert.ok(!stale.ok && stale.reason === "stale", "stale forms rejected");

assert.ok(!checkHuman(fd({})).ok, "missing token rejected");
const forged = checkHuman(fd({ formToken: `${Date.now() - 5000}.forgedsignature` }));
assert.ok(!forged.ok && forged.reason === "bad-token", "forged token rejected");
console.log("Bot defense OK (honeypot, timing, forged/stale/missing tokens)");

// ---------- moderation lifecycle ----------
const req = await db.collaborationRequest.create({
  data: {
    name: sanitizeLine("Test <b>User</b>"),
    email: "p4test@test.local",
    kind: "partnership",
    message: sanitizeUserText("Hello " + xss),
    status: "PENDING",
  },
});
assert.ok(!req.name.includes("<"), "stored name is sanitized at rest");
assert.ok(!req.message.includes("<script"), "stored message is sanitized at rest");
assert.equal(req.status, "PENDING", "submissions start pending (never auto-published)");

await db.collaborationRequest.update({
  where: { id: req.id },
  data: { status: "SPAM", reviewedAt: new Date() },
});
const moderated = await db.collaborationRequest.findUnique({ where: { id: req.id } });
assert.equal(moderated?.status, "SPAM");

const report = await db.abuseReport.create({
  data: { targetType: "collaboration", targetRef: req.id, reason: sanitizeUserText("Spam " + xss) },
});
assert.equal(report.status, "OPEN", "abuse reports start open");
assert.ok(!report.reason.includes("<script"), "report text sanitized at rest");

await db.abuseReport.delete({ where: { id: report.id } });
await db.collaborationRequest.delete({ where: { id: req.id } });
console.log("Moderation lifecycle OK (pending by default, sanitized at rest, abuse reports)");

console.log("\nALL PHASE 4 CHECKS PASSED");
await db.$disconnect();

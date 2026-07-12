/* Phase 3 release-pipeline invariants. Runs in CI on every change.
 * Covers: magic-byte allowlist (R5), ownership scoping (R12), quarantine,
 * ed25519 signing, signed expiring URLs, revocation, scanner publish gate.
 * Run: npm run test:pipeline */
import assert from "node:assert";
import { createHash, randomBytes, createPublicKey, verify as edVerify } from "crypto";
import { writeFile, mkdir, readFile, rm } from "fs/promises";
import path from "path";
import {
  detectArtifactType,
  MAX_ARTIFACT_BYTES,
  signDigest,
  downloadUrl,
  verifyDownloadSig,
  publishBlockedByScan,
} from "../src/lib/artifacts";
import { ownedProduct, ownedRelease, publishedReleases } from "../src/lib/products";
import { db } from "../src/lib/db";

const TAG = "p3test";

// ---------- R5: upload validation ----------
assert.equal(detectArtifactType(Buffer.from([0x4d, 0x5a, 0x90, 0x00])), null, "PE/.exe must be rejected");
assert.equal(detectArtifactType(Buffer.from([0x7f, 0x45, 0x4c, 0x46])), null, "ELF must be rejected");
assert.equal(detectArtifactType(Buffer.from("<script>al")), null, "html/script must be rejected");
assert.equal(detectArtifactType(Buffer.from("%PDF-1.4")), "pdf");
assert.ok(detectArtifactType(Buffer.from([0x50, 0x4b, 0x03, 0x04])), "zip/apk accepted");
assert.ok(detectArtifactType(Buffer.from([0x43, 0x72, 0x32, 0x34])), "crx accepted");
assert.equal(MAX_ARTIFACT_BYTES, 100 * 1024 * 1024);
console.log("R5 magic-byte allowlist OK (exe/elf/html rejected; zip/crx/pdf accepted)");

// ---------- scanner publish gate ----------
assert.ok(publishBlockedByScan("FLAGGED", "production"), "FLAGGED must never publish");
assert.ok(publishBlockedByScan("FLAGGED", "development"), "FLAGGED must never publish, even in dev");
assert.ok(publishBlockedByScan("NO_SCANNER", "production"), "NO_SCANNER must block in production (SN-005)");
assert.ok(!publishBlockedByScan("NO_SCANNER", "development"), "NO_SCANNER allowed in dev only");
assert.ok(!publishBlockedByScan("CLEAN", "production"));
console.log("Scanner publish gate OK (FLAGGED always blocked; NO_SCANNER blocked in production)");

// ---------- signing ----------
const digest = createHash("sha256").update("artifact-bytes").digest("hex");
const signature = signDigest(digest);
const pubPem = await readFile(path.join(process.cwd(), "public", "signing-key.pem"), "utf8");
const pub = createPublicKey(pubPem);
assert.ok(
  edVerify(null, Buffer.from(digest, "hex"), pub, Buffer.from(signature, "base64")),
  "signature must verify with the published public key",
);
const other = createHash("sha256").update("tampered").digest("hex");
assert.ok(
  !edVerify(null, Buffer.from(other, "hex"), pub, Buffer.from(signature, "base64")),
  "signature must not verify for a tampered digest",
);
console.log("Signing OK (verifies with public key; fails on tampered digest)");

// ---------- signed expiring download URLs ----------
const artifactId = "art_" + randomBytes(6).toString("hex");
const q = new URL("http://x" + downloadUrl(artifactId, 60_000)).searchParams;
assert.ok(verifyDownloadSig(artifactId, q.get("exp")!, q.get("sig")!), "valid signed URL");
assert.ok(!verifyDownloadSig(artifactId, q.get("exp")!, "tampered"), "tampered sig rejected");
assert.ok(!verifyDownloadSig("other_artifact", q.get("exp")!, q.get("sig")!), "not reusable across artifacts");
const eq = new URL("http://x" + downloadUrl(artifactId, -1000)).searchParams;
assert.ok(!verifyDownloadSig(artifactId, eq.get("exp")!, eq.get("sig")!), "expired URL rejected");
console.log("Signed expiring URLs OK (tampered/expired/cross-artifact rejected)");

// ---------- ownership scoping (R12) + quarantine + revocation ----------
const owner = await db.user.create({
  data: { email: `${TAG}-owner-${randomBytes(4).toString("hex")}@test.local`, name: "O", passwordHash: "x", role: "ADMIN" },
});
const other2 = await db.user.create({
  data: { email: `${TAG}-other-${randomBytes(4).toString("hex")}@test.local`, name: "X", passwordHash: "x", role: "ADMIN" },
});
const founder = await db.user.create({
  data: { email: `${TAG}-founder-${randomBytes(4).toString("hex")}@test.local`, name: "F", passwordHash: "x", role: "FOUNDER" },
});
const product = await db.product.create({
  data: { slug: `${TAG}-${randomBytes(4).toString("hex")}`, name: "T", description: "pipeline test", ownerId: owner.id },
});

assert.ok(await ownedProduct(product.id, owner.id, "ADMIN"), "owner sees own product");
assert.equal(await ownedProduct(product.id, other2.id, "ADMIN"), null, "R12: other ADMIN cannot reach it");
assert.ok(await ownedProduct(product.id, founder.id, "FOUNDER"), "founder sees all");

const bytes = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), randomBytes(256)]);
const sha = createHash("sha256").update(bytes).digest("hex");
const storageName = `${TAG}-${randomBytes(8).toString("hex")}.bin`;
await mkdir(path.join(process.cwd(), "storage", "quarantine"), { recursive: true });
await writeFile(path.join(process.cwd(), "storage", "quarantine", storageName), bytes);
const release = await db.release.create({
  data: {
    productId: product.id,
    version: "1.0.0",
    createdById: owner.id,
    artifact: { create: { fileName: "t.zip", storageName, size: bytes.length, mime: "application/zip", sha256: sha, scanStatus: "CLEAN" } },
  },
});
assert.equal(release.status, "QUARANTINED", "uploads start quarantined");
assert.equal(
  (await publishedReleases()).filter((r) => r.productId === product.id).length,
  0,
  "quarantined release must not be downloadable",
);
assert.equal(await ownedRelease(release.id, other2.id, "ADMIN"), null, "R12: other ADMIN cannot reach the release");

await db.release.update({ where: { id: release.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
assert.equal((await publishedReleases()).filter((r) => r.productId === product.id).length, 1, "published appears");

await db.release.update({
  where: { id: release.id },
  data: { status: "REVOKED", revokedAt: new Date(), revokeReason: "test" },
});
assert.equal(
  (await publishedReleases()).filter((r) => r.productId === product.id).length,
  0,
  "revoked release must disappear from downloads",
);
console.log("Ownership scoping, quarantine, publish and revocation OK");

// cleanup
await db.artifact.deleteMany({ where: { release: { productId: product.id } } });
await db.release.deleteMany({ where: { productId: product.id } });
await db.product.delete({ where: { id: product.id } });
await db.user.deleteMany({ where: { id: { in: [owner.id, other2.id, founder.id] } } });
await rm(path.join(process.cwd(), "storage", "quarantine", storageName), { force: true });

console.log("\nALL PHASE 3 PIPELINE CHECKS PASSED");
await db.$disconnect();

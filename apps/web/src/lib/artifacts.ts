import { createHmac, timingSafeEqual, sign as edSign, createPrivateKey } from "crypto";

/*
 * Upload validation (R5): allowlisted formats verified by magic bytes —
 * never by extension or client-supplied MIME — plus a hard size cap.
 */
export const MAX_ARTIFACT_BYTES = 100 * 1024 * 1024; // 100 MB

const MAGIC: { label: string; bytes: number[] }[] = [
  { label: "zip/apk/extension", bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK..
  { label: "gzip/tar.gz", bytes: [0x1f, 0x8b] },
  { label: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { label: "chrome-extension", bytes: [0x43, 0x72, 0x32, 0x34] }, // Cr24
];

export function detectArtifactType(head: Uint8Array): string | null {
  for (const m of MAGIC) {
    if (m.bytes.every((b, i) => head[i] === b)) return m.label;
  }
  return null;
}

/*
 * Malware-scan publish gate (R5). FLAGGED never publishes, anywhere.
 * NO_SCANNER (no ClamAV/VirusTotal configured) is tolerated only in
 * development: in production, publishing an unscanned artifact is exactly
 * the failure mode the roadmap forbids, so it is blocked outright.
 * See SECURITY-NOTES SN-005.
 */
export function publishBlockedByScan(
  scanStatus: string,
  env: string | undefined = process.env.NODE_ENV,
): boolean {
  if (scanStatus === "FLAGGED") return true;
  if (scanStatus === "NO_SCANNER" && env === "production") return true;
  return false;
}

/* Release signing (founder-gated): ed25519 over the artifact's sha256.
 * Public key ships at /signing-key.pem for user verification. */
export function signDigest(sha256Hex: string): string {
  const der = process.env.SIGNING_PRIVATE_KEY;
  if (!der) throw new Error("SIGNING_PRIVATE_KEY is not set");
  const key = createPrivateKey({
    key: Buffer.from(der, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return edSign(null, Buffer.from(sha256Hex, "hex"), key).toString("base64");
}

/* Signed expiring download URLs: HMAC over artifact id + expiry. */
function urlKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update("download-url-v1").digest();
}

export function downloadUrl(artifactId: string, ttlMs = 15 * 60_000): string {
  const exp = Date.now() + ttlMs;
  const sig = createHmac("sha256", urlKey())
    .update(`${artifactId}.${exp}`)
    .digest("base64url");
  return `/api/download/${artifactId}?exp=${exp}&sig=${sig}`;
}

export function verifyDownloadSig(
  artifactId: string,
  exp: string,
  sig: string,
): boolean {
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = createHmac("sha256", urlKey())
    .update(`${artifactId}.${exp}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

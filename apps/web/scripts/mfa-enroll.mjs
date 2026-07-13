/*
 * Founder MFA bootstrap.
 *
 * The web flow at /app/security is the normal path and works. This exists for
 * the same reason `db:seed` exists: the Founder is the one account that has to
 * be able to get itself into a working state from the command line, and MFA is
 * mandatory for FOUNDER — so a founder who cannot complete enrolment in the
 * browser is locked out of their own platform.
 *
 * Deliberately narrow:
 *   - it can only ENABLE MFA (a strengthening action), never disable it;
 *   - it cannot grant roles or touch anyone's permissions;
 *   - it will not enable MFA without a valid live code, exactly like the UI;
 *   - every step is written to the audit chain.
 *
 *   npm run mfa:enroll -- <email>            # step 1: print the key to scan
 *   npm run mfa:enroll -- <email> <code>     # step 2: confirm and switch on
 */
import { PrismaClient } from "@prisma/client";
import { Secret, TOTP } from "otpauth";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const db = new PrismaClient();
const [email, code] = process.argv.slice(2);

if (!email) {
  console.error("usage: npm run mfa:enroll -- <email> [6-digit-code]");
  process.exit(1);
}

// Same AES-256-GCM envelope as src/lib/crypto.ts (kept in JS: seeds/scripts run
// outside the Next build). Secrets are never stored in plaintext.
const key = Buffer.from(process.env.MFA_ENC_KEY ?? "", "base64");
if (key.length !== 32) {
  console.error("mfa:enroll — MFA_ENC_KEY must be a base64-encoded 32-byte key.");
  process.exit(1);
}

// Field order is iv.tag.data — it MUST match src/lib/crypto.ts exactly, or the
// app cannot read a secret this script wrote.
function encrypt(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

function decrypt(payload) {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Append to the R7b hash chain (mirrors src/lib/audit.ts). */
async function audit(action, user, detail) {
  const prev = await db.auditLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { hash: true },
  });
  const createdAt = new Date();
  const prevHash = prev?.hash ?? "genesis";
  const hash = createHash("sha256")
    .update([prevHash, action, user.id, detail ?? "", "", "", createdAt.toISOString()].join("|"))
    .digest("hex");
  await db.auditLog.create({
    data: {
      action,
      actorId: user.id,
      actorEmail: user.email,
      detail,
      createdAt,
      prevHash,
      hash,
    },
  });
}

const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
if (!user) {
  console.error(`mfa:enroll — no account for ${email}.`);
  process.exit(1);
}

if (!code) {
  // Step 1 — issue a secret. MFA stays OFF until a live code proves the
  // authenticator actually holds it.
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: "EduSentinel AI",
    label: user.email,
    secret,
    digits: 6,
    period: 30,
  });

  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: encrypt(secret.base32), mfaEnabled: false },
  });
  await audit("user.mfa_setup_started", user, "via mfa:enroll");

  console.log(`\nMFA setup for ${user.email} (${user.role})\n`);
  console.log("Add this to your authenticator app (Google Authenticator, 1Password, Aegis):\n");
  console.log(`  Manual key : ${secret.base32}`);
  console.log(`  otpauth URI: ${totp.toString()}\n`);
  console.log("Then confirm with the 6-digit code it shows:\n");
  console.log(`  npm run mfa:enroll -- ${user.email} <code>\n`);
  console.log("MFA is NOT enabled yet — it switches on only after a valid code.\n");
} else {
  // Step 2 — confirm. Same check as the UI: a live code, or nothing happens.
  if (!user.totpSecret) {
    console.error("mfa:enroll — no pending setup. Run step 1 first (omit the code).");
    process.exit(1);
  }

  const totp = new TOTP({
    issuer: "EduSentinel AI",
    label: user.email,
    secret: Secret.fromBase32(decrypt(user.totpSecret)),
    digits: 6,
    period: 30,
  });

  if (totp.validate({ token: code.replaceAll(" ", ""), window: 1 }) === null) {
    console.error("mfa:enroll — that code didn't match. Check your device clock and try again.");
    process.exit(1);
  }

  await db.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
  await audit("user.mfa_enabled", user, "via mfa:enroll");

  console.log(`\nmfa:enroll — two-factor authentication is ON for ${user.email}.`);
  console.log("Every privileged surface is now open to this account.\n");
}

await db.$disconnect();

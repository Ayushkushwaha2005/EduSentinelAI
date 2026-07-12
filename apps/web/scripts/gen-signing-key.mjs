/*
 * Generate an ed25519 release-signing keypair.
 *   node scripts/gen-signing-key.mjs
 * Prints the base64 PKCS8 private key (put it in SIGNING_PRIVATE_KEY —
 * production: the platform secret manager, never a file) and writes the
 * matching public key to public/signing-key.pem, which users need to
 * verify downloads.
 *
 * In CI this runs to produce a throwaway keypair so pipeline tests can
 * sign without any real key ever leaving the founder's control.
 */
import { generateKeyPairSync } from "crypto";
import { writeFileSync, appendFileSync } from "fs";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const priv = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");

writeFileSync("public/signing-key.pem", publicKey.export({ type: "spki", format: "pem" }));

if (process.env.GITHUB_ENV) {
  appendFileSync(process.env.GITHUB_ENV, `SIGNING_PRIVATE_KEY=${priv}\n`);
  console.log("CI: throwaway signing keypair generated.");
} else {
  console.log("SIGNING_PRIVATE_KEY=" + priv);
  console.log("\nPublic key written to public/signing-key.pem");
  console.log("Store the private key in your secret manager — never commit it.");
}

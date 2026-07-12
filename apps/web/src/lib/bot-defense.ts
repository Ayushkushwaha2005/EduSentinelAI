/*
 * Signup / public-form bot defense (Phase 4 gate).
 *
 * Two privacy-respecting checks — no third-party CAPTCHA, which would be
 * a tracker and would break our no-third-party commitment:
 *
 *  1. Honeypot: a hidden field real users never fill. Bots fill everything.
 *  2. Time-to-submit: a form completed impossibly fast was not typed by a
 *     human. The timestamp is HMAC-signed so it cannot be forged.
 *
 * Both fail closed on tampering, and are combined with the existing
 * per-IP rate limits (R1).
 */
import { createHmac, timingSafeEqual } from "crypto";

const MIN_FILL_MS = 2_000; // faster than this is not a human
const MAX_FORM_AGE_MS = 60 * 60_000; // 1h — stale forms are re-issued

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update("form-token-v1").digest();
}

/** Issue a signed timestamp for a public form (rendered as a hidden field). */
export function issueFormToken(now = Date.now()): string {
  const sig = createHmac("sha256", key()).update(String(now)).digest("base64url");
  return `${now}.${sig}`;
}

export type BotCheck = { ok: true } | { ok: false; reason: string };

export function checkHuman(formData: FormData): BotCheck {
  // 1. honeypot — must be empty
  const honey = formData.get("website");
  if (typeof honey === "string" && honey.trim() !== "") {
    return { ok: false, reason: "honeypot" };
  }

  // 2. signed timing token
  const token = formData.get("formToken");
  if (typeof token !== "string" || !token.includes(".")) {
    return { ok: false, reason: "missing-token" };
  }
  const [tsRaw, sig] = token.split(".");
  const expected = createHmac("sha256", key()).update(tsRaw).digest("base64url");
  const a = Buffer.from(sig ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-token" };
  }
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad-token" };

  const elapsed = Date.now() - ts;
  if (elapsed < MIN_FILL_MS) return { ok: false, reason: "too-fast" };
  if (elapsed > MAX_FORM_AGE_MS) return { ok: false, reason: "stale" };

  return { ok: true };
}

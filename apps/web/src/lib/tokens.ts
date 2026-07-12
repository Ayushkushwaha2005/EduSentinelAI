import { db } from "./db";
import { randomToken, sha256 } from "./crypto";

export type TokenType = "verify-email" | "reset-password";

const TTL: Record<TokenType, number> = {
  "verify-email": 24 * 60 * 60_000, // 24h
  "reset-password": 60 * 60_000, // 1h
};

/** Create a single-use token; returns the plaintext (only the hash is stored). */
export async function createAuthToken(userId: string, type: TokenType) {
  // Invalidate previous outstanding tokens of the same type.
  await db.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = randomToken();
  await db.authToken.create({
    data: {
      tokenHash: sha256(token),
      type,
      userId,
      expiresAt: new Date(Date.now() + TTL[type]),
    },
  });
  return token;
}

/** Consume a token exactly once; returns the userId or null. */
export async function consumeAuthToken(token: string, type: TokenType) {
  const row = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) {
    return null;
  }
  // Atomic single-use claim: only succeeds if still unused.
  const claimed = await db.authToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1 ? row.userId : null;
}

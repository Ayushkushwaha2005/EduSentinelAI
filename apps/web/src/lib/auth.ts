import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { TOTP } from "otpauth";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "./db";
import { audit } from "./audit";
import { decryptSecret } from "./crypto";
import { lockoutMs } from "./rate-limit";
import { ipFrom, isSessionLive, locationFrom, recordSignIn } from "./sessions";

const credentialsSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(256),
  code: z.string().max(12).optional(), // TOTP, when MFA is enabled
});

/* Typed sign-in failures — `code` survives into the caught AuthError so the
 * login action can react (show MFA field, lockout message) without ever
 * revealing which part failed to an attacker beyond what UX requires. */
export class MfaRequiredError extends CredentialsSignin {
  code = "mfa";
}
export class AccountLockedError extends CredentialsSignin {
  code = "locked";
}

export function verifyTotp(encryptedSecret: string, code: string): boolean {
  try {
    const totp = new TOTP({
      secret: decryptSecret(encryptedSecret),
      digits: 6,
      period: 30,
    });
    return totp.validate({ token: code.replaceAll(" ", ""), window: 1 }) !== null;
  } catch {
    return false;
  }
}

function reqContext(request?: Request) {
  return {
    ip:
      request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ??
      undefined,
    userAgent: request?.headers?.get?.("user-agent") ?? undefined,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h sessions
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, code: {} },
      authorize: async (raw, request) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, code } = parsed.data;
        const ctx = reqContext(request);

        const user = await db.user.findUnique({ where: { email } });

        // Progressive lockout (R1) — checked before password work.
        if (user?.lockedUntil && user.lockedUntil > new Date()) {
          await audit("user.login_failed", {
            actorId: user.id,
            detail: "locked",
            ...ctx,
          });
          throw new AccountLockedError();
        }

        // Verify against a dummy hash when the user is missing so response
        // timing does not reveal whether an email is registered.
        const DUMMY_HASH =
          "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
        const ok = await verify(user?.passwordHash ?? DUMMY_HASH, password);

        if (!user || !ok) {
          if (user) {
            const failures = user.failedLogins + 1;
            const lockMs = lockoutMs(failures);
            await db.user.update({
              where: { id: user.id },
              data: {
                failedLogins: failures,
                lockedUntil: lockMs ? new Date(Date.now() + lockMs) : null,
              },
            });
            await audit("user.login_failed", {
              actorId: user.id,
              detail: lockMs ? `password; locked ${lockMs / 1000}s` : "password",
              ...ctx,
            });
          } else {
            await audit("user.login_failed", { detail: `unknown:${email}`, ...ctx });
          }
          return null;
        }

        // MFA (R6): required when enabled; ADMIN/FOUNDER must enable it
        // (enforced at /app/security and the admin surface).
        if (user.mfaEnabled) {
          if (!code) throw new MfaRequiredError();
          if (!user.totpSecret || !verifyTotp(user.totpSecret, code)) {
            await audit("user.login_failed", {
              actorId: user.id,
              detail: "mfa",
              ...ctx,
            });
            throw new MfaRequiredError();
          }
        }

        if (user.failedLogins > 0 || user.lockedUntil) {
          await db.user.update({
            where: { id: user.id },
            data: { failedLogins: 0, lockedUntil: null },
          });
        }
        await audit("user.login", { actorId: user.id, ...ctx });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    /*
     * Session revocation (R2): every token refresh re-checks the account.
     * Bumping user.sessionVersion (password reset, "sign out everywhere",
     * admin action) kills all outstanding sessions; role changes propagate
     * immediately instead of at token expiry.
     */
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        token.sv = (user as { sessionVersion?: number }).sessionVersion ?? 0;

        /*
         * Phase 14 — per-device sessions.
         *
         * A random `sid` is minted here and recorded against the account, which
         * is what makes "sign out THAT device" possible without abandoning the
         * stateless JWT strategy. Everything above is unchanged: this claim is
         * additive, and a token that predates it still validates (see
         * isSessionLive, which treats a missing row as live rather than signing
         * existing users out on deploy).
         *
         * Recording must never be able to block a sign-in — if the write fails,
         * the person still gets their session and simply does not see that
         * device listed.
         */
        const sid = randomUUID();
        token.sid = sid;
        try {
          const h = await headers();
          await recordSignIn({
            userId: user.id as string,
            sid,
            userAgent: h.get("user-agent"),
            ip: ipFrom(h),
            location: locationFrom(h),
          });
        } catch {
          /* never fail a login over telemetry */
        }
        return token;
      }
      if (token.uid) {
        const current = await db.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, sessionVersion: true },
        });
        if (!current || current.sessionVersion !== token.sv) return null;

        /* A revoked device is refused exactly like a stale sessionVersion —
           same mechanism, one device instead of all of them. */
        if (token.sid && !(await isSessionLive(token.sid as string))) return null;

        token.role = current.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        (session.user as { role?: string }).role = token.role as string;
        // Exposed so the sessions page can mark "this device". It is an opaque
        // id, already held by the client in its own cookie.
        (session as { sid?: string }).sid = token.sid as string | undefined;
      }
      return session;
    },
  },
});

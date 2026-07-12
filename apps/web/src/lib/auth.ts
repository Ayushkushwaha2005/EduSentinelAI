import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { TOTP } from "otpauth";
import { z } from "zod";
import { db } from "./db";
import { audit } from "./audit";
import { decryptSecret } from "./crypto";
import { lockoutMs } from "./rate-limit";

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
        return token;
      }
      if (token.uid) {
        const current = await db.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, sessionVersion: true },
        });
        if (!current || current.sessionVersion !== token.sv) return null;
        token.role = current.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});

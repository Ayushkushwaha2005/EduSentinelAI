import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "./db";
import { audit } from "./audit";

const credentialsSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(256),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h sessions
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        // Verify against a dummy hash when the user is missing so response
        // timing does not reveal whether an email is registered.
        const DUMMY_HASH =
          "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
        const ok = await verify(user?.passwordHash ?? DUMMY_HASH, password);
        if (!user || !ok) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
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
  events: {
    async signIn({ user }) {
      await audit("user.login", { actorId: user.id ?? undefined });
    },
  },
});

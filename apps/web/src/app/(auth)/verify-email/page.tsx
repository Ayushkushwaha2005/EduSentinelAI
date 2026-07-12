import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { consumeAuthToken } from "@/lib/tokens";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let ok = false;
  if (token) {
    const userId = await consumeAuthToken(token, "verify-email");
    if (userId) {
      await db.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      });
      const ctx = await requestContext();
      await audit("user.email_verified", { actorId: userId, ...ctx });
      ok = true;
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <LogoMark size={64} />
      <h1 className="mt-6 text-3xl font-medium tracking-[-0.02em]">
        {ok ? "Email verified" : "Link invalid or expired"}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
        {ok
          ? "Your email address is confirmed. You're all set."
          : "This verification link is no longer valid. Sign in and request a new one from your dashboard."}
      </p>
      <Link
        href={ok ? "/app" : "/login"}
        className="mt-8 inline-flex h-11 items-center rounded-control bg-ink px-6 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover"
      >
        {ok ? "Go to dashboard" : "Sign in"}
      </Link>
    </div>
  );
}

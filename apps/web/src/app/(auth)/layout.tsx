import Link from "next/link";
import { headers } from "next/headers";
import { MeteorField } from "@/components/meteors";
import { ThemeScript } from "@/components/theme";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The auth routes are dynamic, so they carry the strict nonced CSP from
  // src/middleware.ts. The theme script takes that nonce rather than asking the
  // policy to allow inline scripts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    /* px-6 on the narrow end, but the sign-in screen's orbit panel wants the full
       width on a large display, so the horizontal padding relaxes at lg (Task 1). */
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 md:py-16 lg:px-10">
      <ThemeScript nonce={nonce} />
      <MeteorField />

      {/* z-10: the field is `position: fixed`, so without a stacking context above
          it the sign-in form would be painted underneath a sky. */}
      <div className="relative z-10 flex w-full flex-col items-center">
        {children}
        <Link
          href="/"
          className="mt-10 text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          ← Back to edusentinel.ai
        </Link>
      </div>
    </div>
  );
}

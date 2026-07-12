import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { LogoWordmark } from "@/components/logo";

export const metadata = { robots: { index: false } };

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/app"); // middleware backstop

  const admin = isAdminRole(session.user.role);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border-subtle bg-surface-raised/60 p-6 md:flex">
        <Link href="/app">
          <LogoWordmark />
        </Link>
        <nav aria-label="App" className="mt-10 flex flex-col gap-1">
          <Link
            href="/app"
            className="rounded-control px-3 py-2 text-[15px] font-medium text-text-primary hover:bg-surface-overlay"
          >
            Overview
          </Link>
          {admin && (
            <Link
              href="/app/products"
              className="rounded-control px-3 py-2 text-[15px] font-medium text-text-primary hover:bg-surface-overlay"
            >
              Products
            </Link>
          )}
          {admin && (
            <Link
              href="/app/admin/releases"
              className="rounded-control px-3 py-2 text-[15px] font-medium text-text-primary hover:bg-surface-overlay"
            >
              Releases
            </Link>
          )}
          <Link
            href="/app/security"
            className="rounded-control px-3 py-2 text-[15px] font-medium text-text-primary hover:bg-surface-overlay"
          >
            Security
          </Link>
          {admin && (
            <Link
              href="/app/admin"
              className="rounded-control px-3 py-2 text-[15px] font-medium text-text-primary hover:bg-surface-overlay"
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="mt-auto border-t border-border-subtle pt-5">
          <p className="truncate text-sm font-medium">{session.user.name}</p>
          <p className="truncate text-sm text-text-muted">{session.user.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="mt-4 h-10 w-full rounded-control bg-surface-overlay text-sm font-medium transition-colors hover:bg-border-subtle"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1">
        <header className="flex h-[64px] items-center justify-between border-b border-border-subtle px-6 md:justify-end">
          <Link href="/app" className="md:hidden">
            <LogoWordmark />
          </Link>
          <span className="rounded-control bg-surface-overlay px-2.5 py-1 text-xs font-medium text-text-secondary">
            {session.user.role}
          </span>
        </header>
        <main className="p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}

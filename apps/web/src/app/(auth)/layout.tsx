import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      {children}
      <Link
        href="/"
        className="mt-10 text-sm text-text-muted transition-colors hover:text-text-secondary"
      >
        ← Back to edusentinel.ai
      </Link>
    </div>
  );
}

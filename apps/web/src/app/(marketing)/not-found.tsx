import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 pt-20 text-center">
      <LogoMark size={72} />
      <h1 className="mt-8 text-balance text-4xl font-medium tracking-[-0.03em] md:text-6xl">
        Page not found
      </h1>
      <p className="mt-5 max-w-md text-[17px] leading-relaxed text-text-secondary">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-9 inline-flex h-12 items-center rounded-control bg-ink px-6 text-[15px] font-medium text-surface-raised transition-colors hover:bg-ink-hover"
      >
        Back to home
      </Link>
    </main>
  );
}

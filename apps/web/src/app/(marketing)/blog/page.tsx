import type { Metadata } from "next";
import Link from "next/link";
import { SplitHeading } from "@/components/section";
import { Stagger, Item, HoverCard } from "@/components/motion";
import { listContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Engineering and security writing from the EduSentinel AI team — how the platform is built, and why.",
};

export default async function BlogIndex() {
  const posts = await listContent("blog");
  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-32 pt-20 md:px-10">
      <div className="pt-16 md:pt-24">
        <SplitHeading
          title="Writing"
          aside="How the platform is built, and why we made the calls we made. No growth-hacking posts."
        />
      </div>
      <Stagger className="mt-16 grid gap-5 md:grid-cols-2">
        {posts.map((p) => (
          <Item key={p.slug} className="h-full">
            <HoverCard className="group h-full">
              <Link
                href={`/blog/${p.slug}`}
                className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-8 transition-colors group-hover:border-brand-teal/40"
              >
                <p className="text-sm text-text-muted">
                  {p.date} {p.author && `· ${p.author}`}
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight">{p.title}</h2>
                <p className="mt-3 flex-1 leading-relaxed text-text-secondary">
                  {p.description}
                </p>
                <span className="mt-6 text-[15px] font-semibold text-text-primary">
                  Read →
                </span>
              </Link>
            </HoverCard>
          </Item>
        ))}
        {posts.length === 0 && (
          <p className="text-[15px] text-text-muted">No posts yet.</p>
        )}
      </Stagger>
    </main>
  );
}

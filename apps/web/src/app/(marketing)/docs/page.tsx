import type { Metadata } from "next";
import Link from "next/link";
import { SplitHeading } from "@/components/section";
import { Stagger, Item, HoverCard } from "@/components/motion";
import { listContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Guides for using EduSentinel AI products — accounts, security, and verifying downloads.",
};

export default async function DocsIndex() {
  const docs = await listContent("docs");
  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-32 pt-20 md:px-10">
      <div className="pt-16 md:pt-24">
        <SplitHeading
          title="Documentation"
          aside="Practical guides for using the platform and verifying everything we ship."
        />
      </div>
      <Stagger className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <Item key={d.slug} className="h-full">
            <HoverCard className="group h-full">
              <Link
                href={`/docs/${d.slug}`}
                className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-7 transition-colors group-hover:border-brand-teal/40"
              >
                <h2 className="text-lg font-semibold tracking-tight">{d.title}</h2>
                <p className="mt-2.5 flex-1 text-[15px] leading-relaxed text-text-secondary">
                  {d.description}
                </p>
                <span className="mt-5 text-[15px] font-semibold text-text-primary">
                  Read →
                </span>
              </Link>
            </HoverCard>
          </Item>
        ))}
        {docs.length === 0 && (
          <p className="text-[15px] text-text-muted">No documentation yet.</p>
        )}
      </Stagger>
    </main>
  );
}

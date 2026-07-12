import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@/components/prose";
import { listContent, getContent } from "@/lib/content";

export async function generateStaticParams() {
  const docs = await listContent("docs");
  return docs.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getContent("docs", slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.description };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [doc, all] = await Promise.all([getContent("docs", slug), listContent("docs")]);
  if (!doc) notFound();

  return (
    <main className="mx-auto max-w-[1100px] px-6 pb-32 pt-20 md:px-10">
      <div className="pt-16 md:grid md:grid-cols-[200px_1fr] md:gap-14 md:pt-24">
        <nav aria-label="Documentation" className="mb-10 md:mb-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Docs
          </p>
          <ul className="mt-4 space-y-2">
            {all.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/docs/${d.slug}`}
                  className={`text-[15px] transition-colors ${
                    d.slug === slug
                      ? "font-medium text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article>
          <h1 className="text-balance text-4xl font-medium leading-[1.1] tracking-[-0.03em]">
            {doc.title}
          </h1>
          <p className="mt-3 text-[17px] text-text-secondary">{doc.description}</p>
          <div className="mt-10">
            <Prose source={doc.body} />
          </div>
        </article>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@/components/prose";
import { listContent, getContent } from "@/lib/content";

export async function generateStaticParams() {
  const posts = await listContent("blog");
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getContent("blog", slug);
  if (!post) return {};
  return { title: post.title, description: post.description };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getContent("blog", slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 pb-32 pt-20">
      <div className="pt-16 md:pt-24">
        <Link href="/blog" className="text-sm text-text-muted hover:text-text-secondary">
          ← Writing
        </Link>
        <h1 className="mt-6 text-balance text-4xl font-medium leading-[1.1] tracking-[-0.03em] md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-sm text-text-muted">
          {post.date} {post.author && `· ${post.author}`}
        </p>
      </div>
      <article className="mt-12">
        <Prose source={post.body} />
      </article>
    </main>
  );
}

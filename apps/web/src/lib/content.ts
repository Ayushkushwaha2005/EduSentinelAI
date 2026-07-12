import { readdir, readFile } from "fs/promises";
import path from "path";
import matter from "gray-matter";

/*
 * Repo-authored content (blog + docs). These MDX files are written by the
 * team and reviewed through pull requests — they are trusted content, not
 * user-generated, which is why MDX (which can contain components) is safe
 * here. Anything submitted by the public goes through lib/sanitize.ts and
 * is rendered as plain text only.
 */
export type ContentKind = "blog" | "docs";

export type Frontmatter = {
  title: string;
  description: string;
  date?: string;
  author?: string;
  order?: number;
};

export type ContentDoc = Frontmatter & { slug: string; body: string };

const ROOT = path.join(process.cwd(), "content");

async function readAll(kind: ContentKind): Promise<ContentDoc[]> {
  const dir = path.join(ROOT, kind);
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".mdx"));
  } catch {
    return [];
  }
  const docs = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      return {
        slug: file.replace(/\.mdx$/, ""),
        body: content,
        ...(data as Frontmatter),
      };
    }),
  );
  return docs;
}

export async function listContent(kind: ContentKind): Promise<ContentDoc[]> {
  const docs = await readAll(kind);
  return kind === "blog"
    ? docs.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    : docs.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export async function getContent(
  kind: ContentKind,
  slug: string,
): Promise<ContentDoc | null> {
  const docs = await readAll(kind);
  return docs.find((d) => d.slug === slug) ?? null;
}

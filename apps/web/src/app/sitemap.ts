import type { MetadataRoute } from "next";
import { listContent } from "@/lib/content";

const base = "https://edusentinel.ai";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, docs] = await Promise.all([
    listContent("blog"),
    listContent("docs"),
  ]);

  const paths = [
    "",
    "/solutions",
    "/products",
    "/downloads",
    "/docs",
    "/blog",
    "/collaborate",
    "/pricing",
    "/company",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
    "/legal/security",
    "/legal/community",
    ...posts.map((p) => `/blog/${p.slug}`),
    ...docs.map((d) => `/docs/${d.slug}`),
  ];

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}

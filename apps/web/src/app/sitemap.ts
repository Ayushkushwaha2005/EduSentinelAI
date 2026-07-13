import type { MetadataRoute } from "next";
import { listContent } from "@/lib/content";
import { publicProductSlugs } from "@/lib/catalog";

const base = "https://edusentinel.ai";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Products come from the catalogue, so one the Founder publishes from the
  // dashboard is indexed without a code change.
  const [posts, docs, products] = await Promise.all([
    listContent("blog"),
    listContent("docs"),
    publicProductSlugs(),
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
    ...products.map((p) => `/products/${p.slug}`),
  ];

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}

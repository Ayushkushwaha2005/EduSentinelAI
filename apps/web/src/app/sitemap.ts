import type { MetadataRoute } from "next";

const base = "https://edusentinel.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/solutions",
    "/company",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
    "/legal/security",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}

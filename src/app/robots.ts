import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/templates"],
      disallow: ["/app", "/profile", "/api"],
    },
    sitemap: "https://resume.tomorrowtools.dev/sitemap.xml",
  };
}

import type { MetadataRoute } from "next";
import { LAYOUT_IDS } from "@/lib/ats/templates/shared";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: "https://resume.tomorrowtools.dev/", lastModified: now },
    { url: "https://resume.tomorrowtools.dev/templates", lastModified: now },
    ...LAYOUT_IDS.map((id) => ({
      url: `https://resume.tomorrowtools.dev/templates/${id}`,
      lastModified: now,
    })),
  ];
}

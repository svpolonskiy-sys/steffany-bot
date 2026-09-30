import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return siteConfig.url ? [{ url: `${siteConfig.url}/`, changeFrequency: "monthly", priority: 1 }] : [];
}

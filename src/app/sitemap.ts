import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/watch-order/story",
    "/watch-order/release",
    "/planner",
  ].map((path) => ({ url: `${base}${path}` }));
}

import type { MetadataRoute } from "next";

import {
  INDEXABLE_ROUTES,
  resolveCanonicalOrigin,
} from "@/src/discoverability/configuration";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = resolveCanonicalOrigin();
  return INDEXABLE_ROUTES.map((route) => ({
    url: new URL(route, `${origin}/`).href,
  }));
}

import type { MetadataRoute } from "next";

import {
  isNonProductionDeployment,
  resolveCanonicalOrigin,
} from "@/src/discoverability/configuration";

export default function robots(): MetadataRoute.Robots {
  const origin = resolveCanonicalOrigin();
  if (isNonProductionDeployment()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      host: origin,
      sitemap: `${origin}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/monolith", "/synth"],
      disallow: ["/api/", "/checkout-preview"],
    },
    host: origin,
    sitemap: `${origin}/sitemap.xml`,
  };
}

import type { NextConfig } from "next";

import { resolveBagMode } from "./src/bag/configuration";
import { resolveCanonicalOrigin } from "./src/discoverability/configuration";

resolveBagMode(process.env.BAG_MODE);
resolveCanonicalOrigin(process.env);

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  skipTrailingSlashRedirect: true,
  turbopack: {
    rules: {
      "*.css": {
        condition: {
          path: /(?<!\.module)\.css$/,
        },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

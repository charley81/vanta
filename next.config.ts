import type { NextConfig } from "next";

import { resolveBagMode } from "./src/bag/configuration";

resolveBagMode(process.env.BAG_MODE);

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
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

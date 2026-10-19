import type { NextConfig } from "next";

import { resolveBagMode } from "./src/bag/configuration";
import { resolveCanonicalOrigin } from "./src/discoverability/configuration";

resolveBagMode(process.env.BAG_MODE);
resolveCanonicalOrigin(process.env);

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    turbopackCjsScopeHoisting: true,
    turbopackCjsTreeShaking: true,
    turbopackCrossModuleConstants: true,
    turbopackMangleExportNames: true,
    turbopackMangleViaMaterializedNamespaceObject: true,
    turbopackRemoveUnusedExports: true,
    turbopackRemoveUnusedImports: true,
    turbopackChunking: {
      firstPageLoadPriority: 1,
      maxChunkCountPerGroup: 1,
      maxMergeChunkSize: 2_000_000,
      minChunkSize: 1_000_000,
      priorityRoutes: [/^\/monolith$/],
      requestCost: 2_000_000,
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  productionBrowserSourceMaps: false,
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

import { brotliCompressSync, constants as zlibConstants } from "node:zlib";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";

import type { ValidationIssue } from "./requirements";

export const DELIVERY_BUDGETS = {
  productInitialJavaScriptBytes: 110 * 1_024,
  homeInitialJavaScriptBytes: 140 * 1_024,
  synthInitialJavaScriptBytes: 140 * 1_024,
  deferredRendererJavaScriptBytes: 300 * 1_024,
  firstRenderFontBytes: 120 * 1_024,
  runtimeModelBytes: 2_700_000,
  singleMotionVariantBytes: 1_500_000,
} as const;

type HeavyRuntimeKind = "realtime" | "audio";

export type DeliveryArtifact = {
  path: string;
  bytes: number;
  runtimeKinds?: HeavyRuntimeKind[];
};

export type DeliveryInventory = {
  routes: {
    home: { initialJavaScript: DeliveryArtifact[] };
    product: { initialJavaScript: DeliveryArtifact[] };
    synth: { initialJavaScript: DeliveryArtifact[] };
  };
  deferredRendererJavaScript: DeliveryArtifact[];
  firstRenderFonts: DeliveryArtifact[];
  runtimeModel: DeliveryArtifact;
  motionVariants: DeliveryArtifact[];
  shellInitialJavaScript?: DeliveryArtifact[];
  bagInitialJavaScript?: DeliveryArtifact[];
};

type BoundarySummary = {
  bytes: number;
  ceilingBytes: number;
  paths: string[];
};

export type DeliveryBudgetResult = {
  status: "pass" | "fail";
  summary: {
    routes: Record<"home" | "product" | "synth", {
      initialJavaScriptBytes: number;
      ceilingBytes: number;
      paths: string[];
    }>;
    deferredRendererJavaScript: BoundarySummary;
    firstRenderFontBytes: number;
    firstRenderFontCeilingBytes: number;
    firstRenderFontPaths: string[];
    runtimeModel: BoundarySummary;
    motionVariants: Array<BoundarySummary>;
    isolation: {
      product: string[];
      shell: string[];
      bag: string[];
    };
  };
  issues: ValidationIssue[];
};

function uniqueArtifacts(artifacts: DeliveryArtifact[]): DeliveryArtifact[] {
  return [...new Map(artifacts.map((artifact) => [artifact.path, artifact])).values()];
}

function totalBytes(artifacts: DeliveryArtifact[]): number {
  return uniqueArtifacts(artifacts).reduce(
    (total, artifact) => total + artifact.bytes,
    0,
  );
}

function paths(artifacts: DeliveryArtifact[]): string[] {
  return uniqueArtifacts(artifacts).map((artifact) => artifact.path).sort();
}

function budgetIssue(
  issues: ValidationIssue[],
  code: string,
  path: string,
  actual: number,
  ceiling: number,
): void {
  if (actual <= ceiling) return;
  issues.push({
    code,
    message: `${actual} transfer bytes exceeds the ${ceiling}-byte ceiling`,
    path,
  });
}

function isolationIssues(
  issues: ValidationIssue[],
  boundary: string,
  artifacts: DeliveryArtifact[],
): string[] {
  const violations: string[] = [];
  artifacts.forEach((artifact, index) => {
    if (!artifact.runtimeKinds?.length) return;
    violations.push(artifact.path);
    issues.push({
      code: "eager_heavy_runtime",
      message: `${artifact.path} eagerly contains ${artifact.runtimeKinds.join(" and ")} runtime code`,
      path: `${boundary}[${index}]`,
    });
  });
  return violations;
}

export function evaluateDeliveryBudgets(
  inventory: DeliveryInventory,
): DeliveryBudgetResult {
  const issues: ValidationIssue[] = [];
  const routeCeilings = {
    home: DELIVERY_BUDGETS.homeInitialJavaScriptBytes,
    product: DELIVERY_BUDGETS.productInitialJavaScriptBytes,
    synth: DELIVERY_BUDGETS.synthInitialJavaScriptBytes,
  } as const;
  const routeSummary = Object.fromEntries(
    (Object.keys(routeCeilings) as Array<keyof typeof routeCeilings>).map(
      (route) => {
        const artifacts = inventory.routes[route].initialJavaScript;
        const bytes = totalBytes(artifacts);
        budgetIssue(
          issues,
          "initial_javascript_budget_exceeded",
          `routes.${route}.initialJavaScript`,
          bytes,
          routeCeilings[route],
        );
        return [
          route,
          {
            initialJavaScriptBytes: bytes,
            ceilingBytes: routeCeilings[route],
            paths: paths(artifacts),
          },
        ];
      },
    ),
  ) as DeliveryBudgetResult["summary"]["routes"];

  const deferredRendererBytes = totalBytes(
    inventory.deferredRendererJavaScript,
  );
  budgetIssue(
    issues,
    "deferred_renderer_budget_exceeded",
    "deferredRendererJavaScript",
    deferredRendererBytes,
    DELIVERY_BUDGETS.deferredRendererJavaScriptBytes,
  );

  const fontBytes = totalBytes(inventory.firstRenderFonts);
  budgetIssue(
    issues,
    "font_budget_exceeded",
    "firstRenderFonts",
    fontBytes,
    DELIVERY_BUDGETS.firstRenderFontBytes,
  );
  budgetIssue(
    issues,
    "runtime_model_budget_exceeded",
    "runtimeModel",
    inventory.runtimeModel.bytes,
    DELIVERY_BUDGETS.runtimeModelBytes,
  );
  inventory.motionVariants.forEach((variant, index) => {
    budgetIssue(
      issues,
      "motion_variant_budget_exceeded",
      `motionVariants[${index}]`,
      variant.bytes,
      DELIVERY_BUDGETS.singleMotionVariantBytes,
    );
  });

  const isolation = {
    product: isolationIssues(
      issues,
      "routes.product.initialJavaScript",
      inventory.routes.product.initialJavaScript,
    ),
    shell: isolationIssues(
      issues,
      "shellInitialJavaScript",
      inventory.shellInitialJavaScript ?? [],
    ),
    bag: isolationIssues(
      issues,
      "bagInitialJavaScript",
      inventory.bagInitialJavaScript ?? [],
    ),
  };

  return {
    status: issues.length === 0 ? "pass" : "fail",
    summary: {
      routes: routeSummary,
      deferredRendererJavaScript: {
        bytes: deferredRendererBytes,
        ceilingBytes: DELIVERY_BUDGETS.deferredRendererJavaScriptBytes,
        paths: paths(inventory.deferredRendererJavaScript),
      },
      firstRenderFontBytes: fontBytes,
      firstRenderFontCeilingBytes: DELIVERY_BUDGETS.firstRenderFontBytes,
      firstRenderFontPaths: paths(inventory.firstRenderFonts),
      runtimeModel: {
        bytes: inventory.runtimeModel.bytes,
        ceilingBytes: DELIVERY_BUDGETS.runtimeModelBytes,
        paths: [inventory.runtimeModel.path],
      },
      motionVariants: inventory.motionVariants.map((variant) => ({
        bytes: variant.bytes,
        ceilingBytes: DELIVERY_BUDGETS.singleMotionVariantBytes,
        paths: [variant.path],
      })),
      isolation,
    },
    issues,
  };
}

type RouteBundleStat = {
  route: string;
  firstLoadChunkPaths: string[];
};

type FontManifest = {
  app: Record<string, string[]>;
};

type DerivativeManifest = {
  motion: { variants: Array<{ bytes: number; path: string }> };
  outputs: Array<{ id: string; bytes: number; path: string }>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function runtimeKinds(source: string): HeavyRuntimeKind[] {
  const kinds: HeavyRuntimeKind[] = [];
  if (/WebGLRenderer|MeshoptDecoder|three\.module|three-scene\.client/u.test(source)) {
    kinds.push("realtime");
  }
  if (/\bAudioContext\b|createNativeAudioEngine|engine\.client/u.test(source)) {
    kinds.push("audio");
  }
  return kinds;
}

function javascriptArtifact(root: string, path: string): DeliveryArtifact {
  const absolute = join(root, path);
  const contents = readFileSync(absolute);
  return {
    path: relative(root, absolute),
    bytes: brotliCompressSync(contents, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
    }).byteLength,
    runtimeKinds: runtimeKinds(contents.toString("utf8")),
  };
}

function commonArtifacts(groups: DeliveryArtifact[][]): DeliveryArtifact[] {
  if (groups.length === 0) return [];
  const remaining = new Set(groups[0].map((artifact) => artifact.path));
  groups.slice(1).forEach((group) => {
    const groupPaths = new Set(group.map((artifact) => artifact.path));
    remaining.forEach((path) => {
      if (!groupPaths.has(path)) remaining.delete(path);
    });
  });
  return groups[0].filter((artifact) => remaining.has(artifact.path));
}

export function inspectProductionDelivery(root: string): DeliveryInventory {
  const routeStatsPath = join(
    root,
    ".next/diagnostics/route-bundle-stats.json",
  );
  if (!existsSync(routeStatsPath)) {
    throw new Error(
      "Missing .next/diagnostics/route-bundle-stats.json; run pnpm build first.",
    );
  }
  const routeStats = readJson<RouteBundleStat[]>(routeStatsPath);
  const routePaths = { home: "/", product: "/monolith", synth: "/synth" } as const;
  const routes = Object.fromEntries(
    Object.entries(routePaths).map(([name, route]) => {
      const stats = routeStats.find((entry) => entry.route === route);
      if (!stats) throw new Error(`Production build has no bundle stats for ${route}.`);
      return [
        name,
        {
          initialJavaScript: stats.firstLoadChunkPaths.map((path) =>
            javascriptArtifact(root, path),
          ),
        },
      ];
    }),
  ) as DeliveryInventory["routes"];

  const chunksDirectory = join(root, ".next/static/chunks");
  const allJavaScript = readdirSync(chunksDirectory)
    .filter((name) => name.endsWith(".js"))
    .map((name) => javascriptArtifact(root, `.next/static/chunks/${name}`));
  const deferredRendererJavaScript = allJavaScript.filter((artifact) =>
    artifact.runtimeKinds?.includes("realtime"),
  );

  const fontManifest = readJson<FontManifest>(
    join(root, ".next/server/next-font-manifest.json"),
  );
  const routeFontKeys = [
    "[project]/app/page",
    "[project]/app/monolith/page",
    "[project]/app/synth/page",
  ];
  const firstRenderFonts = uniqueArtifacts(
    routeFontKeys.flatMap((key) =>
      (fontManifest.app[key] ?? []).map((path) => ({
        path: `.next/${path}`,
        bytes: statSync(join(root, ".next", path)).size,
      })),
    ),
  );

  const derivatives = readJson<DerivativeManifest>(
    join(root, "media/manifests/derivatives.json"),
  );
  const runtimeModel = derivatives.outputs.find(
    (output) => output.id === "runtime-meshopt",
  );
  if (!runtimeModel) throw new Error("Derivative manifest has no runtime-meshopt output.");

  const sharedInitialJavaScript = commonArtifacts(
    Object.values(routes).map((route) => route.initialJavaScript),
  );
  return {
    routes,
    deferredRendererJavaScript,
    firstRenderFonts,
    runtimeModel: {
      bytes: statSync(join(root, runtimeModel.path)).size,
      path: runtimeModel.path,
    },
    motionVariants: derivatives.motion.variants.map((variant) => ({
      bytes: statSync(join(root, variant.path)).size,
      path: variant.path,
    })),
    shellInitialJavaScript: sharedInitialJavaScript,
    bagInitialJavaScript: sharedInitialJavaScript,
  };
}

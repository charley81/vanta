import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  inspectPublicRuntimeConfiguration,
  inspectSourceBoundaries,
} from "@/tooling/architecture/source-boundaries";
import {
  buildProductCatalogManifest,
  serializeProductCatalogManifest,
} from "@/src/catalog/manifest";

import type { ValidationIssue } from "./requirements";

type ArchitectureEvaluation = {
  status: "pass" | "fail";
  summary: Record<string, unknown> & { sha256?: string };
  issues: ValidationIssue[];
};

const productCatalogFixture =
  "verification/fixtures/product-catalog-manifest.json";

export function evaluateProductCatalogManifest(
  root: string,
): ArchitectureEvaluation {
  const actual = serializeProductCatalogManifest();
  const expected = readFileSync(join(root, productCatalogFixture), "utf8");
  const issues: ValidationIssue[] =
    actual === expected
      ? []
      : [
          {
            code: "product_catalog_manifest_mismatch",
            message:
              "Code-owned Product truth and Catalog values do not match the reviewed manifest fixture.",
            path: productCatalogFixture,
          },
        ];

  return {
    status: issues.length === 0 ? "pass" : "fail",
    summary: {
      fixture: productCatalogFixture,
      sha256: createHash("sha256").update(actual).digest("hex"),
      manifest: buildProductCatalogManifest(),
    },
    issues,
  };
}

export function evaluateSourceBoundaries(root: string): ArchitectureEvaluation {
  const issues = inspectSourceBoundaries(root);
  return {
    status: issues.length === 0 ? "pass" : "fail",
    summary: { issueCount: issues.length, scannedRoots: ["app", "src"] },
    issues,
  };
}

export function evaluatePublicRuntime(root: string): ArchitectureEvaluation {
  const issues = inspectPublicRuntimeConfiguration(root);
  return {
    status: issues.length === 0 ? "pass" : "fail",
    summary: {
      issueCount: issues.length,
      scannedRoots: ["app", "src"],
      scannedConfiguration: ["package.json", "next.config.*"],
    },
    issues,
  };
}

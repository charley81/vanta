import { describe, expect, it } from "vitest";

import {
  evaluateProductCatalogManifest,
  evaluatePublicRuntime,
  evaluateSourceBoundaries,
} from "@/tooling/verification/architecture";

describe("architecture verification checks", () => {
  it("verifies the reviewed Product/Catalog manifest", () => {
    const result = evaluateProductCatalogManifest(process.cwd());

    expect(result).toMatchObject({
      status: "pass",
      issues: [],
      summary: {
        fixture: "verification/fixtures/product-catalog-manifest.json",
      },
    });
    expect(result.summary.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifies source ownership and dependency seams", () => {
    expect(evaluateSourceBoundaries(process.cwd())).toMatchObject({
      status: "pass",
      issues: [],
    });
  });

  it("verifies public runtime isolation", () => {
    expect(evaluatePublicRuntime(process.cwd())).toMatchObject({
      status: "pass",
      issues: [],
    });
  });
});

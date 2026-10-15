import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CATALOG } from "@/src/catalog/catalog";
import {
  buildProductCatalogManifest,
  serializeProductCatalogManifest,
} from "@/src/catalog/manifest";
import { PRODUCT_TRUTH } from "@/src/product/product-truth";

describe("code-owned Product truth and Catalog", () => {
  it("represents the approved MONOLITH identity, sound model, and physical specification", () => {
    expect(PRODUCT_TRUTH.identity).toEqual({
      brand: "VANTA",
      model: "MONOLITH",
      category: "Desktop Synthesizer",
      finish: "Graphite",
      productCount: 1,
      voiceCount: 8,
      synthesis: "Hybrid polyphonic",
    });
    expect(PRODUCT_TRUTH.configuration).toEqual({
      variants: "None",
      editions: "None",
      accessories: "None",
    });
    expect(PRODUCT_TRUTH.claims).toEqual([
      "Sound, given mass.",
      "Two states. One continuum.",
      "Made to be moved.",
    ]);
    expect(PRODUCT_TRUTH.sound.morph).toContain("continuously transforms");
    expect(PRODUCT_TRUTH.physical.dimensions).toEqual({
      widthMm: 360,
      depthMm: 210,
      heightMm: 80,
      display: "360 × 210 × 80 mm (W × D × H)",
    });
    expect(PRODUCT_TRUTH.physical).not.toHaveProperty("weight");
    expect(PRODUCT_TRUTH.physical).not.toHaveProperty("power");
    expect(PRODUCT_TRUTH.physical).not.toHaveProperty("warranty");
  });

  it("exposes only the approved public Catalog values", () => {
    expect(CATALOG).toEqual({
      vendor: "VANTA",
      product: "MONOLITH",
      category: "Desktop Synthesizer",
      finish: "Graphite",
      price: {
        amountMinor: 249900,
        currency: "USD",
        display: "$2,499 USD",
      },
      quantity: 1,
    });
    expect(CATALOG).not.toHaveProperty("availability");
    expect(CATALOG).not.toHaveProperty("sku");
    expect(CATALOG).not.toHaveProperty("checkoutUrl");
  });

  it("serializes a deterministic, versioned manifest", () => {
    const first = serializeProductCatalogManifest();
    const second = serializeProductCatalogManifest();

    expect(first).toBe(second);
    expect(JSON.parse(first)).toEqual(buildProductCatalogManifest());
    expect(buildProductCatalogManifest()).toMatchObject({
      schemaVersion: 1,
      productTruth: PRODUCT_TRUTH,
      catalog: CATALOG,
    });
  });

  it("matches the reviewed Product/Catalog manifest fixture", () => {
    const approvedFixture = readFileSync(
      "verification/fixtures/product-catalog-manifest.json",
      "utf8",
    );

    expect(serializeProductCatalogManifest()).toBe(approvedFixture);
  });
});

import { CATALOG } from "@/src/catalog/catalog";
import { PRODUCT_TRUTH } from "@/src/product/product-truth";

export function buildProductCatalogManifest() {
  return {
    schemaVersion: 1 as const,
    productTruth: PRODUCT_TRUTH,
    catalog: CATALOG,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

export function serializeProductCatalogManifest(): string {
  return `${JSON.stringify(canonicalize(buildProductCatalogManifest()), null, 2)}\n`;
}

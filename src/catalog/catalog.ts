import { PRODUCT_TRUTH } from "@/src/product/product-truth";

export const CATALOG = {
  vendor: PRODUCT_TRUTH.identity.brand,
  product: PRODUCT_TRUTH.identity.model,
  category: PRODUCT_TRUTH.identity.category,
  finish: PRODUCT_TRUTH.identity.finish,
  price: {
    amountMinor: 249_900,
    currency: "USD",
    display: "$2,499 USD",
  },
  quantity: 1,
} as const;

export type Catalog = typeof CATALOG;

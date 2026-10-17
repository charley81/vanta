import { PRODUCT_TRUTH } from "@/src/product/product-truth";
import {
  resolvePublicUrl,
  type IndexedRouteMetadata,
} from "@/src/discoverability/metadata";

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildHomeStructuredData() {
  const home = resolvePublicUrl("/");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${home}#organization`,
        name: PRODUCT_TRUTH.identity.brand,
        url: home,
      },
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: PRODUCT_TRUTH.identity.brand,
        url: home,
        publisher: { "@id": `${home}#organization` },
        inLanguage: "en",
      },
    ],
  };
}

export function buildProductStructuredData(model: IndexedRouteMetadata) {
  const productUrl = resolvePublicUrl("/monolith");
  const dimensions = PRODUCT_TRUTH.physical.dimensions;
  const property = (name: string, value: string) => ({
    "@type": "PropertyValue",
    name,
    value,
  });
  const measurement = (value: number) => ({
    "@type": "QuantitativeValue",
    value,
    unitCode: "MMT",
    unitText: "millimeter",
  });

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    url: productUrl,
    name: PRODUCT_TRUTH.identity.model,
    model: PRODUCT_TRUTH.identity.model,
    brand: {
      "@type": "Brand",
      name: PRODUCT_TRUTH.identity.brand,
    },
    category: PRODUCT_TRUTH.identity.category,
    description: model.seoDescription,
    color: PRODUCT_TRUTH.identity.finish,
    material: PRODUCT_TRUTH.physical.enclosure,
    width: measurement(dimensions.widthMm),
    depth: measurement(dimensions.depthMm),
    height: measurement(dimensions.heightMm),
    image: [
      resolvePublicUrl(model.socialImage.url),
      resolvePublicUrl("/media/stills/product-hero-1440.webp"),
      resolvePublicUrl("/media/stills/product-morph-1440.webp"),
    ],
    additionalProperty: [
      property("Synthesis", PRODUCT_TRUTH.identity.synthesis),
      ...Object.entries(PRODUCT_TRUTH.architecture).map(([name, value]) =>
        property(name, value),
      ),
      property("Display", PRODUCT_TRUTH.physical.display),
      property("Connections", PRODUCT_TRUTH.physical.connections.join(", ")),
      property(
        "Panel controls",
        PRODUCT_TRUTH.physical.panelControls.join(", "),
      ),
      property(
        "Display buttons",
        `${PRODUCT_TRUTH.physical.displayButtons.count} — ${PRODUCT_TRUTH.physical.displayButtons.description}`,
      ),
    ],
  };
}

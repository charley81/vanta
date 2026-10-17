import { afterEach, describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { INITIAL_EDITORIAL_PROJECTION_FIXTURES } from "@/sanity/seed/initial-content";
import {
  BOUND_PRODUCTION_ORIGIN,
  canonicalRedirectUrl,
  resolveCanonicalOrigin,
} from "@/src/discoverability/configuration";
import { buildIndexedRouteMetadata } from "@/src/discoverability/metadata";
import {
  buildHomeStructuredData,
  buildProductStructuredData,
  serializeJsonLd,
} from "@/src/discoverability/structured-data";
import { composeProductRouteViewModel } from "@/src/routes/view-models.server";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("canonical origin and route policy", () => {
  it("uses the bound HTTPS production origin and validates explicit overrides", () => {
    expect(resolveCanonicalOrigin({})).toBe(BOUND_PRODUCTION_ORIGIN);
    expect(
      resolveCanonicalOrigin({
        VANTA_PRODUCTION_ORIGIN: "https://www.vanta.example",
      }),
    ).toBe("https://www.vanta.example");

    for (const invalid of [
      "http://vanta.example",
      "https://vanta.example/path",
      "https://user:password@vanta.example",
      "not a URL",
    ]) {
      expect(() =>
        resolveCanonicalOrigin({ VANTA_PRODUCTION_ORIGIN: invalid }),
      ).toThrow(/HTTPS origin/);
    }
  });

  it("permanently targets one-hop canonical destinations for hosts, slash variants, and legacy paths", () => {
    const production = {
      CONTEXT: "production",
      VANTA_PRODUCTION_ORIGIN: "https://vanta.example",
    };

    expect(
      canonicalRedirectUrl(
        new URL("http://alternate.example/product/?source=legacy"),
        production,
      )?.href,
    ).toBe("https://vanta.example/monolith?source=legacy");
    expect(
      canonicalRedirectUrl(
        new URL("https://vanta.example/monolith/"),
        production,
      )?.href,
    ).toBe("https://vanta.example/monolith");
    expect(
      canonicalRedirectUrl(
        new URL("https://vanta.example/monolith"),
        production,
      ),
    ).toBeNull();
  });

  it("lists only Home, Product, and Synth and keeps operational routes out of robots", () => {
    process.env = {
      ...originalEnvironment,
      VANTA_PRODUCTION_ORIGIN: "https://vanta.example",
    };

    expect(sitemap()).toEqual([
      { url: "https://vanta.example/" },
      { url: "https://vanta.example/monolith" },
      { url: "https://vanta.example/synth" },
    ]);
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: ["/", "/monolith", "/synth"],
        disallow: ["/api/", "/checkout-preview"],
      },
      host: "https://vanta.example",
      sitemap: "https://vanta.example/sitemap.xml",
    });

    process.env.CONTEXT = "deploy-preview";
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});

describe("metadata and structured data", () => {
  const product = composeProductRouteViewModel(
    INITIAL_EDITORIAL_PROJECTION_FIXTURES.productPage,
  );

  it("builds canonical Open Graph and large-image metadata from validated Editorial data", () => {
    const metadata = buildIndexedRouteMetadata(product);
    expect(metadata).toMatchObject({
      title: { absolute: product.title },
      description: product.seoDescription,
      alternates: {
        canonical: `${BOUND_PRODUCTION_ORIGIN}/monolith`,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: { "max-image-preview": "large" },
      },
      openGraph: {
        title: product.title,
        description: product.seoDescription,
        url: `${BOUND_PRODUCTION_ORIGIN}/monolith`,
        images: [
          {
            url: `${BOUND_PRODUCTION_ORIGIN}/social/product.jpg`,
            width: 1200,
            height: 630,
            alt: product.socialImage.alt,
          },
        ],
      },
      twitter: { card: "summary_large_image" },
    });
  });

  it("emits Organization and WebSite entities on Home", () => {
    const data = buildHomeStructuredData();
    expect(data["@graph"].map((entity) => entity["@type"])).toEqual([
      "Organization",
      "WebSite",
    ]);
    expect(data["@graph"][1]).toMatchObject({
      url: `${BOUND_PRODUCTION_ORIGIN}/`,
      publisher: {
        "@id": `${BOUND_PRODUCTION_ORIGIN}/#organization`,
      },
    });
  });

  it("emits accurate Product facts without false commerce capability", () => {
    const data = buildProductStructuredData(product);
    const serialized = serializeJsonLd(data);

    expect(data).toMatchObject({
      "@type": "Product",
      name: "MONOLITH",
      model: "MONOLITH",
      brand: { "@type": "Brand", name: "VANTA" },
      category: "Desktop Synthesizer",
      color: "Graphite",
      material: "Bead-blasted graphite aluminum",
      width: { value: 360, unitCode: "MMT" },
      depth: { value: 210, unitCode: "MMT" },
      height: { value: 80, unitCode: "MMT" },
    });
    expect(data.image).toHaveLength(3);
    expect(data.additionalProperty.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "Synthesis",
        "polyphony",
        "oscillators",
        "filter",
        "envelope",
        "modulation",
        "output",
        "storage",
        "morph",
        "Display",
        "Connections",
        "Panel controls",
        "Display buttons",
      ]),
    );
    expect(serialized).not.toMatch(
      /"(?:offers|sku|availability|aggregateRating|review|potentialAction|price|priceCurrency)"/i,
    );
  });

  it("neutralizes script-breaking Editorial content during serialization", () => {
    expect(serializeJsonLd({ value: "</script><script>alert(1)</script>&" }))
      .toBe(
        '{"value":"\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e\\u0026"}',
      );
  });

  it("rejects untrusted social-image URLs and incorrect dimensions", () => {
    const remote = structuredClone(
      INITIAL_EDITORIAL_PROJECTION_FIXTURES.productPage,
    ) as unknown as Record<string, unknown>;
    remote.socialImage = {
      url: "https://attacker.example/card.jpg",
      width: 1200,
      height: 630,
      alt: "Untrusted social card",
    };
    expect(() => composeProductRouteViewModel(remote)).toThrow(
      "must be a local social fixture or an HTTPS Sanity CDN asset",
    );

    remote.socialImage = {
      url: "/social/product.jpg",
      width: 1199,
      height: 630,
      alt: "Incorrectly sized social card",
    };
    expect(() => composeProductRouteViewModel(remote)).toThrow(
      "must be exactly 1200×630 pixels",
    );
  });
});

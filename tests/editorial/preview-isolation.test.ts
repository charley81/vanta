import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const socialImage = {
  url: "/social/home.jpg",
  width: 1200 as const,
  height: 630 as const,
  alt: "Published social image",
};

const published = {
  home: vi.fn(async () => ({
    route: "/" as const,
    title: "Published home",
    seoDescription: "Published home description",
    socialImage,
  })),
  product: vi.fn(async () => ({
    route: "/monolith" as const,
    title: "Published product",
    seoDescription: "Published product description",
    socialImage,
  })),
  synth: vi.fn(async () => ({
    route: "/synth" as const,
    title: "Published synth",
    seoDescription: "Published synth description",
    socialImage,
  })),
};

vi.mock("@/src/editorial/public-content.server", () => ({
  getPublishedHomeRouteViewModel: published.home,
  getPublishedProductRouteViewModel: published.product,
  getPublishedSynthRouteViewModel: published.synth,
}));

vi.mock("@/src/editorial/preview-content.server", () => ({
  getPublishedHomeMetadataForRequest: published.home,
  getPublishedProductMetadataForRequest: published.product,
  getPublishedSynthMetadataForRequest: published.synth,
  getHomeRouteContentForRequest: vi.fn(async () => ({
    model: { title: "SECRET DRAFT HOME" },
    preview: { perspective: ["drafts"] },
  })),
  getProductRouteContentForRequest: vi.fn(async () => ({
    model: { title: "SECRET DRAFT PRODUCT" },
    preview: { perspective: ["drafts"] },
  })),
  getSynthRouteContentForRequest: vi.fn(async () => ({
    model: { title: "SECRET DRAFT SYNTH" },
    preview: { perspective: ["drafts"] },
  })),
}));

describe("draft/public output isolation", () => {
  it("always builds route metadata from published content", async () => {
    const [home, product, synth] = await Promise.all([
      import("@/app/page"),
      import("@/app/monolith/page"),
      import("@/app/synth/page"),
    ]);

    const [homeMetadata, productMetadata, synthMetadata] = await Promise.all([
      home.generateMetadata(),
      product.generateMetadata(),
      synth.generateMetadata(),
    ]);

    expect(homeMetadata).toMatchObject({
      title: { absolute: "Published home" },
      description: "Published home description",
      alternates: { canonical: "https://vanta-monolith.netlify.app/" },
      openGraph: { description: "Published home description" },
    });
    expect(productMetadata).toMatchObject({
      title: { absolute: "Published product" },
      description: "Published product description",
      alternates: {
        canonical: "https://vanta-monolith.netlify.app/monolith",
      },
      openGraph: { description: "Published product description" },
    });
    expect(synthMetadata).toMatchObject({
      title: { absolute: "Published synth" },
      description: "Published synth description",
      alternates: { canonical: "https://vanta-monolith.netlify.app/synth" },
      openGraph: { description: "Published synth description" },
    });
    expect(JSON.stringify([homeMetadata, productMetadata, synthMetadata]))
      .not.toContain("SECRET DRAFT");
  });

  it("keeps preview reads outside every public cache scope", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "src/editorial/preview-content.server.ts"),
      "utf8",
    );
    const adapterSource = readFileSync(
      resolve(process.cwd(), "src/editorial/preview-adapter.server.ts"),
      "utf8",
    );
    const publicSource = readFileSync(
      resolve(process.cwd(), "src/editorial/public-content.server.ts"),
      "utf8",
    );

    expect(previewSource).not.toMatch(/use cache|cacheTag|cacheLife/);
    expect(adapterSource).not.toMatch(/use cache|cacheTag|cacheLife/);
    expect(adapterSource).toContain("useCdn: false");
    expect(publicSource).not.toMatch(/Preview|SANITY_API_READ_TOKEN|drafts/);
  });

  it("has no browser live bridge or telemetry path that could export draft values", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "src/editorial/preview-content.server.ts"),
      "utf8",
    );
    const bannerSource = readFileSync(
      resolve(process.cwd(), "app/ui/editorial-preview-banner.tsx"),
      "utf8",
    );

    expect(previewSource).not.toMatch(/WebSocket|EventSource|postMessage|telemetry/);
    expect(bannerSource).not.toMatch(/model|content|description|body/);
  });
});

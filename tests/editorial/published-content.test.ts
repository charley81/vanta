import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { INITIAL_EDITORIAL_PROJECTION_FIXTURES } from "@/sanity/seed/initial-content";
import {
  EDITORIAL_CACHE_ARCHITECTURE,
  EDITORIAL_CACHE_TAGS,
  getPublishedEditorialRevision,
  getPublishedHomeRouteViewModel,
  getPublishedProductRouteViewModel,
  getPublishedSiteSettings,
  getPublishedSynthRouteViewModel,
} from "@/src/editorial/public-content.server";
import { readPublishedEditorialSnapshotProjection } from "@/src/editorial/source.server";

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/src/editorial/source.server", () => ({
  readPublishedEditorialSnapshotProjection: vi.fn(),
}));

const siteSettings = {
  privacyNoticeUrl: "https://vanta.example/privacy",
  defaultSocialImage: {
    _type: "editorialImage",
    asset: {
      _type: "reference",
      _ref: "image-defaultsocial-1200x630-jpg",
    },
    presentation: "contextual",
    alt: "VANTA — Sound, given mass.",
    caption: null,
  },
};

const readProjection = vi.mocked(readPublishedEditorialSnapshotProjection);

beforeEach(() => {
  vi.clearAllMocks();
  readProjection.mockImplementation(async (documentId) => {
    const projection =
      documentId === "siteSettings"
        ? siteSettings
        : INITIAL_EDITORIAL_PROJECTION_FIXTURES[documentId];
    return { ...projection, _rev: `rev-${documentId}` };
  });
});

describe("published Editorial composition cache", () => {
  it("composes every required singleton inside an explicit max-life, document-tagged scope", async () => {
    const settings = await getPublishedSiteSettings();
    const home = await getPublishedHomeRouteViewModel();
    const product = await getPublishedProductRouteViewModel();
    const synth = await getPublishedSynthRouteViewModel();

    expect(settings.privacyNoticeUrl).toBe("https://vanta.example/privacy");
    expect(home.opening.headline).toBe("Sound, given mass.");
    expect(product.hero).toMatchObject({
      name: "MONOLITH",
      price: "$2,499 USD",
    });
    expect(synth.headline).toBe("One gesture. Endless change.");

    expect(cacheLife).toHaveBeenCalledTimes(4);
    expect(vi.mocked(cacheLife).mock.calls).toEqual([
      ["max"],
      ["max"],
      ["max"],
      ["max"],
    ]);
    expect(vi.mocked(cacheTag).mock.calls).toEqual([
      [EDITORIAL_CACHE_TAGS.siteSettings],
      [EDITORIAL_CACHE_TAGS.homePage],
      [EDITORIAL_CACHE_TAGS.productPage],
      [EDITORIAL_CACHE_TAGS.synthPage],
    ]);
  });

  it("caches the validated view model and published revision as one tagged snapshot", async () => {
    await expect(getPublishedEditorialRevision("productPage")).resolves.toBe(
      "rev-productPage",
    );
    expect(readProjection).toHaveBeenCalledOnce();
    expect(cacheTag).toHaveBeenCalledWith(
      EDITORIAL_CACHE_TAGS.productPage,
    );
  });

  it("rejects an absent required singleton so a candidate cannot cache incomplete content", async () => {
    readProjection.mockResolvedValueOnce(null);

    await expect(getPublishedSiteSettings()).rejects.toThrow(
      "siteSettings must include its published revision",
    );
  });

  it("rejects malformed Sanity output before it can become a valid cached route model", async () => {
    readProjection.mockResolvedValueOnce({
      ...INITIAL_EDITORIAL_PROJECTION_FIXTURES.homePage,
      _rev: "rev-homePage",
      opening: {
        ...INITIAL_EDITORIAL_PROJECTION_FIXTURES.homePage.opening,
        body: "<strong>Untrusted markup</strong>",
      },
    });

    await expect(getPublishedHomeRouteViewModel()).rejects.toThrow(
      "homePage.opening.body must be plain text without HTML or embedded links",
    );
  });

  it("keeps request APIs and persistent-memory assumptions outside public cache scopes", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/editorial/public-content.server.ts"),
      "utf8",
    );

    expect(source.match(/["']use cache["']/g)).toHaveLength(4);
    expect(source).not.toMatch(/next\/headers|cookies\(|headers\(|use cache: remote|unstable_cache/);
    expect(EDITORIAL_CACHE_ARCHITECTURE.requiresCrossRequestMemory).toBe(false);
    expect(EDITORIAL_CACHE_ARCHITECTURE.survivesDeployment).toBe(false);
  });

  it("lets failed refreshes reject instead of inventing Editorial fallback content", async () => {
    const lastValid = await getPublishedHomeRouteViewModel();
    readProjection.mockRejectedValueOnce(new Error("Injected Sanity timeout"));

    await expect(getPublishedHomeRouteViewModel()).rejects.toThrow(
      "Injected Sanity timeout",
    );
    expect(lastValid.opening.headline).toBe("Sound, given mass.");
    expect(EDITORIAL_CACHE_ARCHITECTURE).toEqual({
      life: "max",
      refresh: "stale-while-revalidate",
      scope: "deployment",
      requiresCrossRequestMemory: false,
      survivesDeployment: false,
    });
  });
});

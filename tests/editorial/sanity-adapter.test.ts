import { describe, expect, it, vi } from "vitest";

import { EDITORIAL_PROJECTIONS } from "@/sanity/projections";
import { createPublishedEditorialAdapter } from "@/src/editorial/sanity-adapter.server";
import { resolveEditorialSourceConfiguration } from "@/src/editorial/source.server";

describe("published Sanity adapter", () => {
  it("uses only the fixed narrow projection and published perspective", async () => {
    const fetchProjection = vi.fn().mockResolvedValue({
      headline: "Sound, given mass.",
    });
    const adapter = createPublishedEditorialAdapter(fetchProjection);

    await expect(adapter.read("homePage")).resolves.toEqual({
      headline: "Sound, given mass.",
    });
    expect(fetchProjection).toHaveBeenCalledWith(
      EDITORIAL_PROJECTIONS.homePage,
      {},
      { perspective: "published" },
    );
  });

  it("contains vendor failures behind a stable server-domain error", async () => {
    const adapter = createPublishedEditorialAdapter(
      vi.fn().mockRejectedValue(new Error("socket details and upstream URL")),
    );

    await expect(adapter.read("productPage")).rejects.toThrow(
      "Published Editorial productPage is unavailable",
    );
    await expect(adapter.read("productPage")).rejects.not.toThrow(
      "socket details and upstream URL",
    );
  });

  it("requires explicit published bindings for CI and hosted candidates", () => {
    expect(() =>
      resolveEditorialSourceConfiguration({ CI: "true" }),
    ).toThrow(
      "SANITY_STUDIO_PROJECT_ID is required when SANITY_CONTENT_SOURCE is published",
    );
    expect(() =>
      resolveEditorialSourceConfiguration({
        NETLIFY: "true",
        SANITY_CONTENT_SOURCE: "fixture",
      }),
    ).toThrow(
      "Hosted Netlify candidates cannot use deterministic Editorial fixtures",
    );
  });

  it("allows deterministic fixtures only when local or explicitly automated", () => {
    expect(resolveEditorialSourceConfiguration({ NODE_ENV: "test" })).toEqual({
      mode: "fixture",
    });
    expect(
      resolveEditorialSourceConfiguration({
        CI: "true",
        SANITY_CONTENT_SOURCE: "fixture",
      }),
    ).toEqual({ mode: "fixture" });
  });

  it("resolves a complete published source without tokens or request state", () => {
    expect(
      resolveEditorialSourceConfiguration({
        SANITY_CONTENT_SOURCE: "published",
        SANITY_STUDIO_PROJECT_ID: "project-id",
        SANITY_STUDIO_DATASET: "production",
      }),
    ).toEqual({
      mode: "published",
      projectId: "project-id",
      dataset: "production",
    });
    expect(() =>
      resolveEditorialSourceConfiguration({
        SANITY_CONTENT_SOURCE: "unexpected",
      }),
    ).toThrow(
      'SANITY_CONTENT_SOURCE must be either "fixture" or "published"',
    );
  });
});

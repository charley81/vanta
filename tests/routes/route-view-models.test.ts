import { describe, expect, it } from "vitest";

import { EDITORIAL_FIXTURES } from "@/src/editorial/fixtures.server";
import {
  composeCheckoutPreviewRouteViewModel,
  composeHomeRouteViewModel,
  composeProductRouteViewModel,
  composeSynthRouteViewModel,
} from "@/src/routes/view-models.server";

describe("route view-model composition", () => {
  it("composes deterministic domain-shaped models from the approved Editorial fixtures", () => {
    const home = composeHomeRouteViewModel(EDITORIAL_FIXTURES.homePage);
    const product = composeProductRouteViewModel(
      EDITORIAL_FIXTURES.productPage,
    );
    const synth = composeSynthRouteViewModel(EDITORIAL_FIXTURES.synthPage);
    const checkoutPreview = composeCheckoutPreviewRouteViewModel();

    expect(home.chapters.map(({ id }) => id)).toEqual([
      "philosophy",
      "reveal",
      "sub",
      "monolith",
      "morph",
      "gesture",
      "fracture",
      "craft",
      "resolution",
    ]);
    expect(product.hero).toMatchObject({
      identifier: "VANTA / INSTRUMENT 001",
      name: "MONOLITH",
      price: "$2,499 USD",
      addToBagLabel: "ADD TO BAG",
    });
    expect(product.specifications).not.toHaveProperty("weight");
    expect(product.specifications).not.toHaveProperty("power");
    expect(synth).toMatchObject({
      route: "/synth",
      title: "MORPH Lab — Play MONOLITH | VANTA",
      category: "MORPH LAB",
      headline: "One gesture. Endless change.",
    });
    expect(synth.supportedControls.map(({ name }) => name)).toEqual([
      "MORPH",
      "CUTOFF",
      "RESONANCE",
      "DRIVE",
      "ATTACK",
      "RELEASE",
    ]);
    expect(checkoutPreview).toMatchObject({
      route: "/checkout-preview",
      title: "Checkout Preview | VANTA",
      unavailable: {
        heading: "Checkout Preview needs a confirmed Bag.",
      },
    });

    expect(JSON.stringify(composeHomeRouteViewModel(EDITORIAL_FIXTURES.homePage)))
      .toBe(JSON.stringify(home));
  });

  it("keeps public route models in-world and free of superseded commerce copy", () => {
    const publicModels = JSON.stringify([
      composeHomeRouteViewModel(EDITORIAL_FIXTURES.homePage),
      composeProductRouteViewModel(EDITORIAL_FIXTURES.productPage),
      composeSynthRouteViewModel(EDITORIAL_FIXTURES.synthPage),
      composeCheckoutPreviewRouteViewModel(),
    ]);

    expect(publicModels).not.toMatch(
      /\$999|EXPLORE PURCHASE|CONCEPT INSTRUMENT|NOT AVAILABLE FOR SALE|preorder|stock|shipping estimate|tax estimate/i,
    );
  });

  it("rejects a missing required Editorial value instead of filling it from another owner", () => {
    const invalid = structuredClone(EDITORIAL_FIXTURES.homePage) as Record<
      string,
      unknown
    >;
    const opening = invalid.opening as Record<string, unknown>;
    delete opening.headline;

    expect(() => composeHomeRouteViewModel(invalid)).toThrowError(
      "homePage.opening.headline is required",
    );
  });

  it("rejects invalid Editorial values", () => {
    const invalid = structuredClone(EDITORIAL_FIXTURES.synthPage) as Record<
      string,
      unknown
    >;
    invalid.seoDescription = "Too short";

    expect(() => composeSynthRouteViewModel(invalid)).toThrowError(
      "synthPage.seoDescription must contain 120–160 characters",
    );
  });

  it("rejects cross-owner substitution in an Editorial projection", () => {
    const invalid = {
      ...structuredClone(EDITORIAL_FIXTURES.productPage),
      price: "$999",
    };

    expect(() => composeProductRouteViewModel(invalid)).toThrowError(
      'productPage.price is code-owned and cannot be supplied by Editorial content',
    );
  });
});

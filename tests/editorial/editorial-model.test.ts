import { evaluate, parse } from "groq-js";
import { describe, expect, it } from "vitest";

import { EDITORIAL_FIXTURES } from "@/src/editorial/fixtures.server";
import type {
  HomePageDocument,
  ProductPageDocument,
  SiteSettingsDocument,
  SynthPageDocument,
} from "@/sanity/editorial-types";
import {
  buildInitialEditorialSeed,
  type EditorialSeedBindings,
} from "@/sanity/seed/initial-editorial";
import { schemaTypes } from "@/sanity/schemaTypes";
import { EDITORIAL_PROJECTIONS } from "@/sanity/projections";
import { validateEditorialDataset } from "@/sanity/validation";

const bindings = {
  privacyNoticeUrl: "https://vanta.example/privacy",
  socialImages: {
    default: "image-1111111111111111111111111111111111111111-1200x630-jpg",
    home: "image-2222222222222222222222222222222222222222-1200x630-jpg",
    product: "image-3333333333333333333333333333333333333333-1200x630-jpg",
    synth: "image-4444444444444444444444444444444444444444-1200x630-jpg",
  },
} satisfies EditorialSeedBindings;

function cloneSeed() {
  return structuredClone(buildInitialEditorialSeed(bindings));
}

function schemaTypeNames(definition: unknown): string[] {
  if (definition === null || typeof definition !== "object") return [];
  const record = definition as Record<string, unknown>;
  const own = typeof record.type === "string" ? [record.type] : [];
  const fields = Array.isArray(record.fields) ? record.fields : [];
  const of = Array.isArray(record.of) ? record.of : [];
  return [
    ...own,
    ...fields.flatMap(schemaTypeNames),
    ...of.flatMap(schemaTypeNames),
  ];
}

describe("Editorial Sanity schema", () => {
  it("registers only the four fixed singletons and two approved inline objects", () => {
    expect(schemaTypes.map(({ name }) => name)).toEqual([
      "editorialImage",
      "seo",
      "siteSettings",
      "homePage",
      "productPage",
      "synthPage",
    ]);
    expect(schemaTypes.filter(({ type }) => type === "document").map(({ name }) => name)).toEqual([
      "siteSettings",
      "homePage",
      "productPage",
      "synthPage",
    ]);
    expect(schemaTypes.flatMap(schemaTypeNames)).not.toContain("block");
  });

  it("accepts the complete initial seed", () => {
    expect(validateEditorialDataset(cloneSeed())).toEqual([]);
  });

  it("rejects missing required content and invalid singleton identities", () => {
    const documents = cloneSeed();
    const home = documents.find(
      (document): document is HomePageDocument => document._type === "homePage",
    );
    expect(home).toBeDefined();
    delete (home?.opening as Record<string, unknown>).headline;
    (home as unknown as { _id: string })._id = "another-home";

    expect(validateEditorialDataset(documents)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "homePage._id",
          message: 'must equal the fixed singleton id "homePage"',
        }),
        expect.objectContaining({
          path: "homePage.opening.headline",
          message: "is required",
        }),
      ]),
    );
  });

  it("rejects bad links, duplicate descriptions, and incorrectly sized social images", () => {
    const documents = cloneSeed();
    const settings = documents.find(
      (document): document is SiteSettingsDocument =>
        document._type === "siteSettings",
    );
    const home = documents.find(
      (document): document is HomePageDocument => document._type === "homePage",
    );
    const product = documents.find(
      (document): document is ProductPageDocument =>
        document._type === "productPage",
    );
    const synth = documents.find(
      (document): document is SynthPageDocument => document._type === "synthPage",
    );
    expect(settings && home && product && synth).toBeTruthy();

    settings!.privacyNoticeUrl = "http://vanta.example/privacy";
    product!.seo.description = home!.seo.description;
    synth!.seo.description = "Too short";
    synth!.seo.socialImage.asset._ref = product!.seo.socialImage.asset._ref;
    home!.seo.socialImage.asset._ref =
      "image-2222222222222222222222222222222222222222-1199x630-jpg";

    expect(validateEditorialDataset(documents)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "siteSettings.privacyNoticeUrl" }),
        expect.objectContaining({ path: "productPage.seo.description" }),
        expect.objectContaining({ path: "synthPage.seo.description" }),
        expect.objectContaining({ path: "homePage.seo.socialImage.asset._ref" }),
        expect.objectContaining({ path: "synthPage.seo.socialImage.asset._ref" }),
      ]),
    );
  });

  it("requires contextual alt text and rejects Product-truth and ownership violations", () => {
    const documents = cloneSeed();
    const home = documents.find(
      (document): document is HomePageDocument => document._type === "homePage",
    );
    const product = documents.find(
      (document): document is ProductPageDocument =>
        document._type === "productPage",
    );
    expect(home && product).toBeTruthy();

    home!.opening.media = {
      _type: "editorialImage",
      presentation: "contextual",
      asset: {
        _type: "reference",
        _ref: "image-5555555555555555555555555555555555555555-1600x900-jpg",
      },
    };
    home!.opening.body = "Limited edition controller with a preset crossfade.";
    product!.craft.body = "x".repeat(361);
    Object.assign(product!, { price: "$999", specifications: { weight: "3 kg" } });

    expect(validateEditorialDataset(documents)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "homePage.opening.media.alt" }),
        expect.objectContaining({ path: "homePage.opening.body" }),
        expect.objectContaining({ path: "productPage.craft.body" }),
        expect.objectContaining({ path: "productPage.price" }),
        expect.objectContaining({ path: "productPage.specifications" }),
      ]),
    );
  });
});

describe("Editorial seed projections", () => {
  it("projects the approved seed into route-owned fixture shapes", async () => {
    const documents = cloneSeed();

    const homeValue = await evaluate(parse(EDITORIAL_PROJECTIONS.homePage), {
      dataset: documents,
    });
    const productValue = await evaluate(parse(EDITORIAL_PROJECTIONS.productPage), {
      dataset: documents,
    });
    const synthValue = await evaluate(parse(EDITORIAL_PROJECTIONS.synthPage), {
      dataset: documents,
    });

    const home = await homeValue.get();
    const product = await productValue.get();
    const synth = await synthValue.get();

    expect(home).toEqual(EDITORIAL_FIXTURES.homePage);
    expect(product).toEqual(EDITORIAL_FIXTURES.productPage);
    expect(synth).toEqual(EDITORIAL_FIXTURES.synthPage);
    expect(home).toMatchObject({
      seoDescription:
        "Discover MONOLITH, VANTA’s eight-voice hybrid desktop synthesizer, through a cinematic journey from deep SUB foundations to FRACTURE.",
      opening: { headline: "Sound, given mass." },
      chapters: { resolution: { headline: "Make it move." } },
    });
    expect(product).toMatchObject({
      hero: { subtitle: "Eight voices. One continuum." },
      craft: {
        body: expect.stringContaining("Bead-blasted graphite aluminum"),
      },
    });
    expect(synth).toMatchObject({
      category: "MORPH LAB",
      headline: "One gesture. Endless change.",
    });
  });

  it("keeps designed Home sequence and code-owned values out of projections", async () => {
    const value = await evaluate(parse(EDITORIAL_PROJECTIONS.homePage), {
      dataset: cloneSeed(),
    });
    const home = (await value.get()) as Record<string, unknown>;
    const chapters = home.chapters as Record<string, unknown>;

    expect(Object.keys(chapters)).toEqual([
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
    expect(JSON.stringify(home)).not.toMatch(
      /price|currency|specifications|controls|navigation|behavior/i,
    );
  });
});

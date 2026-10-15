import "server-only";

import { CATALOG } from "@/src/catalog/catalog";
import { PRODUCT_TRUTH } from "@/src/product/product-truth";

const HOME_CHAPTERS = [
  "philosophy",
  "reveal",
  "sub",
  "monolith",
  "morph",
  "gesture",
  "fracture",
  "craft",
  "resolution",
] as const;

const CODE_OWNED_FIELDS = new Set([
  "brand",
  "vendor",
  "product",
  "model",
  "category",
  "finish",
  "price",
  "currency",
  "quantity",
  "specifications",
  "controls",
  "navigation",
  "behavior",
]);

type UnknownRecord = Record<string, unknown>;

type EditorialSection = {
  headline: string;
  body: string;
};

function objectAt(
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }

  const record = value as UnknownRecord;
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) {
      if (CODE_OWNED_FIELDS.has(key)) {
        throw new Error(
          `${path}.${key} is code-owned and cannot be supplied by Editorial content`,
        );
      }
      throw new Error(`${path}.${key} is not an approved Editorial field`);
    }
  }
  return record;
}

function stringAt(record: UnknownRecord, key: string, path: string): string {
  const value = record[key];
  if (value === undefined) throw new Error(`${path}.${key} is required`);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path}.${key} must be a non-empty string`);
  }
  return value;
}

function seoDescriptionAt(record: UnknownRecord, path: string): string {
  const description = stringAt(record, "seoDescription", path);
  if (description.length < 120 || description.length > 160) {
    throw new Error(
      `${path}.seoDescription must contain 120–160 characters`,
    );
  }
  return description;
}

function sectionAt(value: unknown, path: string): EditorialSection {
  const section = objectAt(value, path, ["headline", "body"]);
  return {
    headline: stringAt(section, "headline", path),
    body: stringAt(section, "body", path),
  };
}

function parseHomeEditorial(input: unknown) {
  const page = objectAt(input, "homePage", [
    "seoDescription",
    "opening",
    "chapters",
    "labInvitation",
  ]);
  const opening = objectAt(page.opening, "homePage.opening", [
    "kicker",
    "headline",
    "body",
  ]);
  const chapters = objectAt(
    page.chapters,
    "homePage.chapters",
    HOME_CHAPTERS,
  );
  const labInvitation = objectAt(
    page.labInvitation,
    "homePage.labInvitation",
    ["category", "headline", "body"],
  );

  return {
    seoDescription: seoDescriptionAt(page, "homePage"),
    opening: {
      kicker: stringAt(opening, "kicker", "homePage.opening"),
      headline: stringAt(opening, "headline", "homePage.opening"),
      body: stringAt(opening, "body", "homePage.opening"),
    },
    chapters: HOME_CHAPTERS.map((id) => ({
      id,
      ...sectionAt(chapters[id], `homePage.chapters.${id}`),
    })),
    labInvitation: {
      category: stringAt(
        labInvitation,
        "category",
        "homePage.labInvitation",
      ),
      headline: stringAt(
        labInvitation,
        "headline",
        "homePage.labInvitation",
      ),
      body: stringAt(labInvitation, "body", "homePage.labInvitation"),
    },
  };
}

function parseProductEditorial(input: unknown) {
  const page = objectAt(input, "productPage", [
    "seoDescription",
    "hero",
    "thesis",
    "sonic",
    "states",
    "morph",
    "craft",
    "labInvitation",
  ]);
  const hero = objectAt(page.hero, "productPage.hero", ["subtitle", "body"]);
  const thesis = objectAt(page.thesis, "productPage.thesis", [
    "headline",
    "support",
  ]);
  const states = objectAt(page.states, "productPage.states", [
    "headline",
    "sub",
    "fracture",
  ]);
  const labInvitation = objectAt(
    page.labInvitation,
    "productPage.labInvitation",
    ["headline"],
  );

  return {
    seoDescription: seoDescriptionAt(page, "productPage"),
    hero: {
      subtitle: stringAt(hero, "subtitle", "productPage.hero"),
      body: stringAt(hero, "body", "productPage.hero"),
    },
    thesis: {
      headline: stringAt(thesis, "headline", "productPage.thesis"),
      support: stringAt(thesis, "support", "productPage.thesis"),
    },
    sonic: sectionAt(page.sonic, "productPage.sonic"),
    states: {
      headline: stringAt(states, "headline", "productPage.states"),
      sub: stringAt(states, "sub", "productPage.states"),
      fracture: stringAt(states, "fracture", "productPage.states"),
    },
    morph: sectionAt(page.morph, "productPage.morph"),
    craft: sectionAt(page.craft, "productPage.craft"),
    labInvitation: {
      headline: stringAt(
        labInvitation,
        "headline",
        "productPage.labInvitation",
      ),
    },
  };
}

function parseSynthEditorial(input: unknown) {
  const page = objectAt(input, "synthPage", [
    "seoDescription",
    "category",
    "headline",
    "introduction",
  ]);
  return {
    seoDescription: seoDescriptionAt(page, "synthPage"),
    category: stringAt(page, "category", "synthPage"),
    headline: stringAt(page, "headline", "synthPage"),
    introduction: stringAt(page, "introduction", "synthPage"),
  };
}

export function composeHomeRouteViewModel(editorial: unknown) {
  const page = parseHomeEditorial(editorial);
  return {
    route: "/" as const,
    title: "VANTA — Sound, given mass." as const,
    seoDescription: page.seoDescription,
    opening: {
      ...page.opening,
      action: { label: "ENTER MORPH LAB" as const, href: "/synth" as const },
    },
    chapters: page.chapters.map((chapter, index) => ({
      ...chapter,
      index: String(index + 1).padStart(2, "0"),
      ...(chapter.id === "resolution"
        ? {
            action: {
              label: "EXPLORE MONOLITH" as const,
              href: "/monolith" as const,
            },
          }
        : {}),
    })),
    labInvitation: {
      ...page.labInvitation,
      action: { label: "ENTER MORPH LAB" as const, href: "/synth" as const },
    },
    closing: {
      brand: PRODUCT_TRUTH.identity.brand,
      tagline: PRODUCT_TRUTH.claims[0],
    },
  };
}

export function composeProductRouteViewModel(editorial: unknown) {
  const page = parseProductEditorial(editorial);
  return {
    route: "/monolith" as const,
    title: "MONOLITH — Hybrid Polyphonic Synthesizer | VANTA" as const,
    seoDescription: page.seoDescription,
    hero: {
      identifier: "VANTA / INSTRUMENT 001" as const,
      name: PRODUCT_TRUTH.identity.model,
      ...page.hero,
      price: CATALOG.price.display,
      addToBagLabel: "ADD TO BAG" as const,
    },
    thesis: page.thesis,
    sonic: page.sonic,
    states: page.states,
    morph: page.morph,
    craft: page.craft,
    specifications: {
      architecture: PRODUCT_TRUTH.architecture,
      dimensions: PRODUCT_TRUTH.physical.dimensions,
      enclosure: PRODUCT_TRUTH.physical.enclosure,
      display: PRODUCT_TRUTH.physical.display,
      connections: PRODUCT_TRUTH.physical.connections,
      panelControls: PRODUCT_TRUTH.physical.panelControls,
      displayButtons: PRODUCT_TRUTH.physical.displayButtons,
    },
    labInvitation: {
      ...page.labInvitation,
      action: { label: "TRY MORPH LAB" as const, href: "/synth" as const },
    },
  };
}

export function composeSynthRouteViewModel(editorial: unknown) {
  const page = parseSynthEditorial(editorial);
  return {
    route: "/synth" as const,
    title: "MORPH Lab — Play MONOLITH | VANTA" as const,
    seoDescription: page.seoDescription,
    category: page.category,
    headline: page.headline,
    introduction: page.introduction,
    enableSoundLabel: "Enable Sound" as const,
    supportedControls: [
      "MORPH",
      "CUTOFF",
      "RESONANCE",
      "DRIVE",
      "ATTACK",
      "RELEASE",
    ] as const,
  };
}

export type HomeRouteViewModel = ReturnType<typeof composeHomeRouteViewModel>;
export type ProductRouteViewModel = ReturnType<
  typeof composeProductRouteViewModel
>;
export type SynthRouteViewModel = ReturnType<typeof composeSynthRouteViewModel>;

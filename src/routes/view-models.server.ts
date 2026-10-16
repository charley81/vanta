import "server-only";

import {
  EDITORIAL_LIMITS,
  validateApprovedLink,
  validateEditorialString,
  validateSeoDescription,
  validateSocialImage,
} from "@/sanity/validation";
import { CATALOG } from "@/src/catalog/catalog";
import { composeCheckoutPreviewRouteViewModel } from "@/src/checkout-preview/model";
import { PRODUCT_TRUTH } from "@/src/product/product-truth";

export { composeCheckoutPreviewRouteViewModel };

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

function stringAt(
  record: UnknownRecord,
  key: string,
  path: string,
  maximum: number,
): string {
  const value = record[key];
  const result = validateEditorialString(value, maximum);
  if (result !== true) throw new Error(`${path}.${key} ${result}`);
  return value as string;
}

function seoDescriptionAt(record: UnknownRecord, path: string): string {
  const description = record.seoDescription;
  const result = validateSeoDescription(description);
  if (result !== true) throw new Error(`${path}.seoDescription ${result}`);
  return description as string;
}

function sectionAt(value: unknown, path: string): EditorialSection {
  const section = objectAt(value, path, ["headline", "body"]);
  return {
    headline: stringAt(
      section,
      "headline",
      path,
      EDITORIAL_LIMITS.headline,
    ),
    body: stringAt(section, "body", path, EDITORIAL_LIMITS.prose),
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
      kicker: stringAt(
        opening,
        "kicker",
        "homePage.opening",
        EDITORIAL_LIMITS.label,
      ),
      headline: stringAt(
        opening,
        "headline",
        "homePage.opening",
        EDITORIAL_LIMITS.headline,
      ),
      body: stringAt(
        opening,
        "body",
        "homePage.opening",
        EDITORIAL_LIMITS.prose,
      ),
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
        EDITORIAL_LIMITS.label,
      ),
      headline: stringAt(
        labInvitation,
        "headline",
        "homePage.labInvitation",
        EDITORIAL_LIMITS.headline,
      ),
      body: stringAt(
        labInvitation,
        "body",
        "homePage.labInvitation",
        EDITORIAL_LIMITS.prose,
      ),
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
      subtitle: stringAt(
        hero,
        "subtitle",
        "productPage.hero",
        EDITORIAL_LIMITS.headline,
      ),
      body: stringAt(
        hero,
        "body",
        "productPage.hero",
        EDITORIAL_LIMITS.prose,
      ),
    },
    thesis: {
      headline: stringAt(
        thesis,
        "headline",
        "productPage.thesis",
        EDITORIAL_LIMITS.headline,
      ),
      support: stringAt(
        thesis,
        "support",
        "productPage.thesis",
        EDITORIAL_LIMITS.prose,
      ),
    },
    sonic: sectionAt(page.sonic, "productPage.sonic"),
    states: {
      headline: stringAt(
        states,
        "headline",
        "productPage.states",
        EDITORIAL_LIMITS.headline,
      ),
      sub: stringAt(
        states,
        "sub",
        "productPage.states",
        EDITORIAL_LIMITS.prose,
      ),
      fracture: stringAt(
        states,
        "fracture",
        "productPage.states",
        EDITORIAL_LIMITS.prose,
      ),
    },
    morph: sectionAt(page.morph, "productPage.morph"),
    craft: sectionAt(page.craft, "productPage.craft"),
    labInvitation: {
      headline: stringAt(
        labInvitation,
        "headline",
        "productPage.labInvitation",
        EDITORIAL_LIMITS.headline,
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
    category: stringAt(
      page,
      "category",
      "synthPage",
      EDITORIAL_LIMITS.label,
    ),
    headline: stringAt(
      page,
      "headline",
      "synthPage",
      EDITORIAL_LIMITS.headline,
    ),
    introduction: stringAt(
      page,
      "introduction",
      "synthPage",
      EDITORIAL_LIMITS.prose,
    ),
  };
}

export function composeSiteSettingsViewModel(editorial: unknown) {
  const settings = objectAt(editorial, "siteSettings", [
    "privacyNoticeUrl",
    "defaultSocialImage",
  ]);
  const privacyResult = validateApprovedLink(settings.privacyNoticeUrl);
  if (privacyResult !== true) {
    throw new Error(`siteSettings.privacyNoticeUrl ${privacyResult}`);
  }
  const imageResult = validateSocialImage(settings.defaultSocialImage);
  if (imageResult !== true) {
    throw new Error(`siteSettings.defaultSocialImage ${imageResult}`);
  }

  return {
    privacyNoticeUrl: settings.privacyNoticeUrl as string,
    defaultSocialImage: settings.defaultSocialImage,
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
      {
        name: "MORPH",
        value: 50,
        purpose: "Move continuously from SUB weight to FRACTURE texture.",
        endpoints: ["SUB", "FRACTURE"],
      },
      {
        name: "CUTOFF",
        value: 54,
        purpose: "Offset the voice toward darker or brighter filtering.",
        endpoints: ["DARK", "BRIGHT"],
      },
      {
        name: "RESONANCE",
        value: 32,
        purpose: "Emphasize the filter edge without changing the phrase.",
        endpoints: ["SOFT", "FOCUSED"],
      },
      {
        name: "DRIVE",
        value: 24,
        purpose: "Add bounded post-filter saturation.",
        endpoints: ["CLEAN", "SATURATED"],
      },
      {
        name: "ATTACK",
        value: 18,
        purpose: "Shape the onset from immediate to swelling.",
        endpoints: ["IMMEDIATE", "SWELLING"],
      },
      {
        name: "RELEASE",
        value: 42,
        purpose: "Shape the tail from clipped to overlapping.",
        endpoints: ["CLIPPED", "OVERLAPPING"],
      },
    ] as const,
  };
}

export type SiteSettingsViewModel = ReturnType<
  typeof composeSiteSettingsViewModel
>;
export type HomeRouteViewModel = ReturnType<typeof composeHomeRouteViewModel>;
export type ProductRouteViewModel = ReturnType<
  typeof composeProductRouteViewModel
>;
export type SynthRouteViewModel = ReturnType<typeof composeSynthRouteViewModel>;
export type CheckoutPreviewRouteViewModel = ReturnType<
  typeof composeCheckoutPreviewRouteViewModel
>;

import type {
  EditorialDocument,
  EditorialImage,
  EditorialSection,
} from "@/sanity/editorial-types";
import { INITIAL_EDITORIAL_PROJECTION_FIXTURES as copy } from "@/sanity/seed/initial-content";

export type EditorialSeedBindings = {
  privacyNoticeUrl: string;
  socialImages: {
    default: string;
    home: string;
    product: string;
    synth: string;
  };
};

function socialImage(assetReference: string, alt: string): EditorialImage {
  return {
    _type: "editorialImage",
    asset: { _type: "reference", _ref: assetReference },
    presentation: "contextual",
    alt,
  };
}

function section(value: { headline: string; body: string }): EditorialSection {
  return { _type: "object", ...value };
}

export function buildInitialEditorialSeed(
  bindings: EditorialSeedBindings,
): EditorialDocument[] {
  const homeChapters = copy.homePage.chapters;

  return [
    {
      _id: "siteSettings",
      _type: "siteSettings",
      privacyNoticeUrl: bindings.privacyNoticeUrl,
      defaultSocialImage: socialImage(
        bindings.socialImages.default,
        "VANTA — Sound, given mass.",
      ),
    },
    {
      _id: "homePage",
      _type: "homePage",
      seo: {
        _type: "seo",
        description: copy.homePage.seoDescription,
        socialImage: socialImage(
          bindings.socialImages.home,
          "MONOLITH emerging from darkness in the VANTA Home experience.",
        ),
      },
      opening: { _type: "object", ...copy.homePage.opening },
      chapters: {
        _type: "object",
        philosophy: section(homeChapters.philosophy),
        reveal: section(homeChapters.reveal),
        sub: section(homeChapters.sub),
        monolith: section(homeChapters.monolith),
        morph: section(homeChapters.morph),
        gesture: section(homeChapters.gesture),
        fracture: section(homeChapters.fracture),
        craft: section(homeChapters.craft),
        resolution: section(homeChapters.resolution),
      },
      labInvitation: {
        _type: "object",
        ...copy.homePage.labInvitation,
      },
    },
    {
      _id: "productPage",
      _type: "productPage",
      seo: {
        _type: "seo",
        description: copy.productPage.seoDescription,
        socialImage: socialImage(
          bindings.socialImages.product,
          "MONOLITH graphite desktop synthesizer product portrait.",
        ),
      },
      hero: { _type: "object", ...copy.productPage.hero },
      thesis: { _type: "object", ...copy.productPage.thesis },
      sonic: section(copy.productPage.sonic),
      states: { _type: "object", ...copy.productPage.states },
      morph: section(copy.productPage.morph),
      craft: section(copy.productPage.craft),
      labInvitation: {
        _type: "object",
        ...copy.productPage.labInvitation,
      },
    },
    {
      _id: "synthPage",
      _type: "synthPage",
      seo: {
        _type: "seo",
        description: copy.synthPage.seoDescription,
        socialImage: socialImage(
          bindings.socialImages.synth,
          "MONOLITH MORPH Lab control surface between SUB and FRACTURE.",
        ),
      },
      category: copy.synthPage.category,
      headline: copy.synthPage.headline,
      introduction: copy.synthPage.introduction,
    },
  ];
}

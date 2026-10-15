export type SanityImageReference = {
  _type: "reference";
  _ref: string;
};

export type EditorialImage = {
  _type: "editorialImage";
  asset: SanityImageReference;
  presentation: "contextual" | "decorative";
  alt?: string;
  caption?: string;
};

export type EditorialSeo = {
  _type: "seo";
  description: string;
  socialImage: EditorialImage;
};

export type EditorialSection = {
  _type: "object";
  headline: string;
  body: string;
  media?: EditorialImage;
};

export type SiteSettingsDocument = {
  _id: "siteSettings";
  _type: "siteSettings";
  privacyNoticeUrl: string;
  defaultSocialImage: EditorialImage;
};

export type HomePageDocument = {
  _id: "homePage";
  _type: "homePage";
  seo: EditorialSeo;
  opening: {
    _type: "object";
    kicker: string;
    headline: string;
    body: string;
    media?: EditorialImage;
  };
  chapters: {
    _type: "object";
    philosophy: EditorialSection;
    reveal: EditorialSection;
    sub: EditorialSection;
    monolith: EditorialSection;
    morph: EditorialSection;
    gesture: EditorialSection;
    fracture: EditorialSection;
    craft: EditorialSection;
    resolution: EditorialSection;
  };
  labInvitation: {
    _type: "object";
    category: string;
    headline: string;
    body: string;
    media?: EditorialImage;
  };
};

export type ProductPageDocument = {
  _id: "productPage";
  _type: "productPage";
  seo: EditorialSeo;
  hero: {
    _type: "object";
    subtitle: string;
    body: string;
    media?: EditorialImage;
  };
  thesis: {
    _type: "object";
    headline: string;
    support: string;
    media?: EditorialImage;
  };
  sonic: EditorialSection;
  states: {
    _type: "object";
    headline: string;
    sub: string;
    fracture: string;
    media?: EditorialImage;
  };
  morph: EditorialSection;
  craft: EditorialSection;
  labInvitation: {
    _type: "object";
    headline: string;
    media?: EditorialImage;
  };
};

export type SynthPageDocument = {
  _id: "synthPage";
  _type: "synthPage";
  seo: EditorialSeo;
  category: string;
  headline: string;
  introduction: string;
  media?: EditorialImage;
};

export type EditorialDocument =
  | SiteSettingsDocument
  | HomePageDocument
  | ProductPageDocument
  | SynthPageDocument;

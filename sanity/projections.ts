const SECTION_PROJECTION = `{headline, body}`;
const SEO_PROJECTION = `
    "seoDescription": seo.description,
    "socialImage": seo.socialImage{
      alt,
      "url": asset->url,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },`;

export const EDITORIAL_PROJECTIONS = {
  siteSettings: `*[_type == "siteSettings" && _id == "siteSettings"][0]{
    privacyNoticeUrl,
    defaultSocialImage{asset, presentation, alt, caption}
  }`,
  homePage: `*[_type == "homePage" && _id == "homePage"][0]{${SEO_PROJECTION}
    "opening": opening{kicker, headline, body},
    "chapters": chapters{
      "philosophy": philosophy${SECTION_PROJECTION},
      "reveal": reveal${SECTION_PROJECTION},
      "sub": sub${SECTION_PROJECTION},
      "monolith": monolith${SECTION_PROJECTION},
      "morph": morph${SECTION_PROJECTION},
      "gesture": gesture${SECTION_PROJECTION},
      "fracture": fracture${SECTION_PROJECTION},
      "craft": craft${SECTION_PROJECTION},
      "resolution": resolution${SECTION_PROJECTION}
    },
    "labInvitation": labInvitation{category, headline, body}
  }`,
  productPage: `*[_type == "productPage" && _id == "productPage"][0]{${SEO_PROJECTION}
    "hero": hero{subtitle, body},
    "thesis": thesis{headline, support},
    "sonic": sonic${SECTION_PROJECTION},
    "states": states{headline, sub, fracture},
    "morph": morph${SECTION_PROJECTION},
    "craft": craft${SECTION_PROJECTION},
    "labInvitation": labInvitation{headline}
  }`,
  synthPage: `*[_type == "synthPage" && _id == "synthPage"][0]{${SEO_PROJECTION}
    category,
    headline,
    introduction
  }`,
} as const;

export function publishedEditorialProjection(
  documentId: keyof typeof EDITORIAL_PROJECTIONS,
): string {
  return EDITORIAL_PROJECTIONS[documentId].replace("[0]{", "[0]{_rev,");
}

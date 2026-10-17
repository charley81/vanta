import type { Metadata } from "next";

import {
  type IndexableRoute,
  resolveCanonicalOrigin,
} from "@/src/discoverability/configuration";

export type SocialImage = {
  url: string;
  width: 1200;
  height: 630;
  alt: string;
};

export type IndexedRouteMetadata = {
  route: IndexableRoute;
  title: string;
  seoDescription: string;
  socialImage: SocialImage;
};

export function resolvePublicUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, `${resolveCanonicalOrigin()}/`).href;
}

export function buildIndexedRouteMetadata(
  model: IndexedRouteMetadata,
): Metadata {
  const canonical = resolvePublicUrl(model.route);
  const socialImage = {
    url: resolvePublicUrl(model.socialImage.url),
    width: model.socialImage.width,
    height: model.socialImage.height,
    alt: model.socialImage.alt,
    type: "image/jpeg",
  };

  return {
    title: { absolute: model.title },
    description: model.seoDescription,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "VANTA",
      title: model.title,
      description: model.seoDescription,
      url: canonical,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: model.title,
      description: model.seoDescription,
      images: [socialImage],
    },
  };
}

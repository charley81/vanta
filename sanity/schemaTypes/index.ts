import { editorialImage } from "@/sanity/schemaTypes/editorial-image";
import { homePage } from "@/sanity/schemaTypes/home-page";
import { productPage } from "@/sanity/schemaTypes/product-page";
import { seo } from "@/sanity/schemaTypes/seo";
import { siteSettings } from "@/sanity/schemaTypes/site-settings";
import { synthPage } from "@/sanity/schemaTypes/synth-page";

export const schemaTypes = [
  editorialImage,
  seo,
  siteSettings,
  homePage,
  productPage,
  synthPage,
];

import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { readPublishedEditorialProjection } from "@/src/editorial/source.server";
import {
  composeHomeRouteViewModel,
  composeProductRouteViewModel,
  composeSiteSettingsViewModel,
  composeSynthRouteViewModel,
} from "@/src/routes/view-models.server";

export const EDITORIAL_CACHE_TAGS = {
  siteSettings: "sanity:document:siteSettings",
  homePage: "sanity:document:homePage",
  productPage: "sanity:document:productPage",
  synthPage: "sanity:document:synthPage",
} as const;

export const EDITORIAL_CACHE_ARCHITECTURE = {
  life: "max",
  refresh: "stale-while-revalidate",
  scope: "deployment",
  requiresCrossRequestMemory: false,
  survivesDeployment: false,
} as const;

export async function getPublishedSiteSettings() {
  "use cache";
  cacheLife("max");
  cacheTag(EDITORIAL_CACHE_TAGS.siteSettings);

  return composeSiteSettingsViewModel(
    await readPublishedEditorialProjection("siteSettings"),
  );
}

export async function getPublishedHomeRouteViewModel() {
  "use cache";
  cacheLife("max");
  cacheTag(EDITORIAL_CACHE_TAGS.homePage);

  return composeHomeRouteViewModel(
    await readPublishedEditorialProjection("homePage"),
  );
}

export async function getPublishedProductRouteViewModel() {
  "use cache";
  cacheLife("max");
  cacheTag(EDITORIAL_CACHE_TAGS.productPage);

  return composeProductRouteViewModel(
    await readPublishedEditorialProjection("productPage"),
  );
}

export async function getPublishedSynthRouteViewModel() {
  "use cache";
  cacheLife("max");
  cacheTag(EDITORIAL_CACHE_TAGS.synthPage);

  return composeSynthRouteViewModel(
    await readPublishedEditorialProjection("synthPage"),
  );
}

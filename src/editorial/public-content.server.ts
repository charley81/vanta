import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { readPublishedEditorialSnapshotProjection } from "@/src/editorial/source.server";
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

function splitPublishedProjection(
  projection: unknown,
  documentId: string,
): { content: Record<string, unknown>; revision: string } {
  if (!projection || typeof projection !== "object" || Array.isArray(projection)) {
    throw new Error(`${documentId} must include its published revision`);
  }
  const { _rev: revision, ...content } = projection as Record<string, unknown>;
  if (typeof revision !== "string" || !revision) {
    throw new Error(`${documentId} must include its published revision`);
  }
  return { content, revision };
}

async function getPublishedSiteSettingsSnapshot() {
  "use cache";
  cacheLife("max");
  cacheTag(EDITORIAL_CACHE_TAGS.siteSettings);

  const { content, revision } = splitPublishedProjection(
    await readPublishedEditorialSnapshotProjection("siteSettings"),
    "siteSettings",
  );
  return { model: composeSiteSettingsViewModel(content), revision };
}

async function getPublishedHomeSnapshot() {
  "use cache";
  cacheLife("max");
  cacheTag(EDITORIAL_CACHE_TAGS.homePage);

  const { content, revision } = splitPublishedProjection(
    await readPublishedEditorialSnapshotProjection("homePage"),
    "homePage",
  );
  return { model: composeHomeRouteViewModel(content), revision };
}

async function getPublishedProductSnapshot() {
  "use cache";
  cacheLife("max");
  cacheTag(EDITORIAL_CACHE_TAGS.productPage);

  const { content, revision } = splitPublishedProjection(
    await readPublishedEditorialSnapshotProjection("productPage"),
    "productPage",
  );
  return { model: composeProductRouteViewModel(content), revision };
}

async function getPublishedSynthSnapshot() {
  "use cache";
  cacheLife("max");
  cacheTag(EDITORIAL_CACHE_TAGS.synthPage);

  const { content, revision } = splitPublishedProjection(
    await readPublishedEditorialSnapshotProjection("synthPage"),
    "synthPage",
  );
  return { model: composeSynthRouteViewModel(content), revision };
}

export async function getPublishedSiteSettings() {
  return (await getPublishedSiteSettingsSnapshot()).model;
}

export async function getPublishedHomeRouteViewModel() {
  return (await getPublishedHomeSnapshot()).model;
}

export async function getPublishedProductRouteViewModel() {
  return (await getPublishedProductSnapshot()).model;
}

export async function getPublishedSynthRouteViewModel() {
  return (await getPublishedSynthSnapshot()).model;
}

export async function getPublishedEditorialRevision(
  documentId: keyof typeof EDITORIAL_CACHE_TAGS,
): Promise<string> {
  switch (documentId) {
    case "siteSettings":
      return (await getPublishedSiteSettingsSnapshot()).revision;
    case "homePage":
      return (await getPublishedHomeSnapshot()).revision;
    case "productPage":
      return (await getPublishedProductSnapshot()).revision;
    case "synthPage":
      return (await getPublishedSynthSnapshot()).revision;
  }
}

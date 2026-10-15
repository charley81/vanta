import "server-only";

import { cookies, draftMode } from "next/headers";
import { connection } from "next/server";

import {
  getPublishedHomeRouteViewModel,
  getPublishedProductRouteViewModel,
  getPublishedSiteSettings,
  getPublishedSynthRouteViewModel,
} from "@/src/editorial/public-content.server";
import {
  EDITORIAL_PREVIEW_COOKIE,
  parseExactOrigin,
  verifyEditorialPreviewSession,
  type EditorialPreviewSession,
} from "@/src/editorial/preview-policy";
import {
  readPreviewEditorialProjection,
  readPublishedEditorialProjection,
} from "@/src/editorial/source.server";
import {
  composeHomeRouteViewModel,
  composeProductRouteViewModel,
  composeSiteSettingsViewModel,
  composeSynthRouteViewModel,
} from "@/src/routes/view-models.server";

type EditorialRequestState = {
  draftModeEnabled: boolean;
  preview: EditorialPreviewSession | null;
};

async function getEditorialRequestState(): Promise<EditorialRequestState> {
  const draftModeEnabled = (await draftMode()).isEnabled;
  if (!draftModeEnabled) return { draftModeEnabled, preview: null };

  await connection();
  const expectedStudioOrigin = parseExactOrigin(
    process.env.SANITY_STUDIO_ORIGIN,
    process.env.NODE_ENV !== "production",
  );
  if (!expectedStudioOrigin) return { draftModeEnabled, preview: null };
  const value = (await cookies()).get(EDITORIAL_PREVIEW_COOKIE)?.value;
  const session = await verifyEditorialPreviewSession(
    value,
    process.env.EDITORIAL_PREVIEW_SESSION_SECRET,
  );
  return {
    draftModeEnabled,
    preview: session?.studioOrigin === expectedStudioOrigin ? session : null,
  };
}

export async function getEditorialPreviewSession(): Promise<EditorialPreviewSession | null> {
  return (await getEditorialRequestState()).preview;
}

export async function getSiteSettingsForRequest() {
  const state = await getEditorialRequestState();
  if (state.preview) {
    return composeSiteSettingsViewModel(
      await readPreviewEditorialProjection(
        "siteSettings",
        state.preview.perspective,
      ),
    );
  }
  if (!state.draftModeEnabled) return getPublishedSiteSettings();
  return composeSiteSettingsViewModel(
    await readPublishedEditorialProjection("siteSettings"),
  );
}

export async function getPublishedHomeMetadataForRequest() {
  const state = await getEditorialRequestState();
  if (!state.draftModeEnabled) return getPublishedHomeRouteViewModel();
  return composeHomeRouteViewModel(
    await readPublishedEditorialProjection("homePage"),
  );
}

export async function getPublishedProductMetadataForRequest() {
  const state = await getEditorialRequestState();
  if (!state.draftModeEnabled) return getPublishedProductRouteViewModel();
  return composeProductRouteViewModel(
    await readPublishedEditorialProjection("productPage"),
  );
}

export async function getPublishedSynthMetadataForRequest() {
  const state = await getEditorialRequestState();
  if (!state.draftModeEnabled) return getPublishedSynthRouteViewModel();
  return composeSynthRouteViewModel(
    await readPublishedEditorialProjection("synthPage"),
  );
}

export async function getHomeRouteContentForRequest() {
  const state = await getEditorialRequestState();
  if (!state.preview) {
    const model = state.draftModeEnabled
      ? composeHomeRouteViewModel(
          await readPublishedEditorialProjection("homePage"),
        )
      : await getPublishedHomeRouteViewModel();
    return { model, preview: null };
  }
  const preview = state.preview;
  return {
    model: composeHomeRouteViewModel(
      await readPreviewEditorialProjection("homePage", preview.perspective),
    ),
    preview,
  };
}

export async function getProductRouteContentForRequest() {
  const state = await getEditorialRequestState();
  if (!state.preview) {
    const model = state.draftModeEnabled
      ? composeProductRouteViewModel(
          await readPublishedEditorialProjection("productPage"),
        )
      : await getPublishedProductRouteViewModel();
    return { model, preview: null };
  }
  const preview = state.preview;
  return {
    model: composeProductRouteViewModel(
      await readPreviewEditorialProjection("productPage", preview.perspective),
    ),
    preview,
  };
}

export async function getSynthRouteContentForRequest() {
  const state = await getEditorialRequestState();
  if (!state.preview) {
    const model = state.draftModeEnabled
      ? composeSynthRouteViewModel(
          await readPublishedEditorialProjection("synthPage"),
        )
      : await getPublishedSynthRouteViewModel();
    return { model, preview: null };
  }
  const preview = state.preview;
  return {
    model: composeSynthRouteViewModel(
      await readPreviewEditorialProjection("synthPage", preview.perspective),
    ),
    preview,
  };
}

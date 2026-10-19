import "server-only";

import { INITIAL_EDITORIAL_PROJECTION_FIXTURES } from "@/sanity/seed/initial-content";
import {
  type EditorialDocumentId,
  type PublishedSanityConfiguration,
  readSanityPublishedProjection,
} from "@/src/editorial/sanity-adapter.server";
import { type EditorialPreviewPerspective } from "@/src/editorial/preview-policy";
import { readSanityPreviewProjection } from "@/src/editorial/preview-adapter.server";

export type EditorialSourceConfiguration =
  | { mode: "fixture" }
  | ({ mode: "published" } & PublishedSanityConfiguration);

type EditorialEnvironment = Readonly<Record<string, string | undefined>>;

const LOCAL_SITE_SETTINGS_FIXTURE = {
  privacyNoticeUrl: "/privacy",
  defaultSocialImage: {
    _type: "editorialImage",
    asset: {
      _type: "reference",
      _ref: "image-localdefault-1200x630-jpg",
    },
    presentation: "contextual",
    alt: "VANTA — Sound, given mass.",
  },
} as const;

function requiredEnvironmentValue(
  environment: EditorialEnvironment,
  name: "SANITY_STUDIO_PROJECT_ID" | "SANITY_STUDIO_DATASET",
): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required when SANITY_CONTENT_SOURCE is published`,
    );
  }
  return value;
}

export function resolveEditorialSourceConfiguration(
  environment: EditorialEnvironment,
): EditorialSourceConfiguration {
  const requestedMode = environment.SANITY_CONTENT_SOURCE?.trim();
  if (
    requestedMode !== undefined &&
    requestedMode !== "fixture" &&
    requestedMode !== "published"
  ) {
    throw new Error(
      'SANITY_CONTENT_SOURCE must be either "fixture" or "published"',
    );
  }

  const hostedCandidate = environment.NETLIFY === "true";
  const mode = requestedMode ??
    (hostedCandidate || environment.CI === "true" ? "published" : "fixture");

  if (mode === "fixture") {
    if (hostedCandidate) {
      throw new Error(
        "Hosted Netlify candidates cannot use deterministic Editorial fixtures",
      );
    }
    return { mode };
  }

  return {
    mode,
    projectId: requiredEnvironmentValue(
      environment,
      "SANITY_STUDIO_PROJECT_ID",
    ),
    dataset: requiredEnvironmentValue(environment, "SANITY_STUDIO_DATASET"),
  };
}

function readFixtureProjection(documentId: EditorialDocumentId): unknown {
  const projection =
    documentId === "siteSettings"
      ? LOCAL_SITE_SETTINGS_FIXTURE
      : INITIAL_EDITORIAL_PROJECTION_FIXTURES[documentId];
  return { ...projection, _rev: `fixture-${documentId}` };
}

export async function readPublishedEditorialSnapshotProjection(
  documentId: EditorialDocumentId,
): Promise<unknown> {
  const configuration = resolveEditorialSourceConfiguration(process.env);
  if (configuration.mode === "fixture") {
    return readFixtureProjection(documentId);
  }
  return readSanityPublishedProjection(configuration, documentId);
}

function stripEditorialSystemFields(projection: unknown): unknown {
  if (!projection || typeof projection !== "object" || Array.isArray(projection)) {
    return projection;
  }
  const content = { ...(projection as Record<string, unknown>) };
  delete content._rev;
  return content;
}

export async function readPublishedEditorialProjection(
  documentId: EditorialDocumentId,
): Promise<unknown> {
  return stripEditorialSystemFields(
    await readPublishedEditorialSnapshotProjection(documentId),
  );
}

export async function readPreviewEditorialProjection(
  documentId: EditorialDocumentId,
  perspective: EditorialPreviewPerspective,
): Promise<unknown> {
  const configuration = resolveEditorialSourceConfiguration(process.env);
  if (configuration.mode === "fixture") {
    return stripEditorialSystemFields(readFixtureProjection(documentId));
  }
  const token = process.env.SANITY_API_READ_TOKEN?.trim();
  if (!token) {
    throw new Error("SANITY_API_READ_TOKEN is required for Editorial preview");
  }
  return stripEditorialSystemFields(
    await readSanityPreviewProjection(
      { ...configuration, token },
      documentId,
      perspective,
    ),
  );
}

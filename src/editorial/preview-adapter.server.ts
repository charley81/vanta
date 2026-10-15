import "server-only";

import { createClient, type ClientPerspective, type SanityClient } from "@sanity/client";

import { EDITORIAL_PROJECTIONS } from "@/sanity/projections";
import type {
  EditorialDocumentId,
  PublishedSanityConfiguration,
} from "@/src/editorial/sanity-adapter.server";
import type { EditorialPreviewPerspective } from "@/src/editorial/preview-policy";

export type PreviewSanityConfiguration = PublishedSanityConfiguration & {
  token: string;
};

type PreviewProjectionFetcher = (
  query: string,
  parameters: Record<string, never>,
  options: { perspective: ClientPerspective },
) => Promise<unknown>;

export type PreviewEditorialAdapter = {
  read(
    documentId: EditorialDocumentId,
    perspective: EditorialPreviewPerspective,
  ): Promise<unknown>;
};

export class PreviewEditorialUnavailableError extends Error {
  constructor(documentId: EditorialDocumentId) {
    super(`Preview Editorial ${documentId} is unavailable`);
    this.name = "PreviewEditorialUnavailableError";
  }
}

export function createPreviewEditorialAdapter(
  fetchProjection: PreviewProjectionFetcher,
): PreviewEditorialAdapter {
  return {
    async read(documentId, perspective) {
      try {
        return await fetchProjection(EDITORIAL_PROJECTIONS[documentId], {}, {
          perspective: [...perspective],
        });
      } catch {
        throw new PreviewEditorialUnavailableError(documentId);
      }
    },
  };
}

let activeClient: { key: string; client: SanityClient } | undefined;

function getPreviewClient(configuration: PreviewSanityConfiguration): SanityClient {
  const key = `${configuration.projectId}/${configuration.dataset}`;
  if (activeClient?.key === key) return activeClient.client;

  const client = createClient({
    ...configuration,
    apiVersion: "2026-10-15",
    perspective: "drafts",
    requestTagPrefix: "vanta.private-editorial-preview",
    useCdn: false,
  });
  activeClient = { key, client };
  return client;
}

export async function readSanityPreviewProjection(
  configuration: PreviewSanityConfiguration,
  documentId: EditorialDocumentId,
  perspective: EditorialPreviewPerspective,
): Promise<unknown> {
  const client = getPreviewClient(configuration);
  const adapter = createPreviewEditorialAdapter((query, parameters, options) =>
    client.fetch(query, parameters, options),
  );
  return adapter.read(documentId, perspective);
}

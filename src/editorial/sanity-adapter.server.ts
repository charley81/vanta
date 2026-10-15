import "server-only";

import { createClient, type SanityClient } from "@sanity/client";

import { EDITORIAL_PROJECTIONS } from "@/sanity/projections";

export const EDITORIAL_DOCUMENT_IDS = [
  "siteSettings",
  "homePage",
  "productPage",
  "synthPage",
] as const;

export type EditorialDocumentId = (typeof EDITORIAL_DOCUMENT_IDS)[number];

export type PublishedSanityConfiguration = {
  projectId: string;
  dataset: string;
};

type ProjectionFetcher = (
  query: string,
  parameters: Record<string, never>,
  options: { perspective: "published" },
) => Promise<unknown>;

export type PublishedEditorialAdapter = {
  read(documentId: EditorialDocumentId): Promise<unknown>;
};

export class PublishedEditorialUnavailableError extends Error {
  constructor(documentId: EditorialDocumentId) {
    super(`Published Editorial ${documentId} is unavailable`);
    this.name = "PublishedEditorialUnavailableError";
  }
}

export function createPublishedEditorialAdapter(
  fetchProjection: ProjectionFetcher,
): PublishedEditorialAdapter {
  return {
    async read(documentId) {
      try {
        return await fetchProjection(
          EDITORIAL_PROJECTIONS[documentId],
          {},
          { perspective: "published" },
        );
      } catch {
        throw new PublishedEditorialUnavailableError(documentId);
      }
    },
  };
}

let activeClient:
  | { key: string; client: SanityClient }
  | undefined;

function getPublishedClient(
  configuration: PublishedSanityConfiguration,
): SanityClient {
  const key = `${configuration.projectId}/${configuration.dataset}`;
  if (activeClient?.key === key) return activeClient.client;

  const client = createClient({
    ...configuration,
    apiVersion: "2026-10-15",
    perspective: "published",
    requestTagPrefix: "vanta.public-editorial",
    // Next Cache Components are the public cache authority. Reading the API
    // directly avoids filling a newly-invalidated entry from a stale CDN edge.
    useCdn: false,
  });
  activeClient = { key, client };
  return client;
}

export async function readSanityPublishedProjection(
  configuration: PublishedSanityConfiguration,
  documentId: EditorialDocumentId,
): Promise<unknown> {
  const client = getPublishedClient(configuration);
  const adapter = createPublishedEditorialAdapter((query, parameters, options) =>
    client.fetch(query, parameters, options),
  );
  return adapter.read(documentId);
}

import "server-only";

import type { EditorialDocumentId } from "@/src/editorial/sanity-adapter.server";
import { EDITORIAL_DOCUMENT_IDS } from "@/src/editorial/sanity-adapter.server";
import { parseExactOrigin } from "@/src/editorial/preview-policy";

export const MAXIMUM_INVALIDATION_BODY_BYTES = 8 * 1_024;

export type EditorialInvalidationPayload = {
  documentId: EditorialDocumentId;
  revision: string;
};

export type EditorialInvalidationConfiguration = {
  publicOrigin: string;
  secret: string;
};

type InvalidationEnvironment = Readonly<Record<string, string | undefined>>;

const REVISION = /^[A-Za-z0-9._-]{1,128}$/;
const RETRY_DELAYS_MS = [0, 250, 500, 1_000, 1_500] as const;
const FRESHNESS_REQUEST_TIMEOUT_MS = 1_000;

export function resolveEditorialInvalidationConfiguration(
  environment: InvalidationEnvironment,
): EditorialInvalidationConfiguration {
  const secret = environment.SANITY_WEBHOOK_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    secret.length > 256 ||
    /\s/u.test(secret)
  ) {
    throw new Error("SANITY_WEBHOOK_SECRET must contain 32 to 256 characters");
  }
  const publicOrigin = parseExactOrigin(
    environment.PUBLIC_SITE_ORIGIN,
    environment.NODE_ENV !== "production",
  );
  if (!publicOrigin) {
    throw new Error("PUBLIC_SITE_ORIGIN must be an exact HTTPS origin");
  }
  return { publicOrigin, secret };
}

export async function readBoundedRequestBody(
  request: Request,
  maximumBytes = MAXIMUM_INVALIDATION_BODY_BYTES,
): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximumBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export function parseEditorialInvalidationPayload(
  body: string,
): EditorialInvalidationPayload | null {
  if (new TextEncoder().encode(body).byteLength > MAXIMUM_INVALIDATION_BODY_BYTES) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    Object.keys(candidate).sort().join(",") !== "documentId,revision" ||
    typeof candidate.documentId !== "string" ||
    !EDITORIAL_DOCUMENT_IDS.includes(
      candidate.documentId as EditorialDocumentId,
    ) ||
    typeof candidate.revision !== "string" ||
    !REVISION.test(candidate.revision)
  ) {
    return null;
  }
  return {
    documentId: candidate.documentId as EditorialDocumentId,
    revision: candidate.revision,
  };
}

export async function verifyPublicEditorialFreshness(
  configuration: EditorialInvalidationConfiguration,
  payload: EditorialInvalidationPayload,
  dependencies: {
    fetch: typeof fetch;
    sleep?: (milliseconds: number) => Promise<void>;
  },
): Promise<boolean> {
  const sleep = dependencies.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const url = new URL("/api/editorial/freshness", configuration.publicOrigin);
  url.searchParams.set("document", payload.documentId);
  url.searchParams.set("revision", payload.revision);

  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) await sleep(delay);
    try {
      const response = await dependencies.fetch(url, {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(FRESHNESS_REQUEST_TIMEOUT_MS),
      });
      if (response.status === 200) {
        const result: unknown = await response.json();
        if (
          result &&
          typeof result === "object" &&
          !Array.isArray(result) &&
          (result as { fresh?: unknown }).fresh === true
        ) {
          return true;
        }
      }
    } catch {
      // A bounded retry handles propagation delay and transient network failure.
    }
  }
  return false;
}

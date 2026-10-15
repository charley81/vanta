import { NextResponse } from "next/server";

import { getPublishedEditorialRevision } from "@/src/editorial/public-content.server";
import { EDITORIAL_DOCUMENT_IDS, type EditorialDocumentId } from "@/src/editorial/sanity-adapter.server";
import {
  consumeRateLimit,
  requestRateLimitKey,
} from "@/src/security/rate-limit.server";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export async function GET(request: Request): Promise<Response> {
  const rateLimit = consumeRateLimit(
    "editorial-freshness",
    requestRateLimitKey(request),
    120,
    60_000,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { fresh: false },
      {
        status: 429,
        headers: {
          ...PRIVATE_HEADERS,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const parameters = new URL(request.url).searchParams;
  const documentValues = parameters.getAll("document");
  const revisionValues = parameters.getAll("revision");
  if (
    [...parameters.keys()].some(
      (key) => key !== "document" && key !== "revision",
    ) ||
    documentValues.length !== 1 ||
    revisionValues.length !== 1 ||
    !EDITORIAL_DOCUMENT_IDS.includes(documentValues[0] as EditorialDocumentId) ||
    !/^[A-Za-z0-9._-]{1,128}$/u.test(revisionValues[0])
  ) {
    return NextResponse.json(
      { fresh: false },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  try {
    const currentRevision = await getPublishedEditorialRevision(
      documentValues[0] as EditorialDocumentId,
    );
    const fresh = currentRevision === revisionValues[0];
    return NextResponse.json(
      { fresh },
      { status: fresh ? 200 : 409, headers: PRIVATE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { fresh: false },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}

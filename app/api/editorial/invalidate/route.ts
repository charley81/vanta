import { isValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  MAXIMUM_INVALIDATION_BODY_BYTES,
  parseEditorialInvalidationPayload,
  readBoundedRequestBody,
  resolveEditorialInvalidationConfiguration,
  verifyPublicEditorialFreshness,
} from "@/src/editorial/invalidation.server";
import { EDITORIAL_CACHE_TAGS } from "@/src/editorial/public-content.server";
import {
  consumeRateLimit,
  requestRateLimitKey,
} from "@/src/security/rate-limit.server";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function result(status: number, body: Record<string, boolean>): Response {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  const rateLimit = consumeRateLimit(
    "editorial-invalidation",
    requestRateLimitKey(request),
    60,
    60_000,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { accepted: false },
      {
        status: 429,
        headers: {
          ...PRIVATE_HEADERS,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return result(415, { accepted: false });
  }
  const statedLength = Number(request.headers.get("content-length") ?? "0");
  if (
    !Number.isFinite(statedLength) ||
    statedLength < 0 ||
    statedLength > MAXIMUM_INVALIDATION_BODY_BYTES
  ) {
    return result(413, { accepted: false });
  }

  let configuration;
  try {
    configuration = resolveEditorialInvalidationConfiguration(process.env);
  } catch {
    return result(503, { accepted: false });
  }

  const body = await readBoundedRequestBody(request);
  if (body === null) return result(413, { accepted: false });
  const signature = request.headers.get(SIGNATURE_HEADER_NAME);
  if (
    !signature ||
    !(await isValidSignature(body, signature, configuration.secret))
  ) {
    return result(401, { accepted: false });
  }
  const payload = parseEditorialInvalidationPayload(body);
  if (!payload) return result(400, { accepted: false });

  // Expiring an already-expired tag is safe, so webhook retries and replays are
  // idempotent and cannot broaden invalidation beyond the fixed document map.
  revalidateTag(EDITORIAL_CACHE_TAGS[payload.documentId], "max");
  const fresh = await verifyPublicEditorialFreshness(configuration, payload, {
    fetch,
  });
  if (!fresh) {
    return NextResponse.json(
      { accepted: true, fresh: false },
      {
        status: 503,
        headers: { ...PRIVATE_HEADERS, "Retry-After": "5" },
      },
    );
  }
  return result(200, { accepted: true, fresh: true });
}

import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { createClient } from "@sanity/client";
import { cookies, draftMode } from "next/headers";
import {
  EDITORIAL_PREVIEW_COOKIE,
  EDITORIAL_PREVIEW_TTL_SECONDS,
  parseEditorialPreviewPerspective,
  parseEditorialPreviewTarget,
  parseExactOrigin,
  signEditorialPreviewSession,
} from "@/src/editorial/preview-policy";
import { resolveEditorialSourceConfiguration } from "@/src/editorial/source.server";
import {
  consumeRateLimit,
  requestRateLimitKey,
} from "@/src/security/rate-limit.server";

function privateResponse(
  message: string,
  status: number,
  additionalHeaders?: HeadersInit,
): Response {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      ...additionalHeaders,
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  if (request.url.length > 4_096) {
    return privateResponse("Preview URL is too long", 414);
  }
  const rateLimit = consumeRateLimit(
    "editorial-preview-entry",
    requestRateLimitKey(request),
    20,
    60_000,
  );
  if (!rateLimit.allowed) {
    return privateResponse("Too many requests", 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  let configuration: ReturnType<typeof resolveEditorialSourceConfiguration>;
  try {
    configuration = resolveEditorialSourceConfiguration(process.env);
  } catch {
    return privateResponse("Editorial preview is unavailable", 503);
  }
  const token = process.env.SANITY_API_READ_TOKEN?.trim();
  const sessionSecret = process.env.EDITORIAL_PREVIEW_SESSION_SECRET;
  const expectedStudioOrigin = parseExactOrigin(
    process.env.SANITY_STUDIO_ORIGIN,
    process.env.NODE_ENV !== "production",
  );
  if (configuration.mode !== "published" || !token || !expectedStudioOrigin) {
    return privateResponse("Editorial preview is unavailable", 503);
  }

  const client = createClient({
    ...configuration,
    apiVersion: "2026-10-15",
    perspective: "drafts",
    requestTagPrefix: "vanta.preview-authentication",
    token,
    useCdn: false,
  });

  let validation: Awaited<ReturnType<typeof validatePreviewUrl>>;
  try {
    validation = await validatePreviewUrl(client, request.url);
  } catch {
    return privateResponse("Editorial preview authorization failed", 401);
  }
  const target = parseEditorialPreviewTarget(validation.redirectTo);
  const perspective = parseEditorialPreviewPerspective(
    validation.studioPreviewPerspective,
  );
  if (
    !validation.isValid ||
    !target ||
    !perspective ||
    validation.studioPreviewVariant != null ||
    validation.studioOrigin !== expectedStudioOrigin
  ) {
    return privateResponse("Editorial preview authorization failed", 401);
  }

  const now = Date.now();
  const session = await signEditorialPreviewSession(
    {
      version: 1,
      perspective,
      studioOrigin: expectedStudioOrigin,
      expiresAt: now + EDITORIAL_PREVIEW_TTL_SECONDS * 1_000,
    },
    sessionSecret,
  );
  if (!session) {
    return privateResponse("Editorial preview is unavailable", 503);
  }

  (await draftMode()).enable();
  const secure =
    process.env.NODE_ENV === "production" ||
    new URL(request.url).protocol === "https:";
  (await cookies()).set(EDITORIAL_PREVIEW_COOKIE, session, {
    httpOnly: true,
    maxAge: EDITORIAL_PREVIEW_TTL_SECONDS,
    path: "/",
    priority: "high",
    sameSite: secure ? "none" : "lax",
    secure,
  });
  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Location: target,
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

import { type NextRequest, NextResponse } from "next/server";

import {
  EDITORIAL_PREVIEW_COOKIE,
  EDITORIAL_PREVIEW_TARGETS,
  parseExactOrigin,
  verifyEditorialPreviewSession,
} from "@/src/editorial/preview-policy";
import {
  previewContentSecurityPolicy,
  publicContentSecurityPolicy,
  RESTRICTIVE_PERMISSIONS_POLICY,
} from "@/src/security/response-policy";

const NOINDEX = "noindex, nofollow, noarchive";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const development = process.env.NODE_ENV === "development";
  const studioOrigin = parseExactOrigin(
    process.env.SANITY_STUDIO_ORIGIN,
    development,
  );
  const session = await verifyEditorialPreviewSession(
    request.cookies.get(EDITORIAL_PREVIEW_COOKIE)?.value,
    process.env.EDITORIAL_PREVIEW_SESSION_SECRET,
  );
  const previewStudioOrigin =
    session && studioOrigin && session.studioOrigin === studioOrigin
      ? studioOrigin
      : null;
  const isPreviewSession = previewStudioOrigin !== null;
  const isPreviewTarget = Object.hasOwn(
    EDITORIAL_PREVIEW_TARGETS,
    request.nextUrl.pathname,
  );
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const isDeployPreview = process.env.CONTEXT === "deploy-preview";

  response.headers.set(
    "Content-Security-Policy",
    previewStudioOrigin && isPreviewTarget
      ? previewContentSecurityPolicy(previewStudioOrigin, development)
      : publicContentSecurityPolicy(development),
  );
  response.headers.set("Permissions-Policy", RESTRICTIVE_PERMISSIONS_POLICY);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");

  if (isPreviewSession && isPreviewTarget) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    response.headers.set("X-Robots-Tag", NOINDEX);
  } else {
    response.headers.set("X-Frame-Options", "DENY");
  }

  if (isApi || isDeployPreview || isPreviewSession) {
    response.headers.set("X-Robots-Tag", NOINDEX);
  }
  if (isApi) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

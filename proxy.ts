import { type NextRequest, NextResponse } from "next/server";

import {
  canonicalRedirectUrl,
  isIndexablePath,
  isNonProductionDeployment,
} from "@/src/discoverability/configuration";
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

function applyPublicResponseHeaders(
  response: NextResponse,
  development: boolean,
): void {
  response.headers.set(
    "Content-Security-Policy",
    publicContentSecurityPolicy(development),
  );
  response.headers.set("Permissions-Policy", RESTRICTIVE_PERMISSIONS_POLICY);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  if (
    process.env.CONTEXT === "production" ||
    process.env.NETLIFY === "true"
  ) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  }
}

export async function proxy(request: NextRequest) {
  const development = process.env.NODE_ENV === "development";
  const redirectUrl = canonicalRedirectUrl(request.nextUrl, process.env);
  if (redirectUrl) {
    const redirect = NextResponse.redirect(redirectUrl, 308);
    applyPublicResponseHeaders(redirect, development);
    return redirect;
  }

  const response = NextResponse.next();
  const studioOrigin = parseExactOrigin(
    process.env.SANITY_STUDIO_ORIGIN,
    development,
  );
  const presentationOrigin = parseExactOrigin(
    process.env.SANITY_PRESENTATION_ORIGIN,
    development,
  );
  const session = await verifyEditorialPreviewSession(
    request.cookies.get(EDITORIAL_PREVIEW_COOKIE)?.value,
    process.env.EDITORIAL_PREVIEW_SESSION_SECRET,
  );
  const isPreviewSession = Boolean(
    session && studioOrigin && session.studioOrigin === studioOrigin,
  );
  const previewFrameAncestors =
    isPreviewSession && presentationOrigin && studioOrigin
      ? [presentationOrigin, studioOrigin]
      : null;
  const isPreviewTarget = Object.hasOwn(
    EDITORIAL_PREVIEW_TARGETS,
    request.nextUrl.pathname,
  );
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const nonProductionDeployment = isNonProductionDeployment(process.env);

  applyPublicResponseHeaders(response, development);
  response.headers.set(
    "Content-Security-Policy",
    previewFrameAncestors && isPreviewTarget
      ? previewContentSecurityPolicy(previewFrameAncestors, development)
      : publicContentSecurityPolicy(development),
  );

  if (isPreviewSession && isPreviewTarget) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    response.headers.set("X-Robots-Tag", NOINDEX);
  }
  if (previewFrameAncestors && isPreviewTarget) {
    response.headers.delete("X-Frame-Options");
  } else {
    response.headers.set("X-Frame-Options", "DENY");
  }

  if (
    !isIndexablePath(request.nextUrl.pathname) ||
    nonProductionDeployment ||
    isPreviewSession
  ) {
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

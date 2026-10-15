import { cookies, draftMode } from "next/headers";
import { getEditorialPreviewSession } from "@/src/editorial/preview-content.server";
import { EDITORIAL_PREVIEW_COOKIE } from "@/src/editorial/preview-policy";

function privateResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const sameOriginRequest =
    origin === requestOrigin ||
    (origin === "null" && request.headers.get("sec-fetch-site") === "same-origin");
  if (!sameOriginRequest || !(await getEditorialPreviewSession())) {
    return privateResponse("Forbidden", 403);
  }

  (await draftMode()).disable();
  (await cookies()).delete(EDITORIAL_PREVIEW_COOKIE);
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Location: "/",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

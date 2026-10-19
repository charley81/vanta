export const RESTRICTIVE_PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "browsing-topics=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

function policy(directives: readonly string[]): string {
  return directives.join("; ");
}

function exactFrameAncestor(origin: string, development: boolean): string {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("Editorial preview frame ancestor must be an exact HTTPS origin");
  }
  const localDevelopmentOrigin =
    development &&
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (
    (url.protocol !== "https:" && !localDevelopmentOrigin) ||
    origin !== url.origin ||
    url.username ||
    url.password ||
    url.hostname.includes("*")
  ) {
    throw new Error("Editorial preview frame ancestor must be an exact HTTPS origin");
  }
  return url.origin;
}

export function publicContentSecurityPolicy(development = false): string {
  return policy([
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.sanity.io",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "connect-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]);
}

export function previewContentSecurityPolicy(
  studioOrigin: string,
  development = false,
): string {
  const frameAncestor = exactFrameAncestor(studioOrigin, development);
  return policy([
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.sanity.io",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "connect-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestor}`,
  ]);
}

export const BOUND_PRODUCTION_ORIGIN =
  "https://vanta-monolith.netlify.app" as const;

export const INDEXABLE_ROUTES = ["/", "/monolith", "/synth"] as const;

export type IndexableRoute = (typeof INDEXABLE_ROUTES)[number];

type Environment = Readonly<Record<string, string | undefined>>;

const LEGACY_ROUTES: Readonly<Record<string, IndexableRoute | "/checkout-preview">> = {
  "/home": "/",
  "/product": "/monolith",
  "/products/monolith": "/monolith",
  "/morph-lab": "/synth",
  "/checkout": "/checkout-preview",
};

function validCanonicalOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VANTA_PRODUCTION_ORIGIN must be an absolute HTTPS origin");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "VANTA_PRODUCTION_ORIGIN must be an HTTPS origin without credentials, path, query, or fragment",
    );
  }

  return url.origin;
}

export function resolveCanonicalOrigin(
  environment: Environment = process.env,
): string {
  const explicit = environment.VANTA_PRODUCTION_ORIGIN?.trim();
  const netlifyOrigin =
    environment.NETLIFY === "true" ? environment.URL?.trim() : undefined;
  return validCanonicalOrigin(
    explicit || netlifyOrigin || BOUND_PRODUCTION_ORIGIN,
  );
}

export function isNonProductionDeployment(
  environment: Environment = process.env,
): boolean {
  if (environment.CONTEXT === "deploy-preview") return true;
  return (
    environment.NETLIFY === "true" &&
    Boolean(environment.CONTEXT) &&
    environment.CONTEXT !== "production"
  );
}

export function isIndexablePath(pathname: string): pathname is IndexableRoute {
  return INDEXABLE_ROUTES.some((route) => route === pathname);
}

function withoutTrailingSlash(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

export function canonicalRedirectUrl(
  requestUrl: URL,
  environment: Environment = process.env,
): URL | null {
  const normalizedPath = withoutTrailingSlash(requestUrl.pathname);
  const canonicalPath = LEGACY_ROUTES[normalizedPath] ?? normalizedPath;
  const productionRequest = environment.CONTEXT === "production";
  const destinationOrigin = productionRequest
    ? resolveCanonicalOrigin(environment)
    : requestUrl.origin;
  const destination = new URL(canonicalPath, destinationOrigin);
  destination.search = requestUrl.search;

  const requestComparable = `${requestUrl.origin}${requestUrl.pathname}${requestUrl.search}`;
  return destination.href === requestComparable ? null : destination;
}

import "server-only";

import { resolveBagMode } from "@/src/bag/configuration";
import { CATALOG } from "@/src/catalog/catalog";
import { resolveCanonicalOrigin } from "@/src/discoverability/configuration";
import {
  EDITORIAL_PREVIEW_COOKIE,
  verifyEditorialPreviewSession,
} from "@/src/editorial/preview-policy";
import {
  consumeRateLimit,
  requestRateLimitKey,
} from "@/src/security/rate-limit.server";

export const BAG_COOKIE_NAME = "__Host-vanta_bag";
export const BAG_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

type BagAction = "read" | "add" | "remove";

const BAG_SCHEMA_VERSION = 1;
const MAXIMUM_COOKIE_BYTES = 1_024;
const MAXIMUM_REQUEST_BODY_BYTES = 64;
const BAG_PATHS: Record<BagAction, string> = {
  read: "/api/bag",
  add: "/api/bag/add",
  remove: "/api/bag/remove",
};
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "Content-Type": "application/json; charset=utf-8",
  Pragma: "no-cache",
  Vary: "Cookie, Origin",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

type BagCookiePayload = {
  v: 1;
  m: true;
  e: number;
};
type EnabledConfiguration = {
  status: "enabled";
  keys: Uint8Array<ArrayBuffer>[];
};
type BagConfiguration = EnabledConfiguration | { status: "disabled" };
type DecodedBag = {
  expiresAt: number;
  needsRotation: boolean;
};
type CookieState =
  | { kind: "absent" }
  | { kind: "invalid" }
  | ({ kind: "populated" } & DecodedBag);

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(
      normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
    );
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return encodeBase64Url(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function resolveConfiguration(
  environment: NodeJS.ProcessEnv,
): BagConfiguration {
  const mode = resolveBagMode(environment.BAG_MODE);
  if (mode === "disabled") return { status: "disabled" };

  const values = environment.BAG_SIGNING_KEYS?.split(",") ?? [];
  if (values.length === 0 || values.length > 3 || new Set(values).size !== values.length) {
    return { status: "disabled" };
  }
  const keys = values.map(decodeBase64Url);
  if (keys.some((key) => !key || key.byteLength < 32 || key.byteLength > 64)) {
    return { status: "disabled" };
  }
  return {
    status: "enabled",
    keys: keys as Uint8Array<ArrayBuffer>[],
  };
}

async function importKey(bytes: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    bytes,
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

async function signCookie(
  expiresAt: number,
  configuration: EnabledConfiguration,
): Promise<string> {
  const payload = encodeBase64Url(
    new TextEncoder().encode(
      JSON.stringify({ v: BAG_SCHEMA_VERSION, m: true, e: expiresAt }),
    ),
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await importKey(configuration.keys[0]),
      new TextEncoder().encode(payload),
    ),
  );
  return `${payload}.${encodeBase64Url(signature)}`;
}

function exactPayload(value: unknown, now: number): value is BagCookiePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<BagCookiePayload>;
  return (
    Object.keys(value).length === 3 &&
    candidate.v === BAG_SCHEMA_VERSION &&
    candidate.m === true &&
    typeof candidate.e === "number" &&
    Number.isSafeInteger(candidate.e) &&
    candidate.e > now &&
    candidate.e <= now + BAG_LIFETIME_SECONDS * 1_000
  );
}

async function decodeCookie(
  value: string | null,
  configuration: EnabledConfiguration,
  now: number,
): Promise<CookieState> {
  if (value === null) return { kind: "absent" };
  if (value.length === 0 || value.length > MAXIMUM_COOKIE_BYTES) {
    return { kind: "invalid" };
  }
  const [payload, signatureValue, extra] = value.split(".");
  if (!payload || !signatureValue || extra) return { kind: "invalid" };
  const payloadBytes = decodeBase64Url(payload);
  const signature = decodeBase64Url(signatureValue);
  if (!payloadBytes || !signature) return { kind: "invalid" };

  let verifiedKey = -1;
  for (let index = 0; index < configuration.keys.length; index += 1) {
    if (
      await crypto.subtle.verify(
        "HMAC",
        await importKey(configuration.keys[index]),
        signature,
        new TextEncoder().encode(payload),
      )
    ) {
      verifiedKey = index;
      break;
    }
  }
  if (verifiedKey < 0) return { kind: "invalid" };

  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return { kind: "invalid" };
  }
  if (!exactPayload(decoded, now)) return { kind: "invalid" };
  return {
    kind: "populated",
    expiresAt: decoded.e,
    needsRotation: verifiedKey > 0,
  };
}

function requestCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

function body(expiresAt: number | null) {
  if (expiresAt === null) {
    return {
      schemaVersion: BAG_SCHEMA_VERSION,
      item: null,
      subtotal: null,
      expiresAt: null,
    };
  }
  return {
    schemaVersion: BAG_SCHEMA_VERSION,
    item: {
      brand: CATALOG.vendor,
      name: CATALOG.product,
      category: CATALOG.category,
      finish: CATALOG.finish,
      price: CATALOG.price,
    },
    subtotal: CATALOG.price,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function json(value: unknown, status = 200, additionalHeaders?: HeadersInit): Response {
  return Response.json(value, {
    status,
    headers: { ...NO_STORE_HEADERS, ...additionalHeaders },
  });
}

function error(
  status: number,
  code: string,
  message: string,
  additionalHeaders?: HeadersInit,
): Response {
  return json({ error: { code, message } }, status, additionalHeaders);
}

function setBagCookie(response: Response, value: string, expiresAt: number): void {
  response.headers.append(
    "Set-Cookie",
    `${BAG_COOKIE_NAME}=${value}; Path=/; Expires=${new Date(expiresAt).toUTCString()}; Max-Age=${Math.max(0, Math.floor((expiresAt - Date.now()) / 1_000))}; Secure; HttpOnly; SameSite=Strict; Priority=High`,
  );
}

function clearBagCookie(response: Response): void {
  response.headers.append(
    "Set-Cookie",
    `${BAG_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure; HttpOnly; SameSite=Strict; Priority=High`,
  );
}

function isSecureProductionRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function exactRequestUrl(request: Request, action: BagAction): boolean {
  try {
    const url = new URL(request.url);
    return (
      url.pathname === BAG_PATHS[action] &&
      url.search === "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

function isBoundNetlifyDeploymentOrigin(
  originUrl: URL,
  boundUrl: URL,
): boolean {
  const deploymentSuffix = `--${boundUrl.hostname}`;
  if (
    boundUrl.protocol !== "https:" ||
    !boundUrl.hostname.endsWith(".netlify.app") ||
    originUrl.protocol !== "https:" ||
    originUrl.port ||
    !originUrl.hostname.endsWith(deploymentSuffix)
  ) {
    return false;
  }
  const deploymentId = originUrl.hostname.slice(0, -deploymentSuffix.length);
  return /^[a-f0-9]{24}$/u.test(deploymentId);
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    if (origin !== originUrl.origin) return false;
    if (
      originUrl.origin === requestUrl.origin ||
      isBoundNetlifyDeploymentOrigin(originUrl, requestUrl)
    ) {
      return true;
    }
    if (process.env.NODE_ENV !== "production") return false;

    const canonicalUrl = new URL(resolveCanonicalOrigin(process.env));
    return (
      originUrl.origin === canonicalUrl.origin ||
      isBoundNetlifyDeploymentOrigin(originUrl, canonicalUrl)
    );
  } catch {
    return false;
  }
}

type MutationBodyResult =
  | "valid"
  | "invalid"
  | "unsupported-media-type"
  | "too-large";

async function validateMutationBody(
  request: Request,
): Promise<MutationBodyResult> {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return "unsupported-media-type";
  }
  const statedLength = request.headers.get("content-length");
  if (statedLength !== null) {
    const length = Number(statedLength);
    if (!Number.isSafeInteger(length) || length < 0) return "invalid";
    if (length > MAXIMUM_REQUEST_BODY_BYTES) return "too-large";
  }
  if (!request.body) return "invalid";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAXIMUM_REQUEST_BODY_BYTES) {
      await reader.cancel();
      return "too-large";
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length === 0
      ? "valid"
      : "invalid";
  } catch {
    return "invalid";
  }
}

export async function handleBagRequest(
  request: Request,
  action: BagAction,
): Promise<Response> {
  const configuration = resolveConfiguration(process.env);
  if (configuration.status === "disabled") {
    return error(503, "bag_disabled", "Bag is temporarily unavailable.", {
      "Retry-After": "60",
    });
  }
  if (!isSecureProductionRequest(request)) {
    return error(
      403,
      "https_required",
      "Bag is available only over a secure connection.",
    );
  }

  if (action !== "read") {
    const limit = consumeRateLimit(
      `bag-${action}`,
      requestRateLimitKey(request),
      30,
      60_000,
    );
    if (!limit.allowed) {
      return error(429, "rate_limited", "Too many Bag requests. Try again shortly.", {
        "Retry-After": String(limit.retryAfterSeconds),
      });
    }
  }
  if (!exactRequestUrl(request, action)) {
    return error(400, "invalid_request", "The Bag request is invalid.");
  }

  if (action !== "read") {
    if (!sameOrigin(request)) {
      return error(403, "invalid_origin", "The Bag request origin is invalid.");
    }
    if (
      await verifyEditorialPreviewSession(
        requestCookie(request, EDITORIAL_PREVIEW_COOKIE),
        process.env.EDITORIAL_PREVIEW_SESSION_SECRET,
      )
    ) {
      return error(
        403,
        "bag_read_only",
        "Bag changes are unavailable during Editorial preview.",
      );
    }
    const mutationBody = await validateMutationBody(request);
    if (mutationBody === "unsupported-media-type") {
      return error(
        415,
        "unsupported_media_type",
        "Bag mutations require application/json.",
      );
    }
    if (mutationBody === "too-large") {
      return error(413, "payload_too_large", "The Bag request is too large.");
    }
    if (mutationBody === "invalid") {
      return error(400, "invalid_request", "The Bag request is invalid.");
    }
  }

  const now = Date.now();
  const rawCookie = requestCookie(request, BAG_COOKIE_NAME);
  const state = await decodeCookie(rawCookie, configuration, now);

  if (action === "remove") {
    const response = json(body(null));
    if (rawCookie !== null) clearBagCookie(response);
    return response;
  }

  const expiresAt =
    action === "add"
      ? state.kind === "populated"
        ? state.expiresAt
        : now + BAG_LIFETIME_SECONDS * 1_000
      : state.kind === "populated"
        ? state.expiresAt
        : null;
  const response = json(body(expiresAt));

  if (
    expiresAt !== null &&
    (action === "add" ||
      (state.kind === "populated" && state.needsRotation))
  ) {
    setBagCookie(response, await signCookie(expiresAt, configuration), expiresAt);
  } else if (state.kind === "invalid") {
    clearBagCookie(response);
  }
  return response;
}

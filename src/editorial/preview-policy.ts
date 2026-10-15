export const EDITORIAL_PREVIEW_COOKIE = "vanta_editorial_preview";
export const EDITORIAL_PREVIEW_TTL_SECONDS = 60 * 60;

export const EDITORIAL_PREVIEW_TARGETS = {
  "/": "homePage",
  "/monolith": "productPage",
  "/synth": "synthPage",
} as const;

export type EditorialPreviewTarget = keyof typeof EDITORIAL_PREVIEW_TARGETS;
export type EditorialPreviewPerspective = readonly [
  ...(string[]),
  "drafts",
];

export type EditorialPreviewSession = {
  version: 1;
  perspective: EditorialPreviewPerspective;
  studioOrigin: string;
  expiresAt: number;
};

const RELEASE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const RESERVED_PERSPECTIVES = new Set(["published", "drafts", "raw", "previewDrafts"]);
const MINIMUM_SECRET_LENGTH = 32;
const MAXIMUM_PERSPECTIVE_DEPTH = 5;

function toBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function validSecret(secret: string | undefined): secret is string {
  return Boolean(
    secret &&
      secret.length >= MINIMUM_SECRET_LENGTH &&
      secret.length <= 256 &&
      !/\s/u.test(secret),
  );
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

export function parseEditorialPreviewPerspective(
  value: string | null | undefined,
): EditorialPreviewPerspective | null {
  if (!value || value.length > 650) return null;
  const parts = value.split(",");
  if (
    parts.length === 0 ||
    parts.length > MAXIMUM_PERSPECTIVE_DEPTH ||
    parts.at(-1) !== "drafts"
  ) {
    return null;
  }
  const releases = parts.slice(0, -1);
  if (
    releases.some(
      (release, index) =>
        !RELEASE_ID.test(release) ||
        RESERVED_PERSPECTIVES.has(release) ||
        releases.indexOf(release) !== index,
    )
  ) {
    return null;
  }
  return parts as unknown as EditorialPreviewPerspective;
}

export function parseEditorialPreviewTarget(
  value: string | null | undefined,
): EditorialPreviewTarget | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value, "https://preview.invalid");
  } catch {
    return null;
  }
  if (
    url.origin !== "https://preview.invalid" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return null;
  }
  return Object.hasOwn(EDITORIAL_PREVIEW_TARGETS, url.pathname)
    ? (url.pathname as EditorialPreviewTarget)
    : null;
}

export function parseExactOrigin(
  value: string | null | undefined,
  allowLocalhost = false,
): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const isLocal =
    allowLocalhost &&
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (
    (url.protocol !== "https:" && !isLocal) ||
    url.username ||
    url.password ||
    url.hostname.includes("*") ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    return null;
  }
  return url.origin;
}

export async function signEditorialPreviewSession(
  session: EditorialPreviewSession,
  secret: string | undefined,
): Promise<string | null> {
  if (!validSecret(secret)) return null;
  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(session)),
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await importHmacKey(secret),
      new TextEncoder().encode(payload),
    ),
  );
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifyEditorialPreviewSession(
  value: string | null | undefined,
  secret: string | undefined,
  now = Date.now(),
): Promise<EditorialPreviewSession | null> {
  if (!value || !validSecret(secret) || value.length > 2_048) return null;
  const [payload, signatureValue, extra] = value.split(".");
  if (!payload || !signatureValue || extra) return null;
  const signature = fromBase64Url(signatureValue);
  const payloadBytes = fromBase64Url(payload);
  if (!signature || !payloadBytes) return null;
  const verified = await crypto.subtle.verify(
    "HMAC",
    await importHmacKey(secret),
    signature,
    new TextEncoder().encode(payload),
  );
  if (!verified) return null;

  let candidate: unknown;
  try {
    candidate = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  const session = candidate as Partial<EditorialPreviewSession>;
  const perspective = parseEditorialPreviewPerspective(
    Array.isArray(session.perspective) ? session.perspective.join(",") : null,
  );
  const studioOrigin = parseExactOrigin(session.studioOrigin);
  if (
    session.version !== 1 ||
    !perspective ||
    !studioOrigin ||
    typeof session.expiresAt !== "number" ||
    !Number.isSafeInteger(session.expiresAt) ||
    session.expiresAt <= now ||
    session.expiresAt > now + EDITORIAL_PREVIEW_TTL_SECONDS * 1_000
  ) {
    return null;
  }
  return {
    version: 1,
    perspective,
    studioOrigin,
    expiresAt: session.expiresAt,
  };
}

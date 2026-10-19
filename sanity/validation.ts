import type { EditorialDocument } from "@/sanity/editorial-types";

export type EditorialValidationIssue = {
  path: string;
  message: string;
};

export const EDITORIAL_LIMITS = {
  label: 48,
  headline: 80,
  prose: 360,
  alt: 180,
  caption: 180,
  seoDescriptionMin: 120,
  seoDescriptionMax: 160,
} as const;

export const SINGLETON_TYPES = [
  "siteSettings",
  "homePage",
  "productPage",
  "synthPage",
] as const;

export const HOME_CHAPTERS = [
  "philosophy",
  "reveal",
  "sub",
  "monolith",
  "morph",
  "gesture",
  "fracture",
  "craft",
  "resolution",
] as const;

const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "brand",
  "vendor",
  "product",
  "model",
  "productType",
  "finish",
  "price",
  "currency",
  "quantity",
  "specification",
  "specifications",
  "controls",
  "navigation",
  "behavior",
  "bag",
  "checkout",
]);

const PROHIBITED_COPY = [
  /\baward(?:ed|-winning)?\b/i,
  /\blimited edition\b/i,
  /\b(?:selling fast|only \d+ (?:left|remaining)|scarce|scarcity)\b/i,
  /\bendors(?:ed|ement)\b/i,
  /\b(?:made|manufactured|built) in [A-Z][A-Za-z]+\b/,
  /\bbest[- ]in[- ]class\b/i,
  /\b(?:in stock|pre-?order|buy now|checkout)\b/i,
  /\b(?:preset switch|sample crossfade|crossfader|volume blend|renamed cutoff)\b/i,
  /\b(?:software synth|controller)\b/i,
  /\b(?:weighs? \d+|\d+(?:\.\d+)?\s?(?:kg|lb|lbs|watts?|volts?))\b/i,
  /\b(?:warranty|included accessories|regulatory certification)\b/i,
] as const;

const HTML_OR_LINK = /<\/?[a-z][^>]*>|https?:\/\/|\[[^\]]+\]\([^)]+\)/i;
const IMAGE_REFERENCE = /^image-[A-Za-z0-9]+-(\d+)x(\d+)-[a-z0-9]+$/i;
const APPROVED_INTERNAL_LINKS = new Set(["/privacy"]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function atPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    return isRecord(current) ? current[segment] : undefined;
  }, value);
}

function imageDimensions(reference: unknown): { width: number; height: number } | null {
  if (typeof reference !== "string") return null;
  const match = IMAGE_REFERENCE.exec(reference);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

export function validateEditorialString(
  value: unknown,
  maximum: number,
): true | string {
  if (typeof value !== "string" || value.trim() === "") {
    return "is required";
  }
  if (value.length > maximum) {
    return `must contain no more than ${maximum} characters`;
  }
  if (HTML_OR_LINK.test(value)) {
    return "must be plain text without HTML or embedded links";
  }
  if (PROHIBITED_COPY.some((pattern) => pattern.test(value))) {
    return "contains a prohibited Product-truth or commerce claim";
  }
  return true;
}

export function validateSeoDescription(value: unknown): true | string {
  const basic = validateEditorialString(value, EDITORIAL_LIMITS.seoDescriptionMax);
  if (basic !== true) return basic;
  if ((value as string).length < EDITORIAL_LIMITS.seoDescriptionMin) {
    return `must contain ${EDITORIAL_LIMITS.seoDescriptionMin}–${EDITORIAL_LIMITS.seoDescriptionMax} characters`;
  }
  return true;
}

export function validateApprovedLink(value: unknown): true | string {
  if (typeof value !== "string" || value.trim() === "") return "is required";
  if (APPROVED_INTERNAL_LINKS.has(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      ? true
      : "must be an approved internal destination or an HTTPS URL";
  } catch {
    return "must be an approved internal destination or an HTTPS URL";
  }
}

function forbiddenAuthorityPaths(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      forbiddenAuthorityPaths(item, `${path}.${index}`),
    );
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    return FORBIDDEN_AUTHORITY_KEYS.has(key)
      ? [childPath]
      : forbiddenAuthorityPaths(child, childPath);
  });
}

export function validateOwnership(value: unknown): true | string {
  const [path] = forbiddenAuthorityPaths(value);
  return path
    ? `${path} is code-owned and cannot be supplied by Editorial content`
    : true;
}

export function validateSingletonId(
  expected: (typeof SINGLETON_TYPES)[number],
): (value: unknown) => true | string {
  return (value) =>
    value === expected || value === `drafts.${expected}`
      ? true
      : `must equal the fixed singleton id "${expected}"`;
}

export function validateEditorialImage(value: unknown): true | string {
  if (!isRecord(value)) return "is required";
  const asset = value.asset;
  if (!isRecord(asset) || asset._type !== "reference" || !imageDimensions(asset._ref)) {
    return "must reference a valid Sanity image asset";
  }
  if (value.presentation !== "contextual" && value.presentation !== "decorative") {
    return "must declare contextual or decorative presentation";
  }
  if (value.presentation === "contextual") {
    const alt = validateEditorialString(value.alt, EDITORIAL_LIMITS.alt);
    if (alt !== true) return `alt ${alt}`;
  }
  if (
    value.presentation === "decorative" &&
    value.alt !== undefined &&
    value.alt !== null &&
    value.alt !== ""
  ) {
    return "decorative images must use empty alternative text";
  }
  if (value.caption !== undefined && value.caption !== null) {
    const caption = validateEditorialString(value.caption, EDITORIAL_LIMITS.caption);
    if (caption !== true) return `caption ${caption}`;
  }
  return true;
}

export function validateSocialImage(value: unknown): true | string {
  const editorialImage = validateEditorialImage(value);
  if (editorialImage !== true) return editorialImage;
  const image = value as UnknownRecord;
  if (image.presentation !== "contextual") {
    return "social images must be contextual and have alternative text";
  }
  const asset = image.asset as UnknownRecord;
  const dimensions = imageDimensions(asset._ref);
  return dimensions?.width === 1200 && dimensions.height === 630
    ? true
    : "must be a dedicated 1200×630 image";
}

function addResult(
  issues: EditorialValidationIssue[],
  path: string,
  result: true | string,
): void {
  if (result !== true) issues.push({ path, message: result });
}

function validateRequiredText(
  issues: EditorialValidationIssue[],
  document: unknown,
  documentType: string,
  paths: readonly string[],
): void {
  for (const path of paths) {
    const field = path.split(".").at(-1) ?? "";
    const maximum = ["kicker", "category"].includes(field)
      ? EDITORIAL_LIMITS.label
      : ["headline", "subtitle"].includes(field)
        ? EDITORIAL_LIMITS.headline
        : EDITORIAL_LIMITS.prose;
    addResult(
      issues,
      `${documentType}.${path}`,
      validateEditorialString(atPath(document, path), maximum),
    );
  }
}

function visitEditorialValues(
  value: unknown,
  path: string,
  issues: EditorialValidationIssue[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitEditorialValues(item, `${path}.${index}`, issues));
    return;
  }
  if (!isRecord(value)) return;

  if (value._type === "editorialImage") {
    const result = validateEditorialImage(value);
    if (result !== true) {
      const imagePath = result.startsWith("alt ") ? `${path}.alt` : path;
      issues.push({ path: imagePath, message: result });
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    visitEditorialValues(child, path ? `${path}.${key}` : key, issues);
  }
}

const REQUIRED_TEXT_PATHS = {
  homePage: [
    "opening.kicker",
    "opening.headline",
    "opening.body",
    ...HOME_CHAPTERS.flatMap((chapter) => [
      `chapters.${chapter}.headline`,
      `chapters.${chapter}.body`,
    ]),
    "labInvitation.category",
    "labInvitation.headline",
    "labInvitation.body",
  ],
  productPage: [
    "hero.subtitle",
    "hero.body",
    "thesis.headline",
    "thesis.support",
    "sonic.headline",
    "sonic.body",
    "states.headline",
    "states.sub",
    "states.fracture",
    "morph.headline",
    "morph.body",
    "craft.headline",
    "craft.body",
    "labInvitation.headline",
  ],
  synthPage: ["category", "headline", "introduction"],
} as const;

export function validateEditorialDataset(
  documents: readonly unknown[],
): EditorialValidationIssue[] {
  const issues: EditorialValidationIssue[] = [];
  const byType = new Map<string, UnknownRecord[]>();

  for (const document of documents) {
    if (!isRecord(document) || typeof document._type !== "string") {
      issues.push({ path: "dataset", message: "contains a document without a type" });
      continue;
    }
    const candidates = byType.get(document._type) ?? [];
    candidates.push(document);
    byType.set(document._type, candidates);
  }

  for (const type of SINGLETON_TYPES) {
    const candidates = byType.get(type) ?? [];
    if (candidates.length === 0) {
      issues.push({ path: type, message: "singleton is required" });
      continue;
    }
    if (candidates.length > 1) {
      issues.push({ path: type, message: "must contain exactly one singleton" });
    }
    const document = candidates[0];
    addResult(issues, `${type}._id`, validateSingletonId(type)(document._id));

    for (const ownershipPath of forbiddenAuthorityPaths(document)) {
      issues.push({
        path: `${type}.${ownershipPath}`,
        message: "is code-owned and cannot be supplied by Editorial content",
      });
    }

    visitEditorialValues(document, type, issues);

    if (type === "siteSettings") {
      addResult(
        issues,
        "siteSettings.privacyNoticeUrl",
        validateApprovedLink(document.privacyNoticeUrl),
      );
      addResult(
        issues,
        "siteSettings.defaultSocialImage",
        validateSocialImage(document.defaultSocialImage),
      );
      continue;
    }

    const seo = isRecord(document.seo) ? document.seo : {};
    addResult(
      issues,
      `${type}.seo.description`,
      validateSeoDescription(seo.description),
    );
    const socialResult = validateSocialImage(seo.socialImage);
    if (socialResult !== true) {
      const path = socialResult.includes("1200×630")
        ? `${type}.seo.socialImage.asset._ref`
        : `${type}.seo.socialImage`;
      issues.push({ path, message: socialResult });
    }
    validateRequiredText(
      issues,
      document,
      type,
      REQUIRED_TEXT_PATHS[type],
    );
  }

  for (const type of byType.keys()) {
    if (!SINGLETON_TYPES.includes(type as (typeof SINGLETON_TYPES)[number])) {
      issues.push({ path: type, message: "is not an approved Editorial document type" });
    }
  }

  const indexedTypes = ["homePage", "productPage", "synthPage"] as const;
  const descriptions = new Map<string, string>();
  const socialReferences = new Map<string, string>();
  for (const type of indexedTypes) {
    const document = byType.get(type)?.[0];
    const seo = isRecord(document?.seo) ? document.seo : undefined;
    if (typeof seo?.description === "string") {
      const owner = descriptions.get(seo.description);
      if (owner) {
        issues.push({
          path: `${type}.seo.description`,
          message: `must be unique; it duplicates ${owner}.seo.description`,
        });
      } else descriptions.set(seo.description, type);
    }
    const socialImage = isRecord(seo?.socialImage) ? seo.socialImage : undefined;
    const asset = isRecord(socialImage?.asset) ? socialImage.asset : undefined;
    if (typeof asset?._ref === "string") {
      const owner = socialReferences.get(asset._ref);
      if (owner) {
        issues.push({
          path: `${type}.seo.socialImage.asset._ref`,
          message: `must be dedicated; it duplicates ${owner}.seo.socialImage`,
        });
      } else socialReferences.set(asset._ref, type);
    }
  }

  return issues;
}

export function assertValidEditorialDataset(
  documents: readonly EditorialDocument[],
): void {
  const issues = validateEditorialDataset(documents);
  if (issues.length > 0) {
    throw new Error(
      `Editorial seed validation failed:\n${issues
        .map(({ path, message }) => `- ${path}: ${message}`)
        .join("\n")}`,
    );
  }
}

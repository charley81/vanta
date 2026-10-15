import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { imageSize } from "image-size";

import { buildInitialEditorialSeed } from "@/sanity/seed/initial-editorial";
import { schemaTypes } from "@/sanity/schemaTypes";
import { validateEditorialDataset } from "@/sanity/validation";

function nestedTypes(definition: unknown): string[] {
  if (definition === null || typeof definition !== "object") return [];
  const record = definition as Record<string, unknown>;
  return [
    ...(typeof record.type === "string" ? [record.type] : []),
    ...(Array.isArray(record.fields) ? record.fields.flatMap(nestedTypes) : []),
    ...(Array.isArray(record.of) ? record.of.flatMap(nestedTypes) : []),
  ];
}

const expectedTypes = [
  "editorialImage",
  "seo",
  "siteSettings",
  "homePage",
  "productPage",
  "synthPage",
];
const actualTypes = schemaTypes.map(({ name }) => name);
if (JSON.stringify(actualTypes) !== JSON.stringify(expectedTypes)) {
  throw new Error(`Unexpected schema types: ${actualTypes.join(", ")}`);
}
if (schemaTypes.flatMap(nestedTypes).includes("block")) {
  throw new Error("Portable Text is outside the Editorial authority boundary");
}

const assetNames = ["default", "home", "product", "synth"] as const;
const socialImages = Object.fromEntries(
  assetNames.map((name, index) => {
    const source = readFileSync(
      fileURLToPath(
        new URL(`../sanity/seed/assets/${name}-social.jpg`, import.meta.url),
      ),
    );
    const { width, height } = imageSize(source);
    if (width !== 1200 || height !== 630) {
      throw new Error(`${name}-social.jpg must be 1200 × 630`);
    }
    return [
      name,
      `image-${String(index + 1).repeat(40)}-1200x630-jpg`,
    ] as const;
  }),
) as Record<(typeof assetNames)[number], string>;

const documents = buildInitialEditorialSeed({
  privacyNoticeUrl: "/privacy",
  socialImages,
});
const issues = validateEditorialDataset(documents);
if (issues.length > 0) {
  throw new Error(
    issues.map(({ path, message }) => `${path}: ${message}`).join("\n"),
  );
}

console.log("Schema report: PASS");
console.log(`- Registered types: ${actualTypes.join(", ")}`);
console.log("- Fixed documents: siteSettings, homePage, productPage, synthPage");
console.log("- Generic pages, sections, Portable Text, and authority fields: absent");
console.log("Seed validation report: PASS");
console.log(`- Validated singletons: ${documents.length}`);
console.log("- Indexed SEO descriptions: 3 unique values, each 120–160 characters");
console.log("- Dedicated social images: 3 route images at 1200 × 630");

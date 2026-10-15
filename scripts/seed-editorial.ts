import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createClient,
  type IdentifiedSanityDocumentStub,
} from "@sanity/client";

import { buildInitialEditorialSeed } from "@/sanity/seed/initial-editorial";
import {
  assertValidEditorialDataset,
  validateApprovedLink,
} from "@/sanity/validation";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET;
const token = process.env.SANITY_API_WRITE_TOKEN;
const privacyNoticeUrl = process.env.SANITY_PRIVACY_NOTICE_URL;

const missing = Object.entries({
  SANITY_STUDIO_PROJECT_ID: projectId,
  SANITY_STUDIO_DATASET: dataset,
  SANITY_API_WRITE_TOKEN: token,
  SANITY_PRIVACY_NOTICE_URL: privacyNoticeUrl,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const linkResult = validateApprovedLink(privacyNoticeUrl);
if (linkResult !== true) {
  throw new Error(`SANITY_PRIVACY_NOTICE_URL ${linkResult}`);
}

const client = createClient({
  projectId: projectId!,
  dataset: dataset!,
  token: token!,
  apiVersion: "2026-10-15",
  useCdn: false,
});

const assets = {
  default: "default-social.jpg",
  home: "home-social.jpg",
  product: "product-social.jpg",
  synth: "synth-social.jpg",
} as const;

const uploadedAssets = await Promise.all(
  Object.entries(assets).map(async ([name, filename]) => {
    const path = fileURLToPath(
      new URL(`../sanity/seed/assets/${filename}`, import.meta.url),
    );
    const asset = await client.assets.upload("image", createReadStream(path), {
      contentType: "image/jpeg",
      filename,
    });
    return [name, asset._id] as const;
  }),
);

const socialImages = Object.fromEntries(uploadedAssets) as Record<
  keyof typeof assets,
  string
>;
const documents = buildInitialEditorialSeed({
  privacyNoticeUrl: privacyNoticeUrl!,
  socialImages,
});
assertValidEditorialDataset(documents);

let transaction = client.transaction();
for (const document of documents) {
  const sanityDocument: IdentifiedSanityDocumentStub = { ...document };
  transaction = transaction.createOrReplace(sanityDocument);
}
await transaction.commit({ visibility: "sync" });

console.log(
  `Seeded ${documents.length} validated Editorial singletons in ${projectId}/${dataset}.`,
);

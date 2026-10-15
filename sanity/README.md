# VANTA Editorial Studio

This Studio gives `content_editorial` authority over fixed narrative content only. The registered schema consists of four singleton documents (`siteSettings`, `homePage`, `productPage`, and `synthPage`) and two inline objects (`editorialImage` and `seo`).

## Ownership boundary

Editorial can change bounded prose, contextual imagery, captions, alternative text, SEO descriptions, the reviewed privacy-notice destination, and dedicated social images. The schema intentionally contains no Product/Catalog values, specifications, navigation, controls, behavior, generic page/section builder, Portable Text, arbitrary HTML, or arbitrary links.

Brand identity, canonical claims, route sequence, actions and destinations, price, specifications, and interaction language remain code-owned. The seed therefore does **not** copy the baseline’s brand, footer navigation, CTA labels, price, or specifications into Sanity fields.

Home’s chapters are nine fixed named fields. Their schema and GROQ projection preserve the approved sequence; editors cannot add, remove, or reorder chapters.

## Local Studio

Set:

- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET`

Then run:

```sh
pnpm sanity:dev
```

The Studio removes singleton create, unpublish, delete, and duplicate actions. Each singleton also validates its fixed document ID so API-created impostor documents cannot pass the publication contract.

## Validate

```sh
pnpm exec sanity schema validate
pnpm validate:editorial
```

The first command compiles Sanity’s schema. The second emits the schema and seed reports, then runs schema/projection/ownership fixture tests.

Validation blocks:

- missing designed content;
- prose beyond the per-field limits;
- HTML, embedded links, prohibited Product claims, and commerce claims;
- non-HTTPS links other than the approved `/privacy` destination;
- missing contextual alternative text;
- duplicate or non-120–160-character route descriptions;
- shared or non-1200×630 route social images;
- Product, Catalog, navigation, controls, specifications, Bag, checkout, or behavior fields.

## Published application delivery

Public Server Components read the fixed projections directly through the server-only Sanity adapter; they do not call an application Route Handler. Configure deployed candidates with:

- `SANITY_CONTENT_SOURCE=published`;
- `SANITY_STUDIO_PROJECT_ID`;
- `SANITY_STUDIO_DATASET`.

Published reads use the Sanity API (not the Sanity CDN) inside document-specific Cache Component scopes with `cacheLife("max")`. A failed background refresh therefore leaves the last valid deployment-scoped value available. The design does not depend on in-process cache persistence across serverless requests, and cache entries do not survive deployments. Every hosted Netlify candidate rejects fixture mode and fails its build if a required singleton is absent or invalid.

Local development and local builds use the deterministic seed projections when no source is selected. Automated jobs must opt in explicitly with `SANITY_CONTENT_SOURCE=fixture`; repository CI does this so it cannot accidentally depend on a mutable remote dataset.

## Seed a dataset

The seed uploads four dedicated 1200×630 source social cards, validates the complete candidate dataset, and atomically creates or replaces the four fixed singleton IDs.

In addition to the Studio variables, set:

- `SANITY_API_WRITE_TOKEN` to a least-privilege dataset write token;
- `SANITY_PRIVACY_NOTICE_URL` to the reviewed HTTPS privacy notice or `/privacy` once that route is bound.

Then run:

```sh
pnpm seed:editorial
```

`createOrReplace` is intentionally idempotent but overwrites those four singleton documents. Run it only for initial provisioning or an explicit reset. Contextual narrative-media fields remain empty until approved assets exist; they are optional slots, while every social-image slot is required and seeded.

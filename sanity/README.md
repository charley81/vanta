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

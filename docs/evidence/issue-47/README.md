# Issue #47 — Editorial schema and seed evidence

Scope: `CONTENT-001`, `CONTENT-002`, `CONTENT-003`, `CONTENT-009`, with Product-truth boundary coverage for `PRODUCT-001`–`PRODUCT-003`.

## Schema report

Command:

```sh
pnpm exec sanity schema validate
```

Result: **PASS** — 0 errors, 0 warnings.

Registered schema types:

- inline objects: `editorialImage`, `seo`;
- fixed documents: `siteSettings`, `homePage`, `productPage`, `synthPage`.

The singleton Studio structure exposes only those four fixed IDs and removes create, unpublish, delete, and duplicate paths. Schema inspection confirms there is no `block`/Portable Text type or generic page/section document. Document-level validation rejects code-owned Product, Catalog, specification, navigation, control, Bag, checkout, and behavior fields even if they arrive outside the Studio UI.

## Seed validation report

Command:

```sh
pnpm validate:editorial
```

Result: **PASS**.

The report validated:

- all four required singleton documents and fixed IDs;
- the approved Home, Product, and Synth narrative seed;
- three unique indexed-route descriptions of 120–160 characters;
- three dedicated route social-image assets at 1200×630;
- the separate default social-image asset;
- the approved privacy-link contract;
- exact Home chapter names and sequence.

The seeding command requires an explicit reviewed privacy-notice binding and Sanity write credentials. It uploads the checked-in social-card sources, validates the assembled dataset, then atomically `createOrReplace`s the fixed IDs. No remote dataset was mutated for this repository evidence.

## Ownership-boundary and projection tests

Test file: [`tests/editorial/editorial-model.test.ts`](../../../tests/editorial/editorial-model.test.ts)

Result: **7 passed**.

The tests demonstrate rejection of:

- missing required narrative content and invalid singleton IDs;
- non-approved links;
- duplicate SEO descriptions;
- incorrectly sized social images;
- missing contextual alt text;
- prohibited Product/commerce claims;
- Editorial attempts to supply price or specifications.

The GROQ fixture tests execute the real Home/Product/Synth projections against the seed, preserve the fixed nine-chapter sequence, match the route-view-model fixtures, and exclude code-owned values.

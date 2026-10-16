# Issue 63 — complete Product experience evidence

This record describes the implementation in the commit containing this file. It is focused engineering evidence for `PRODUCT-ROUTE-001` through `PRODUCT-ROUTE-004`, with supporting verification of `PRODUCT-001` through `PRODUCT-006`, `CONTENT-009`, and `MEDIA-005`. It is not launch-candidate sign-off, deployed evidence, or a substitute for the manual acceptance matrix.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Design source and implementation choices

The implementation used Figma desktop MCP `get_design_context`, `get_screenshot`, `get_metadata`, and `get_variable_defs` for Product frame `129:476`. The frame established the nine-part commercial-editorial composition, media-first Product splits, large declaration scale, alternating Cream and Signal Black fields, and the approved VANTA palette. Baseline decisions replace the frame’s rejected `$999`, purchase language, concept notice, weight, and power rows.

Only governed authored derivatives from `media/manifests/media.json` render on Product. Responsive AVIF and WebP sources use the approved `product-hero` and `product-morph` derivatives. Product renders no canvas and has no model or realtime enhancement.

## Product journey and DOM report

`tests/browser/product.spec.ts` and `tests/browser/core-routes.spec.ts` assert one semantic sequence:

1. hero media, identity, `$2,499 USD`, and Add to Bag;
2. editorial thesis;
3. sonic philosophy;
4. SUB and FRACTURE;
5. MORPH;
6. materials and craft;
7. semantic technical specifications;
8. MORPH Lab invitation;
9. repeated non-urgent Bag action followed by the global footer.

The hero and final Add actions remain closed while the quantity-one idempotent mutation is pending and open Bag only after confirmation. Existing Bag coverage retains pending, failure, timeout, retry, stale-result, and late-navigation assertions. The MORPH Lab link disables prefetch, preserves a useful no-JavaScript link, and presents route-local pending feedback while client navigation is blocked.

The Product document remains useful without JavaScript. Product truth, authored images, specifications, and MORPH Lab navigation render in server HTML; a `<noscript>` message identifies Add to Bag as unavailable rather than leaving the client-only action unexplained.

## Responsive and accessibility report

- [`product-wide.png`](product-wide.png) — 1440 × 900 CSS-pixel Product-entry reference.
- [`product-narrow.png`](product-narrow.png) — 390 × 844 CSS-pixel Product-entry reference.

Focused browser coverage also exercises 320 CSS pixels. Hero, MORPH, and Craft place authored media before related content in the narrow semantic stack. Specifications reflow from two columns to term/value blocks, and the document produces no page-level horizontal scrolling. Axe WCAG A/AA analysis reports no violations for the narrow Product route.

Forced-colors rules retain native foreground/background and button treatments. The route introduces no motion; global reduced-motion behavior remains applicable.

## Bundle and network isolation trace

The architecture boundary test walks every transitive import reachable from `app/monolith/` and rejects Three.js, React Three Fiber, decoder, GLB, and audio runtime imports. The direct-entry Playwright trace records all Product requests and asserts that approved `product-hero` or `product-morph` images load while no Three.js, Meshopt/decoder, GLB, audio worklet, or audio-engine resource is requested. It also asserts that Product creates no `<canvas>`.

## Rendered Product-truth report

The rendered document asserts canonical `$2,499 USD`, eight voices, two digital oscillators per voice, resonant analog filter, exact dimensions, bead-blasted graphite aluminum, high-contrast OLED, approved connections, controls, and display-button description. Specifications contain no Weight row. Product copy is checked for prohibited stock, scarcity, shipping/tax estimate, preorder, warranty, Buy, or Checkout language, and exposes no quantity control.

The code-owned Product/Catalog manifest tests remain the authority for VANTA, MONOLITH, Desktop Synthesizer, Graphite, quantity one, and `$2,499 USD`. The validated Sanity Product description remains in route metadata; dedicated social-image output remains owned by the canonical metadata work in issue #68 and is not claimed here.

## Verification commands

The focused implementation was checked with:

```text
pnpm exec eslint app/monolith tests/browser/product.spec.ts tests/browser/core-routes.spec.ts
pnpm typecheck:raw
pnpm exec vitest run tests/routes/route-view-models.test.ts tests/domain/product-catalog.test.ts tests/architecture/source-boundaries.test.ts
pnpm exec playwright test tests/browser/product.spec.ts tests/browser/core-routes.spec.ts
pnpm check
```

The complete `pnpm check` gate also passed: requirement/evidence validation, product manifest and source-boundary checks, media and runtime checks, Editorial validation, lint, type checking, 208 unit tests, production build, 54 browser journeys, and seven commerce-boundary journeys. Generated reports under `artifacts/reports/` are local feedback bound to the working-tree identity and do not make an Acceptance claim for another commit or deployment.

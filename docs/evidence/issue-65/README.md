# Issue 65 — Home horizontal choreography and restoration evidence

This record describes focused engineering evidence for `HOME-002`, `HOME-003`, and `HOME-007`, with supporting verification of `STATE-004`, `STATE-005`, `QUALITY-009`, and `QUALITY-010`. It is not launch-candidate sign-off, deployed evidence, or a substitute for the manual assistive-technology matrix.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Design source and implementation

Figma desktop MCP inspection used the `horizontal scroll` frame `129:583`, its screenshot, and its VANTA palette variables. The frame establishes a sequence of viewport-width editorial compositions with asymmetric copy, technical imagery, Espresso/Cream contrast, and Terracotta/Peach signals. The production implementation retains the existing nine canonical server-rendered chapter sections and adapts that composition without duplicating content.

At an eligible viewport, one sticky viewport presents the sequential sections as a horizontal track. Native vertical document distance maps one-to-one to track travel, and a quiet two-pixel line exposes passage progress without an announcement. The implementation adds no horizontal scroll container, drag surface, wheel handler, touch gesture, or navigation-key handler.

## Horizontal eligibility and input report

`tests/home/choreography.test.ts` and `tests/browser/home.spec.ts` verify:

- eligibility only when both media queries match `min-width: 64rem` and `min-height: 38rem`, reduced motion is not requested, and an isolated runtime sticky probe succeeds;
- exact boundary behavior at 1024 × 608 CSS pixels and vertical fallback one pixel below either threshold;
- sticky-failure and reduced-motion fallback to the ordinary vertical Core document;
- live resize and preference recomposition while retaining the semantic chapter;
- native, reversible wheel and Page Down scrolling, uncancelled touch input, focus-driven chapter alignment, and absence of page-level horizontal overflow;
- one canonical chapter tree in DOM order in enhanced, fallback, reduced-motion, and no-JavaScript sessions.

The browser journey also runs an automated WCAG A/AA scan in the enhanced wide presentation and in the 320 CSS-pixel vertical presentation with zero reported violations.

## History and restoration report

Home exposes virtual semantic geometry to the shared Return-context boundary only while horizontal choreography is active. Context remains chapter-based: chapter identifier plus normalized chapter progress, never transform pixels or a durable completion flag.

Restoration renders and recomposes the vertical Core shell, applies the saved semantic position, restores valid route focus, then activates the currently eligible presentation. A bounded delayed correction settles late layout/focus once; pointer, key, wheel, or touch interaction cancels it. Fresh explicit Home navigation still starts at and focuses the opening. Reload and Back restore the saved chapter directly without replaying motion.

`tests/browser/continuity.spec.ts` covers fresh Home navigation, enhanced Home → Product → Back restoration with prior action focus, reload restoration, ordinary Product restoration, and canonical same-route reset. `tests/continuity/restoration.test.ts` covers sequencing, semantic normalization, focus fallbacks, correction cancellation, and passive restoration.

## Responsive and reduced-motion captures

The captures were produced from a local production build of the same working tree:

- [Eligible horizontal MORPH chapter](home-horizontal-morph.webp) — 1440 × 900; SHA-256 `337ffee806407bfb176a3edde95b93a9ece65f95d8486f7dbb8dd657bcafda10`
- [Vertical MORPH chapter at 320 CSS pixels](home-vertical-320.webp) — 320 × 720; SHA-256 `cfed4986da664d5f2b4164f1ed0244207b00e542313c0a8f724186191e0bb135`
- [Reduced-motion vertical MORPH chapter](home-reduced-motion.webp) — 1440 × 900; SHA-256 `f2d965fd8322eb91b82cbc5c93b3ef2547465e18c3c677f907d2db1963476e43`

Reduced motion removes the sticky horizontal track and all horizontal translation while retaining every beat and action in canonical order.

## Focused verification

Executed against the working tree represented by this record:

```text
pnpm exec vitest run tests/home/choreography.test.ts tests/continuity/restoration.test.ts
pnpm exec playwright test tests/browser/home.spec.ts tests/browser/continuity.spec.ts
pnpm typecheck:raw
pnpm check
```

The complete check passed: all requirement/evidence/boundary/media/audio/editorial validations, lint, type-check, production build, 46 unit-test files / 212 tests, 67 browser journeys, and 7 commerce-boundary journeys. Generated verification reports retain the working-tree identity. Immutable deployment evidence remains part of the merge/release boundary.

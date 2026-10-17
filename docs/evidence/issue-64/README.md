# Issue 64 — Home Core narrative evidence

This record describes focused engineering evidence for `HOME-001`, `HOME-004`, `HOME-006`, `HOME-008`, and supporting verification of `MEDIA-005`, `PRODUCT-001`, `PRODUCT-002`, and `PRODUCT-006`. It is not launch-candidate sign-off or a substitute for an immutable deployment record.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Home DOM-order report

`app/page.tsx` emits one stable server-rendered document in this exact order:

1. opening;
2. philosophy;
3. reveal;
4. SUB;
5. MONOLITH;
6. MORPH;
7. gesture;
8. FRACTURE;
9. craft;
10. resolution;
11. MORPH Lab invitation;
12. quiet VANTA closing.

The nine chapters are nine real sequential `section` elements. No alternate, hidden, or motion-only chapter tree exists. Opening and invitation links lead to `/synth`; the resolution action leads to `/monolith`. The shared site footer follows the quiet closing through the root layout.

`tests/browser/home.spec.ts` asserts the complete `data-home-beat` and `data-chapter` sequences, exact uniqueness, visible headings and actions, and the absence of hidden or nested duplicate beat sections.

## Core and adaptive vertical presentation

Home declares one vertical presentation at every viewport. The authored composition uses ordinary document flow and does not intercept wheel input, add a nested horizontal scroller, require dragging, or add custom navigation keys. At 320 CSS pixels, chapters become a single-column copy-then-visual stack with no page-level horizontal overflow.

The opening renders the approved generated Home poster before any future enhancement. Responsive AVIF and WebP sources are supplied at 720 and 1440 pixels with intrinsic dimensions and descriptive alternative text. Home loads no GLB, renderer, canvas, video, or audio runtime.

Focused browser coverage passed at 1440 × 900 and 320 × 720 with automated WCAG A/AA analysis and layout bounds checks:

- [Core wide capture](home-core-wide.webp) — SHA-256 `9e9f76607c0b58f249a72fc170ad22201baf82b802ccc0cc7141a1010ac23532`
- [Core 320 CSS-pixel capture](home-core-320.webp) — SHA-256 `219b6f76ece74052c26b93ac40de6bba278eba1a8c2cfcfce5c1a6d371a7c603`

## Reduced motion

With `prefers-reduced-motion: reduce`, Home retains all twelve beats in the same semantic order and uses the same stable vertical composition. There is no camera travel, parallax, scroll-linked or horizontal translation, animated telemetry, autoplaying media, canvas, video, or audio. Decorative Home media and diagrams explicitly have no animation, transition, or transform in the reduced-motion query.

- [Reduced-motion wide capture](home-reduced-motion.webp) — SHA-256 `9e9f76607c0b58f249a72fc170ad22201baf82b802ccc0cc7141a1010ac23532`

The reduced-motion capture is byte-identical to the Core wide capture, demonstrating that no narrative or stable visual content is removed and no transient animated state changes the capture.

## No-JavaScript and isolation smoke result

The focused production-build browser run passed with JavaScript disabled at 320 × 720. It confirmed all twelve beats, all nine chapters, the authored poster, both MORPH Lab links, the Product exit, and no horizontal overflow. Because the narrative, links, and responsive image are server HTML and CSS, Home remains useful without hydration.

A separate journey scrolls through the cinematic narrative and confirms:

- no `canvas`, `video`, `audio`, or audio-state element is created;
- no MORPH or audio key is written to local or session storage;
- the static cinematic path creates neither sound nor persistent instrument state.

## Focused verification

Executed against the working tree that produced these captures:

- `pnpm exec eslint app/page.tsx app/home-media.tsx tests/browser/home.spec.ts`
- `pnpm typecheck:raw`
- `pnpm exec vitest run tests/routes/route-view-models.test.ts` — 1 file / 5 tests passed
- `pnpm exec playwright test tests/browser/home.spec.ts` — 6 Chromium tests passed
- `pnpm check` — all validations passed; 45 unit-test files / 208 tests, 60 browser journeys, and 7 commerce-boundary journeys passed

Immutable deployment evidence remains part of the delivery/merge boundary.

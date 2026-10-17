# Issue 66 — Home Realtime reveal and governed fallback evidence

This record describes focused engineering evidence for `HOME-005`, with supporting verification of `MEDIA-005`, `MEDIA-006`, `MEDIA-007`, `QUALITY-005`, and `QUALITY-006`. It is not launch-candidate sign-off, a reference-profile median, or physical-device evidence.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Home-specific orchestration

Home owns a separate camera/light/chapter orchestrator over the shared Three.js scene primitive and governed Meshopt GLB. The ten cinematic beats from opening through resolution map reversibly to versioned camera position/target/FOV, model rotation, ambient light, key light, and fill light. The route renderer is decorative and hidden from the accessibility tree; the existing server-rendered headings, copy, links, chapter sections, authored poster, and CSS signals remain authoritative.

The authored poster is eager, high-priority route content. Presentation qualification runs after hydration, and the Home GLB request is scheduled only after the poster has completed and received two animation-frame opportunities to paint. The canvas remains transparent until the first completed WebGL frame. Runtime failure removes the canvas locally and reveals the unchanged authored layer.

Three.js, Meshopt, and the Home scene module remain behind `createLazyHomeSceneLoader`. Product does not import the loader or request the model. Home and Synth share scene/resource primitives but retain separate route orchestrators.

Automated source: `tests/home/realtime-orchestration.test.ts`, `tests/architecture/source-boundaries.test.ts`, and `tests/browser/home.spec.ts`.

## Local network, LCP, and startup trace

[`home-realtime-trace.json`](home-realtime-trace.json) was captured from a local production build in headless Chromium without overriding the clock. It records:

- the authored AVIF request beginning at 14.7 ms and completing before enhancement startup;
- the authored `IMG` as the observed LCP candidate at 104 ms;
- the GLB request beginning at 315.5 ms, after that LCP candidate;
- runtime readiness at 498.9 ms;
- a governed local downgrade to authored Motion fallback at 1,394.4 ms after the headless environment exceeded a runtime performance limit.

That downgrade is a passing behavior, not reference-hardware performance evidence: the renderer does not remain below the floor. Reference 10 Mbps/4× CPU startup, warm frame targets, median cold runs, and physical target checks remain candidate-stage work.

The Playwright delayed-model journey separately holds the GLB request open and verifies that the route heading, eager poster, primary action, and non-canvas LCP candidate are already painted. Releasing the request as a failure changes only the optional enhancement to fallback.

## Lifecycle and fallback report

[`home-realtime-fallback-report.json`](home-realtime-fallback-report.json) indexes the deterministic browser cases. The implementation:

- makes no renderer/model request for reduced motion or failed WebGL2 qualification;
- suspends the owned frame loop while hidden, outside the cinematic range, covered by Bag, frozen, or leaving the route;
- resumes without creating a second runtime after the Bag closes or the page is restored;
- lowers DPR/effects after the first poor two-second frame window and persists the lower DPR across responsive viewport changes;
- downgrades the tab session after a second poor window, startup/task/resource failure, model/decode failure, or context loss;
- preserves semantic chapter, scroll position, route content, and actions when context loss is injected.

The shared runtime already binds the 2,568,220-byte model, 20,621,997 decoded-texture bytes, and 84,300,329 estimated GPU bytes to governed manifests and enforces DPR 1.5 mobile / 2 desktop, four-second readiness, eight-second abandonment, 100 ms startup tasks, 50 ms interaction tasks, and the 30 fps sustained floor.

## Presentation-tier captures

The captures use the same local production build:

- [Qualified Realtime opening / wide](home-realtime-wide.webp) — 1440 × 900; SHA-256 `b13186d72478a27c303e1e2bfebaf8f0d7810cbd343ce9d7dd737d0f4a267a6c`
- [Qualified Realtime MORPH chapter / wide](home-realtime-morph.webp) — 1440 × 900; SHA-256 `ef9dd74cce0e5df6120cf234adbe149d76642c70d4245e4eb01d03254bfb66d1`
- [Qualified Realtime opening / mobile](home-realtime-mobile.webp) — 390 × 844; SHA-256 `da4ac24e98e520b4640783bfd6b6122a7f0fc318559d15c31436bfa7455c350e`
- [Core / reduced motion](home-core-reduced-motion.webp) — 1440 × 900; SHA-256 `d7090f1de011cd3663d9e9dd086caac073747ec86859d6bc9118e1979bfc9d26`

The qualified captures disable only headless Chromium's synthetic long-task reporting so the canvas can be inspected; they are visual records, not performance traces. The Core capture contains no canvas or model request.

## Verification

Focused commands:

```text
pnpm exec vitest run tests/home/realtime-orchestration.test.ts tests/realtime/runtime.test.ts tests/realtime/resources.test.ts tests/architecture/source-boundaries.test.ts
pnpm exec playwright test tests/browser/home.spec.ts
pnpm typecheck:raw
```

`pnpm check` passed on this working tree: every requirement/evidence/boundary/media/audio/editorial validation, lint, type-check, production build, 47 unit-test files / 215 tests, 70 browser journeys, and 7 commerce-boundary journeys passed. Generated reports retain working-tree identity and `acceptanceClaim: false`; immutable deployment evidence remains part of the merge/release boundary.

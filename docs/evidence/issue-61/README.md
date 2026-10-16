# Issue 61 — Presentation qualification and shared Realtime runtime

This record describes the implementation in the commit containing this file. It is focused engineering evidence for `MEDIA-005`–`MEDIA-007`, `QUALITY-005`, and `QUALITY-006`, with supporting checks for `ARCH-008`, `ARCH-009`, and `QUALITY-013`. It is not launch-candidate sign-off, a deployed network trace, or a physical-device frame trace.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Presentation-selection matrix

Qualification reads explicit signals independently; it does not infer a device name. Missing network and processor APIs are neutral. Input adaptation never decides media eligibility.

| Signals | Motion | Realtime | Data-saving | Input | Selected tier / reason |
|---|---:|---:|---:|---|---|
| WebGL2, 8 logical processors, 4G, fine pointer | yes | yes | no | fine | Realtime |
| Save-Data | no | no | yes | unchanged | Core / `data-saving` |
| Explicit 3G-or-worse | yes | no | no | unchanged | Motion / `network` |
| Fewer than four logical processors | yes | no | no | unchanged | Motion / `capability` |
| WebGL2 creation failure | yes | no | no | unchanged | Motion / `capability` |
| Missing network and processor APIs | yes | yes | no | unchanged | Realtime |
| Reduced motion, decorative Realtime | no | no | no | unchanged | Core / `reduced-motion` |
| Reduced motion, direct manipulation | no | yes | no | unchanged | Realtime without decorative/eased motion |
| Fine and coarse pointers | unchanged | unchanged | unchanged | mixed | Media tier unchanged |

`BrowserPresentationController` listens for reduced-motion, pointer, and connection changes, writes only the version-2 serializable Presentation record to `sessionStorage`, and removes every listener on disposal. Runtime/resource/startup/frame failures create a one-way session decline. Live input/data-saving changes continue to update, but a declined model is not promoted or downloaded again in that tab. A new tab has new session storage and requalifies.

Automated source: `tests/presentation/qualification.test.ts`, `tests/presentation/browser-qualification.test.ts`, and `tests/continuity/state-parsers.test.ts`.

## Realtime startup, frame, and resource report

The shared controller does not invoke its lazy scene loader unless the supplied Presentation is Realtime-eligible. `createLazyThreeSceneLoader` dynamically imports the Three.js/Meshopt scene module only from that invocation; the GLB fetch begins inside the imported scene factory. Product and the root module graph do not import this runtime.

| Budget | Governed/runtime value | Ceiling / behavior |
|---|---:|---:|
| Runtime GLB | 2,568,220 bytes | 2,700,000 bytes |
| Decoded textures | 20,621,997 bytes | 33,554,432 bytes |
| Estimated GPU resources | 84,300,329 bytes | 100,663,296 bytes |
| Mobile DPR | capped by runtime | 1.5 |
| Desktop DPR | capped by runtime | 2 |
| Startup target | controller rejects completion after 4,000 ms | 4,000 ms |
| Unsettled startup | abort and fallback | 8,000 ms hard timeout |
| Startup task | fallback above ceiling | 100 ms |
| Interaction/render task | fallback above ceiling | 50 ms |
| Sustained frame floor | reduce effects/DPR after first 2-second window; fallback after second consecutive window | 30 fps |

The resource contract is bound by test to `media/manifests/derivatives.json` and `media/manifests/media.json`; drift between the runtime constants, governed model URL, manifest allocation, or ceilings fails. The Three.js adapter configures sRGB output and ACES filmic tone mapping, uses the Meshopt decoder, supports reduced effects, aborts the fetch, and disposes model textures/materials/geometries and renderer state idempotently.

Automated source: `tests/realtime/resources.test.ts`, `tests/realtime/runtime.test.ts`, and `tests/architecture/source-boundaries.test.ts`. Candidate qualification must still retain three cold production traces on each reference target; these deterministic checks do not relabel simulated time as physical startup/frame evidence.

## Context-loss and downgrade report

Model/network/decode rejection, WebGL render/setup exceptions, context loss, resource excess, startup timeout, task excess, and two consecutive sub-floor frame windows stay inside the optional runtime boundary. Each path cancels the owned frame, aborts startup where applicable, disposes an acquired scene once, publishes authored fallback, and reports one bounded downgrade reason to the Presentation controller. A late scene from an aborted/timed-out generation is disposed and cannot publish readiness.

Context loss is intercepted on the route-owned canvas with `preventDefault`; no generic route error is thrown. Runtime and audio modules have no dependency on each other.

## Lifecycle leak report

The controller accepts independent `hidden`, `offscreen`, `complete`, `covered`, and `requiresFrames` activity signals. Any inactive reason cancels its sole scheduled frame. Clearing only one of several active reasons does not resume. Once every reason clears, at most one frame is scheduled. Suspension resets frame-window sampling so inactive time cannot become a false low-frame window.

Repeated activity updates and repeated disposal cannot duplicate or leak frames/resources. Disposal aborts loading, clears startup timers, cancels the frame, disposes the scene once, publishes `disposed`, and clears subscribers. Tests exercise repeated suspension combinations, stale completion, context loss, active rendering, and double disposal.

## Verification

Run:

```text
pnpm test:realtime
pnpm validate:media
pnpm validate:boundaries
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:verified
```

`pnpm test:realtime` writes `artifacts/reports/realtime-runtime.json`. As with every generated local report, it records `acceptanceClaim: false` and must be rebound to an immutable application/deployment identity before candidate review.

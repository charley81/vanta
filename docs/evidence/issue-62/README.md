# Issue 62 — Synth direct-manipulation 3D evidence

This record describes the implementation in the commit containing this file. It is focused engineering evidence for `SYNTH-003`, `SYNTH-005`, `SYNTH-007`, and the Synth integration of `MEDIA-005`–`MEDIA-007`. It is not launch-candidate sign-off, a deployed physical-device trace, or a substitute for manual assistive-technology and touch-device review.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Control-equivalence report

The governed GLB hierarchy maps only `MORPH_ROTATING_ENCODER`, `CUTOFF_ROTATOR`, `RESONANCE_ROTATOR`, `DRIVE_ROTATOR`, `ATTACK_ROTATOR`, and `RELEASE_ROTATOR` to the six code-owned `MorphControl` values. Ray hits walk from the intersected mesh to one of those named ancestors; every other visible control returns no control, receives no pointer capture, exposes no focus target, and remains inert.

A tap selects the physical control and opens the same non-modal semantic focus panel. A gesture remains ordinary page input until it begins on a supported control and crosses the six-pixel drag threshold. Only then does the canvas capture the pointer, apply `touch-action: none`, prevent pointer movement, and emit clamped integer `0–100` values. Pointer end/cancel restores page panning. The direct surface and native ranges both call `morphControlSurface`, so visible values, encoder rotation, panel output, session state, and audio scheduling share one transition path.

`tests/synth/direct-manipulation.test.ts` covers named-hierarchy filtering, tap, drag threshold, integer clamping, pointer cancellation, and normalized 270-degree visual rotation. `tests/browser/synth.spec.ts` loads the production Three/Meshopt boundary, drags governed RELEASE geometry from 42 to 62, verifies that the RELEASE native range opens at 62, changes it semantically to 33, and observes 33 in the instrument readout. Existing keyboard range tests verify Arrow-key outcomes through the same state adapter. The canvas and poster are hidden from the accessibility tree; the authoritative native controls remain the only keyboard/screen-reader surface.

## Activation and network trace

Synth server-renders the governed responsive poster, audio action, and complete Control deck before client qualification. Three.js, Meshopt, the Synth scene adapter, and the 2,568,220-byte GLB remain behind the explicit **Load interactive instrument view** action. The browser journey records zero GLB requests before activation and one after activation.

Save-Data selects Core and reports that the model will remain unloaded. It still offers the separate explicit load action; a controlled journey confirms zero requests before that opt-in and one request after it. Failed model/decode fetch selects the authored fallback locally while the native ranges and independent audio transport remain usable.

The Meshopt decoder requires WebAssembly compilation and GLTFLoader resolves embedded textures through generated Blob URLs. Production CSP grants the narrow CSP3 `'wasm-unsafe-eval'` source and same-document `blob:` connections; it does not grant general production `'unsafe-eval'`, remote script execution, or wildcard connectivity. Response-policy tests lock that distinction.

## 3D failure and lifecycle report

The route-owned runtime connects document visibility, stage intersection, Bag coverage, route intent, freeze, pagehide, pageshow, and responsive resize to the shared Realtime controller. Rendering has no ambient loop: readiness and value/size changes invalidate one frame, while hidden, offscreen, covered, or completed activity prevents scheduling. Shared runtime tests verify one coalesced frame, deferred invalidation while hidden, every suspension reason, idempotent disposal, startup timeout, resource fallback, context loss, and sustained-frame downgrade.

The browser journey injects WebGL context loss after physical and semantic updates. It observes local authored fallback while RELEASE remains 33, the full Control deck remains operable, and audio remains independently available. Route unmount disposes model listeners, gesture handlers, store subscriptions, geometry, textures, materials, renderer lists, and the WebGL context. Audio and renderer modules do not import each other.

## Route captures

- [Wide Realtime instrument and side-panel layout](synth-wide.png)
- [320 CSS-pixel poster-first and inline-panel layout](synth-narrow.png)

The wide capture uses deterministic timing only to retain a rendered composition; it is not physical startup/frame evidence. The narrow capture retains the pre-activation poster and explicit action. Automated browser coverage separately verifies 320 CSS-pixel reflow, 44-pixel actions, and zero serious WCAG A/AA findings.

## Verification commands

```text
pnpm validate:requirements
pnpm validate:evidence
pnpm validate:performance
pnpm validate:product-catalog
pnpm validate:boundaries
pnpm validate:public-runtime
pnpm validate:audio-calibration
pnpm validate:audio-stress
pnpm validate:audio-isolation
pnpm validate:media
pnpm test:realtime
pnpm validate:editorial
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:verified
pnpm test:browser
```

Generated local reports and traces remain bound to the working-tree identity and set no Acceptance claim for another commit or deployment. Manual touch-device, forced-colors, screen-reader, and candidate performance qualification remain candidate-stage work.

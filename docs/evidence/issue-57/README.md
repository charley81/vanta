# Issue 57 — Synth lifecycle, persistence, and recovery evidence

This record describes the implementation in the commit containing this file. It is focused engineering evidence for `SYNTH-007`–`SYNTH-010`, with supporting checks for `MEDIA-006`, `ARCH-009`, and `QUALITY-013`. It is not launch-candidate sign-off, deployed evidence, a real-device audio trace, or a substitute for the required manual assistive-technology matrix.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Synth lifecycle and interruption report

`bindSynthPageLifecycle` is the route-owned browser boundary. Hidden visibility, Bag opening, route intent, freeze, and pagehide all request the same idempotent transport interruption. Visible/pageshow restoration performs no transport action, so BFCache and lifecycle restoration cannot start sound. The audio engine independently reports AudioContext/platform suspension through the same transport boundary.

The transport retains normalized MORPH values in the separate tab-local session store. Ordinary Pause, hide, Bag, freeze, pagehide, and platform interruption stop the phrase without mutating those values. A committed App Router navigation unmounts the route boundary and disposes its AudioContext; returning to the cached route shows `interrupted` and requires **Resume Sound**, which constructs a new route-owned engine only from that gesture.

Preparation attempts have generation ownership and an immediate cancellation result. A superseded or timed-out attempt can dispose only its own engine and cannot stop, publish state for, or dispose a newer successful attempt. Engine disposal is coalesced by identity. Duplicate platform/lifecycle events therefore do not create additional contexts, phrase schedulers, listeners, or state transitions.

Focused coverage:

- `tests/synth/audio-lifecycle.test.ts` exercises hidden/visible, Bag, freeze, pagehide/pageshow, route-click filtering, listener cleanup, and repeated bind/unbind cycles.
- `tests/synth/audio-transport.test.ts` exercises duplicate interruption, interruption during a never-settling load, superseded preparation versus a newer resume, timeout, retry, update gating, and idempotent disposal.
- `tests/browser/synth.spec.ts` exercises repeated hidden/freeze/pagehide/pageshow events, a real AudioContext suspension, Bag interruption, committed navigation disposal, Back restoration, and explicit engine reconstruction.

Synth currently has no realtime renderer or model request: the authored shell and Control deck remain useful without 3D, and there is no render loop to continue while hidden or covered. This evidence does not claim the future 3D activation/fallback work.

## State lifetime report

The MORPH session remains a module-scoped observable store containing only selected control and six normalized integer values. Audio consent, transport state, AudioContext, AudioNodes, focused-panel disclosure, DOM nodes, and lifecycle listeners are route-owned and never enter that store.

| Boundary | Result |
|---|---|
| Hide, freeze, Bag, pagehide/pageshow, platform interruption | Values and selected control retained; audio remains interrupted |
| App Router navigation and Back/Forward | Values and selected control retained; focused panel closes; explicit Resume required after prior audio use |
| Committed route navigation | Route-owned engine disposed; MORPH session retained |
| Reload, new tab, duplicated/opener-created tab, crash reconstruction | Canonical MORPH defaults; no audio consent or runtime reconstruction |
| Audio failure or timeout | Control deck and MORPH values remain usable |

No MORPH or audio state is written to history, query parameters, cookies, `localStorage`, or `sessionStorage`. Existing browser coverage checks navigation, reload, new-tab, duplicate-tab, and Web Storage behavior; the lifecycle journey additionally checks value retention through interruption and engine disposal/reconstruction.

## Audio failure-injection and targeted-recovery report

Failure remains inside the optional transport status. `preparing`, `playing`, `paused`, `interrupted`, and `unavailable` are visible in one atomic polite status; transport actions expose Enable, Pause, Resume, or Retry as appropriate. Continuous parameter input uses a separate 450 ms trailing announcement instead of announcing every frame.

Automated injections cover:

- dynamic engine construction failure, followed by useful Control deck interaction and successful **Retry sound**;
- a loader that never settles, interrupted without leaving a dangling caller-visible preparation;
- preparation timeout with local `unavailable` state;
- factory/play failure and explicit retry;
- platform AudioContext suspension with no automatic resume;
- a stale preparation completing after a newer successful resume;
- repeated pause, interruption, lifecycle, and disposal signals.

The route document, Editorial copy, instrument scope, Control deck, selected control, and normalized values remain available throughout these failures.

## Verification commands

The implementation is checked with:

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
pnpm validate:editorial
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:verified
pnpm test:browser
```

Generated reports under `artifacts/reports/` are local feedback bound to the working-tree identity and do not make an Acceptance claim for another commit or deployment.

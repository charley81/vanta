# Issue 67 — cross-route continuity and lifecycle evidence

This record describes focused engineering evidence for `STATE-001`–`STATE-008`, `BAG-007`, `BAG-008`, `PREVIEW-009`, `PREVIEW-010`, `SYNTH-008`, `SYNTH-009`, and `ARCH-009`. It is bound to the implementation containing this file. It is not launch-candidate sign-off, deployed evidence, or a substitute for the required manual assistive-technology and physical-device matrices.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Cross-route journey matrix

The machine-readable matrix is [`cross-route-journey-matrix.json`](cross-route-journey-matrix.json). It joins focused browser journeys rather than treating route-local tests as proof of integration.

| Journey | Integrated result |
|---|---|
| Home → Product → Back | Explicit entry starts canonically; Back restores Home chapter, visible presentation, and focus without replay. |
| Product → Synth → Back/Forward | Product semantic position/focus and the tab-local MORPH session restore at their separate lifetimes. |
| Product → Bag → Checkout Preview | The Bag entry is consumed, Preview validates confirmed membership, and only legally reached stages enter same-URL history. |
| Synth + sound → Bag → close/navigation | Bag interrupts sound without resetting values; close never resumes sound; committed route navigation disposes the route-owned engine once. |
| Current route → menu/Bag current-route action | The surface closes, its marker is consumed, deferred route-heading focus succeeds after the modal closes, and Back/Forward cannot reopen stale Bag state. |
| Delayed route → newer route | The newer destination wins after the delayed response settles. |
| Delayed route → Bag | Bag supersedes the uncommitted route, keeps source content and semantic position, and remains the only active surface. |
| Product with Synth prefetch | Prefetch changes no route/history/progression/consent state and creates no AudioContext, GLB request, or mutation. |

## Integration fixes

The cross-route pass found and fixed three defects that route-local tests did not expose:

1. The continuity capture handler intentionally prevents current-route link navigation, so Next.js `onNavigate` callbacks did not run. Current-route menu and Bag actions could therefore leave a dialog and Bag history marker stale. Primary-click cleanup now runs at the link boundary even when same-route framework navigation is prevented.
2. Same-route heading focus ran while a modal dialog was still open, so the browser correctly refused to move focus outside the modal. Canonical focus and context replacement now run on the next animation frame after surface cleanup.
3. Bag or menu intent did not supersede an already pending App Router transition. Surface-open events now replace the pending intent with the current route and restore its captured semantic context without moving focus out of the active dialog.

Shell focus changes outside `main` no longer rewrite route semantic context. Product’s route-local pending hint also uses the specified 100 ms visual grace period.

## History and focus restoration

[`history-focus-restoration-report.json`](history-focus-restoration-report.json) records explicit entry, Back/Forward, enhanced Home recomposition, Bag/menu cleanup, Preview stages, and superseded-intent behavior.

Return context remains history-entry-local and bounded. It stores route, semantic section, normalized progress, optional known focus target, scroll fallback, and enumerated visible state. Overlay controls do not become route focus targets. Restoration remains ordered as Core recomposition → semantic position → valid focus → enhancement activation, with delayed correction canceled by visitor interaction.

Bag uses one same-document marker and restores the actual invoker on close. Named destinations consume that marker before navigation. Preview retains only validated reached/active/completion state in its versioned tab-local record and clears its concern on global exit.

## Lifecycle and race trace

[`lifecycle-race-trace.json`](lifecycle-race-trace.json) indexes the injected route races, repeated hide/freeze/pagehide/pageshow cycle, same-route overlay consumption, prefetch observation, and local failure/Retry checks.

The Synth lifecycle journey demonstrates that repeated interruption signals coalesce, rendering/audio do not duplicate, sound never resumes automatically, values remain in the tab-local in-memory session, committed route navigation disposes the old engine once, and a later explicit gesture creates one replacement engine. Reload, new tab, and duplicate tab continue to start from MORPH defaults.

Failure remains local: Bag preserves its last confirmed snapshot and exposes targeted Retry; audio/rendering fallback leaves the semantic Control deck and route content usable; the framework-neutral route-intent boundary preserves source state and retries the same canonical destination.

## Focused verification

Executed against this working tree:

```text
pnpm exec vitest run tests/continuity/navigation.test.ts tests/continuity/restoration.test.ts tests/continuity/lifecycle.test.ts
pnpm exec playwright test tests/browser/continuity.spec.ts
pnpm exec playwright test tests/browser/continuity.spec.ts tests/browser/product.spec.ts --grep 'Bag intent supersedes|same-route intents|prefetch leaves|route-local progress'
pnpm typecheck:raw
pnpm check
```

The complete check passed: every requirement/evidence/boundary/media/audio/editorial validation, lint, type-check, production build, 47 unit-test files / 215 tests, 74 browser journeys, and 7 commerce-boundary journeys. A final focused pass after the narrow Preview-menu integration change also passed the Checkout Preview exit journey plus all continuity and global-shell journeys. Generated reports under `artifacts/reports/` remain local feedback with `acceptanceClaim: false`; immutable deployed evidence remains part of the merge/release boundary.

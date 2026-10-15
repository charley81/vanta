# Issue 50 — continuity-state implementation evidence

This record describes the implementation in the commit containing this file. It is focused engineering evidence for `STATE-001`–`STATE-008`, `ARCH-008`, `ARCH-009`, and supporting `QUALITY-013`; it is not launch-candidate sign-off or evidence from an immutable deployment.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Implementation choices

The continuity module uses separate framework-neutral concerns rather than an application-wide store:

| Concern | Lifetime | Implementation |
|---|---|---|
| MORPH session | in-memory, per mounted tab | factory-created observable store containing one selected control and six integer values from 0–100 |
| Presentation qualification | versioned `sessionStorage` | exact parser for eligibility, selected tier, and enumerated fallback reason |
| Preview progress | versioned `sessionStorage`, 30-minute inactivity | exact parser and legal-transition functions for reached/active stage and completion |
| Bag disclosure | local in-memory state | disclosure/invoker, generation-bound pending mutation, and enumerated local error |
| Return context | current `history.state` entry | namespaced schema merged with, rather than replacing, Next router state |

Session records use independent keys and clear only their own key after malformed JSON, an unknown version, contradiction, impossible progress, expiry, or clock anomaly. All records use exact fields and bounded identifiers. There is no `localStorage`, public query-state, telemetry persistence, visitor free text, or browser/media runtime object in a shared store.

`ContinuityBoundary` uses the Next 16 `router.bfcacheId` contract to distinguish a fresh route entry from Back/Forward restoration. Explicit navigation starts at the route beginning and focuses its `h1`; Back/Forward applies normalized progress to the current semantic section geometry and restores prior route focus where valid. In-page hash navigation remains native. A pointer-down snapshot avoids losing route focus/position when the activated navigation link receives focus.

## State precedence and parser report

Focused tests:

- `tests/continuity/state-parsers.test.ts`
- `tests/continuity/precedence.test.ts`
- `tests/continuity/privacy-boundaries.test.ts`

They cover valid defaults, exact schema parsing, concern-local clearing, unknown versions, future clocks, 30-minute expiry, impossible Preview progress, legal reached-stage revisits, forged terminal state, confirmed-Bag precedence, explicit-versus-history precedence, route-scoped MORPH use, serializability, and prohibited persistence/runtime-object scans.

## History and restoration journey report

`tests/continuity/restoration.test.ts` verifies the restoration sequence: recompose current conditions, resolve normalized semantic position, scroll, restore saved focus or a safe heading, activate enhancements, and permit at most one delayed correction. Visitor interaction cancels correction. Passive restoration with no prior route focus does not move focus.

`tests/browser/continuity.spec.ts` exercises the production App Router build and verifies:

- explicit Home → Product navigation starts at the canonical beginning and focuses the Product heading;
- Product → Synth → Back restores Product semantic position and prior route focus;
- activating the current route resets canonically without adding a history entry.

The full browser suite also re-verifies skip-link behavior, client navigation, modal focus containment, no-JavaScript content, route isolation, accessibility scans, and Editorial preview behavior.

## Transition-race, failure, prefetch, and lifecycle report

Focused tests:

- `tests/continuity/navigation.test.ts`
- `tests/continuity/lifecycle.test.ts`

They cover the 100 ms progress grace period, newer-intent supersession and abort, source-preserving failure state, Retry, Bag cancellation of pending route transition, mutually exclusive surfaces, prefetch exclusion from route-entry semantics, duplicate Bag mutation prevention, stale mutation-result rejection, repeated hide/freeze/pagehide coalescing, repeated BFCache restoration, local degraded fallback, and single disposal during an in-flight lifecycle operation.

Lifecycle restoration revalidates ownership before resuming optional enhancements. It does not model audio consent or automatic audible resume; those remain route-owned and must be invoked explicitly by later audio implementation.

## Verification commands

The repository verification wrappers retain generated reports under `artifacts/reports/` with the working-tree identity. The implementation was checked with:

```text
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:verified
pnpm test:browser
pnpm validate:requirements
pnpm validate:boundaries
pnpm validate:public-runtime
```

Generated reports are local feedback and do not make an Acceptance claim for a different commit or deployment identity.

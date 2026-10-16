# Issue 52 — accessible Bag disclosure evidence

This record describes the implementation in the commit containing this file. It is focused engineering evidence for `BAG-002`, `BAG-003`, `BAG-006`, `BAG-007`, and `BAG-008`, with supporting checks for `STATE-006`, `QUALITY-009`, and `QUALITY-010`. It is not launch-candidate sign-off, deployed evidence, or a substitute for the required manual assistive-technology matrix.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Design sources and implementation choices

Figma desktop MCP inspection used the `final` canvas, Product frame `129:476`, hero screenshot, and VANTA palette variables. The final canvas establishes the Signal Black composition and typography but contains no Bag-specific frame. Bag hierarchy and behavior therefore follow the approved Signal Ledger prototype decision in issue #37 at `2ada9fd`, rebuilt against the production application rather than copied from prototype code.

The root layout still reads no Bag cookie. A client-only `BagProvider` owns the narrow browser contract and retains only confirmed server snapshots, local disclosure state, an invoker reference, pending/error state, and an invalidation bit. The server remains authoritative through the existing read/Add/Remove client and Route Handlers.

## Bag journey report

`tests/browser/bag.spec.ts` exercises:

- Add remaining closed while pending and opening only after server confirmation;
- the approved linear populated hierarchy: persistence statement, MONOLITH / Graphite / quantity one, canonical subtotal, Remove, unavoidable Preview disclosure/action, Product, and MORPH Lab;
- empty and disabled outcomes, preserved last-confirmed state, targeted failure, explicit Retry, and removal;
- late Add confirmation updating the global count without reopening after committed navigation;
- same-document history entry, Back, Escape, backdrop, Close, named-destination consumption, and invoker restoration;
- the `vanta:bag-opened` pause signal, with no sound-resume action on close.

The UI contains no quantity editor, discount, tax, shipping, stock, payment, or purchase-completion control. Checkout Preview remains disabled until a read or Add has confirmed populated membership.

## Accessibility and responsive report

The production browser tests exercise the same semantic `<dialog>` as a right drawer at wide widths and a full-screen sheet at 390 and 320 CSS pixels. Rendered references are retained as [`bag-wide.png`](bag-wide.png) and [`bag-narrow.png`](bag-narrow.png). They verify heading focus, contained keyboard interaction, invoker return, minimum 44 × 44 CSS-pixel targets, no horizontal page overflow, and zero automated WCAG A/AA findings from axe-core for the populated narrow presentation.

Forced-colors and reduced-motion coverage remains in `tests/browser/global-shell.spec.ts`. Manual VoiceOver, NVDA, JAWS, TalkBack, 400% zoom, and physical-device qualification remain candidate-stage work and are not claimed here.

## Cross-tab and failure-injection report

Cross-tab tests establish an empty state in one tab, mutate in another, verify that the receiving tab still displays its prior confirmed state, then require a server read on focus/interaction before its count changes. Browser messaging contains only the exact versioned invalidation signal; no Bag snapshot or item data crosses the channel.

Focused coordinator and client tests cover immediate pending state, delayed confirmation, read-only retry, mutation non-retry, the 4.5-second timeout, stale-result ordering, explicit Retry, last-confirmed-state preservation, invalidation-only state, and deferred refetch. Existing Route Handler tests cover disabled configuration, invalid/expired/tampered cookie state, canonical empty responses, and idempotent Add/Remove.

## Verification commands

The implementation is checked with:

```text
pnpm validate:requirements
pnpm validate:evidence
pnpm validate:performance
pnpm validate:product-catalog
pnpm validate:boundaries
pnpm validate:public-runtime
pnpm validate:editorial
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:verified
pnpm test:browser
```

Generated reports under `artifacts/reports/` are local feedback bound to the working-tree identity and do not make an Acceptance claim for another commit or deployment.

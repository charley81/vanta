# Issue 46 — Core walking-skeleton implementation evidence

This record describes the implementation in the commit containing this file. It is focused engineering evidence for `ARCH-001`, `ARCH-002`, `ARCH-005`, `QUALITY-009`, `QUALITY-010`, `QUALITY-013`, and `OPS-001`; it is not launch-candidate sign-off or a substitute for an immutable deployment record.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Route and fallback implementation

The Node-backed Next.js application now has thin Server Component adapters for every canonical public route:

| Route | Core content | Enhancement boundary |
|---|---|---|
| `/` | Opening, nine canonical chapters, MORPH Lab invitation, closing | Stable authored CSS compositions; no realtime dependency |
| `/monolith` | Nine Product evaluation sections, code-owned price and specifications | Authored media placeholders; Bag reports local unavailability |
| `/synth` | Silent shell, six-control reference, values, purposes, and endpoints | Audio and realtime view explicitly unavailable |
| `/checkout-preview` | Exact synthetic-only disclosure and transparent direct-entry boundary | Unavailable until a later Bag delivery confirms membership |

Unexpected page-rendering defects terminate at `app/error.tsx`, which preserves the shared shell and offers targeted Retry/Home recovery. Expected missing capabilities render as route-local data rather than throwing. Unknown routes use the authored `app/not-found.tsx` boundary.

Checkout Preview exports response metadata equivalent to `noindex, nofollow, noarchive`. Home, Product, and Synth have unique code-owned titles and Editorial descriptions. A sitemap/canonical origin is intentionally not invented: the production HTTPS origin remains a pre-launch binding in the approved baseline.

## Route and no-JavaScript smoke report

`tests/browser/core-routes.spec.ts` exercises production-build output and verifies:

- direct HTTP entry for all four routes;
- exact route title and one visible descriptive `h1`;
- canonical Home chapter and Product section order;
- client navigation Home → Product → Synth and direct reload;
- useful Home and Product content and destination links with JavaScript disabled;
- explicit, contained Bag, audio, realtime, and Preview unavailable states;
- Checkout Preview response-level robots metadata;
- 320 CSS-pixel overflow checks and automated WCAG A/AA analysis on every route.

The focused production browser run passed all 16 repository tests. The generated `artifacts/reports/browser-tests.json` report records the Git/dirty identity and tool versions for the run; generated reports are local verification feedback and make no Acceptance claim.

## Initial route-isolation report

- `next build` classifies `/`, `/monolith`, `/synth`, and `/checkout-preview` as statically prerendered routes.
- `app/layout.tsx` reads no request API. The closed Bag trigger remains in the cacheable shell while `BagOverlayBoundary` owns Bag content below that shell seam.
- Server route adapters import route view-model composition directly and do not call local Route Handlers.
- Product imports no renderer, decoder, GLB, or audio implementation. The browser isolation smoke also rejects those resources on direct Product entry.
- The source-boundary validator rejects request APIs in the root layout, heavy-runtime leakage into Product/root, server/client poisoning, and local Route Handler calls.
- The public-runtime validator continues to reject platform SDKs, endpoints, modes, identifiers, and token-shaped configuration while allowing only the exact approved public Preview disclosure.

## Responsive visual review

These captures were produced from a local `next build` / `next start` production build of the same working tree:

- Home: [wide](home-wide.png), [320 CSS pixels](home-narrow.png)
- Product: [wide](product-wide.png), [320 CSS pixels](product-narrow.png)
- Synth: [wide](synth-wide.png), [320 CSS pixels](synth-narrow.png)
- Checkout Preview: [wide](checkout-preview-wide.png), [320 CSS pixels](checkout-preview-narrow.png)

The captures confirm readable stacking, no page-level horizontal scrolling, visible unavailable states, and preserved shell navigation. Manual assistive-technology, physical-device, 400% zoom, and immutable deployed qualification remain candidate activities and are not claimed here.

## Immutable deployment

The required immutable deploy-preview URL, exact source commit, and Netlify deploy ID must be added to issue #46 after this branch is pushed and the platform reports a ready deploy. Local captures and mutable aliases are not deployment identity.

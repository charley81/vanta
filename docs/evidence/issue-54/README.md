# Issue 54 — commerce-shaped journey boundary evidence

This record describes the focused qualification harness added for `BAG-001`–`BAG-009`, `PREVIEW-001`–`PREVIEW-012`, `SECURITY-006`, and `QUALITY-013`. It does not turn a local or branch run into candidate Acceptance evidence. A deployed pass is valid only when the generated report is retained and bound to the exact immutable deployment identity recorded in that report.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Commerce journey matrix

`tests/browser/commerce-boundary.spec.ts` uses the public browser and HTTP interfaces, without importing application internals. It runs serially against a real Bag server contract.

| Risk case | Exercised outcome |
|---|---|
| Direct entry | Empty or invalid Bag renders the transparent unavailable boundary. |
| Product → Bag → Preview | Product Add is server-confirmed before the Bag opens; the same cookie then authorizes Contact through terminal. |
| Stage progression | Contact, Delivery, Review, and terminal are reached at one canonical URL; each heading receives focus. |
| History | Back and Forward retrace only reached Preview stages. |
| Interruption | Reload offers explicit Resume for the last legal stage. |
| Bag removal | Removal during Preview clears Preview state and returns to the unavailable boundary. |
| Cross-tab | Add and Remove broadcast only `{type: "invalidate", version: 1}`; another tab keeps its confirmed snapshot until an authoritative refetch. |
| Timeout | A stalled mutation reports the targeted timeout in under five seconds, preserves the confirmed item, and succeeds through explicit Retry. |
| Inactivity expiry | Progress older than 30 minutes resets to fresh Contact without offering stale recovery. |
| Malformed state | Malformed JSON and an impossible reached/active-stage combination reset to fresh Contact without unlocking Review. |
| Tamper | A modified signed HttpOnly Bag cookie becomes empty and is cleared. |

The focused Playwright HTML report, traces on failure, and JSON attachments are retained below `artifacts/commerce-playwright/` and `artifacts/commerce-results/` by the existing CI artifact upload.

## Privacy, storage, network, and accessibility capture

The main journey attaches `commerce-stage-inventories` for Contact, Delivery, Review, and terminal. Every stage records:

- first-party request method, origin, path, and resource type, without query values, request bodies, headers, or cookie values;
- `localStorage` keys and parsed `sessionStorage` entries;
- cookie names and security attributes, without cookie values;
- form/input/select/textarea counts;
- automated WCAG A/AA findings.

The assertions permit only the three Bag endpoints, require zero editable or form controls, require empty `localStorage`, and require the sole Preview record to contain no synthetic identity/address/payment strings. They reject third-party and transaction-shaped requests. The capture therefore proves the automated storage/network boundary without retaining buyer data or Bag signing material.

## Restricted endpoint-security evidence

The `restricted-endpoint-security` attachment records status outcomes, not payloads, cookies, IP addresses, or secret material. The suite exercises:

- query and JSON schema injection;
- cross-origin mutation;
- malformed JSON, unsupported media, oversized body, and oversized cookie input;
- Add replay without lifetime extension;
- Remove replay remaining empty;
- mutation-burst rate limiting with a positive `Retry-After`.

The artifact is treated as restricted operational evidence because it documents the immutable target and abuse-control exercise. Application rate limiting remains defense in depth; a deployed run is also the qualification of the platform path used by this focused gate.

## Immutable deployed run

The dedicated config refuses mutable aliases. All three values are required and the URL hostname must exactly match this project's immutable 24-character Netlify deploy-ID origin:

```bash
COMMERCE_QUALIFICATION_BASE_URL=https://<deploy-id>--vanta-monolith.netlify.app \
COMMERCE_QUALIFICATION_DEPLOYMENT_ID=<deploy-id> \
COMMERCE_QUALIFICATION_APPLICATION_COMMIT=<full-40-character-commit> \
pnpm test:commerce
```

The first test reads Netlify's public deploy record and requires `state: ready` and `commit_ref` equal to the supplied application commit. The remaining tests then run against that same origin. Local runs use a temporary HTTPS reverse proxy over `next start`, deterministic non-production Bag signing material, and `acceptanceClaim: false` identity metadata.

A pre-implementation probe of main commit `1864677eb62d4f996fb6c19abe4c96dcf6547eb6` at immutable deploy `6ad1742497414beac510e967` passed the identity binding and failed the first commerce journey because deployed Bag configuration was disabled. That failure is retained as a blocker diagnosis only; it is not evidence for this branch or a later candidate. Enabling Bag requires the documented private Netlify bindings and approved secret custody before a new immutable deployment can pass.

## Risk-gate decision record

**Branch/local decision: BLOCK candidate Acceptance.** Local success is implementation feedback only. The gate changes to pass only when all focused tests pass against the immutable deployed application commit, the generated artifacts are retained at controlled URIs, and the security/privacy reviewer records approval against that identity. Any disabled Bag, identity mismatch, journey failure, transaction-shaped request, visitor-data persistence, endpoint-control failure, or missing artifact keeps the gate blocked; no listed boundary is waivable.

## Commands

```text
pnpm test:commerce
pnpm test:browser
pnpm validate:requirements
pnpm validate:evidence
pnpm validate:public-runtime
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:verified
```

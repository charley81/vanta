# Issue 51 — signed first-party Bag server-contract evidence

This record describes the implementation in the commit containing this file. It is focused engineering evidence for `BAG-001`, `BAG-004`, `BAG-005`, and `BAG-009`, with supporting checks for `ARCH-002`, `ARCH-010`, and `SECURITY-006`. It is not launch-candidate sign-off or evidence from an immutable deployment.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## API contract and security report

The browser-facing commerce surface is exactly:

- `GET /api/bag` — read Bag;
- `POST /api/bag/add` — add the one code-owned MONOLITH;
- `POST /api/bag/remove` — remove MONOLITH.

The two mutations accept only an exact, empty JSON object. Query parameters, extra fields, malformed JSON, unsupported media types, oversized bodies, and non-matching paths are rejected. Callers cannot select identity, quantity, price, buyer data, address, discount, GraphQL, checkout destination, tax, shipping, payment, or mode. Responses resolve MONOLITH identity and the `$2,499 USD` price from code-owned Catalog data.

Mutation requests require an exact same-origin `Origin`, use bounded per-client/per-instance rate limits, and refuse changes during a valid Editorial preview session. Production requests require HTTPS. All success and error responses are private, `no-store`, non-indexable JSON with bounded public error codes and no raw configuration or exception details. The application limiter is defense in depth; deployed qualification must also confirm Netlify's distributed abuse controls.

Focused coverage in `tests/bag/bag-route-contract.test.ts` exercises schema injection, cross-origin calls, unsupported and oversized bodies, request bursts, preview isolation, targeted errors, and canonical server-resolved responses. `tests/architecture/source-boundaries.test.ts` verifies that no additional Bag Route Handler or mutating HTTP method is present.

## Cookie and lifetime report

Populated membership is a compact HMAC-SHA-256 envelope whose payload contains exactly `{v, m, e}`: schema version, MONOLITH membership, and expiry. Empty Bag has no state cookie. The `__Host-vanta_bag` cookie is always `Secure`, `HttpOnly`, host-only, path `/`, `SameSite=Strict`, and capped at 30 days with matching `Expires` and `Max-Age`.

Verification rejects unknown versions, extra payload fields, malformed encoding/JSON, invalid signatures, future-clock anomalies, expiry, and lifetimes beyond 30 days. Invalid or expired state becomes empty and is cleared. `BAG_MODE` accepts only `disabled` and `first-party-bag`; unknown values fail startup. Missing or malformed private signing material disables Bag safely.

`BAG_SIGNING_KEYS` accepts at most three unique base64url values that each decode to 32–64 bytes. The first signs and all configured keys verify. A cookie verified by a fallback key is re-signed with the active key without extending its expiry. Rotation and emergency-disable procedures are recorded in `docs/operations/delivery-path.md` without exposing secret values.

Focused tests cover cookie attributes and exact payload, tampering, expiry, malformed/missing configuration, startup mode validation, active/fallback key rotation, and non-extension of existing lifetime.

## Race and idempotency report

Add is a set-membership operation and Remove is a clear-membership operation; replaying either produces the same state. Repeated Add preserves the original expiry rather than creating sliding persistence.

The browser request module's only network operations are `read`, `add`, and `remove`; it also exposes the last confirmed snapshot for local rendering. All requests are serialized in invocation order, which prevents response-cookie races as well as late reads or mutations overwriting newer confirmed intent. Only reads receive one bounded automatic network/gateway retry. Mutation and parsing failures leave the last confirmed state intact, and the shared 4.5-second deadline produces a targeted timeout before the five-second product limit.

`tests/bag/bag-client-ordering.test.ts` covers an in-flight read completing before a newer Add is dispatched, queued Add/Remove ordering, read-only retry, mutation non-retry, targeted timeout, and preservation of confirmed state after failure. The existing continuity tests independently cover duplicate pending mutations and stale completion rejection at the Bag disclosure-state seam.

## Public-runtime isolation report

The implementation has no public commerce-platform mode, dependency, endpoint, identifier, token, product request, cart, or checkout URL. Product and price resolution use only `src/product/product-truth.ts` and `src/catalog/catalog.ts`. `pnpm validate:public-runtime` scans dependencies, Next configuration, and all `app`/`src` production source; its requirement mapping now includes `BAG-009` alongside `ARCH-010`.

The root layout remains free of request-time cookie access. Bag handlers are request-time routes and the production build reports all three as dynamic while Home, Product, Synth, and Checkout Preview remain independently prerendered.

## Local verification

The implementation was checked with:

```text
pnpm validate:requirements                 PASS
pnpm validate:evidence                     PASS
pnpm validate:performance                  PASS
pnpm validate:product-catalog              PASS
pnpm validate:boundaries                   PASS
pnpm validate:public-runtime               PASS
SANITY_CONTENT_SOURCE=fixture pnpm validate:editorial   PASS (60 tests)
pnpm lint                                  PASS
pnpm typecheck                             PASS
SANITY_CONTENT_SOURCE=fixture pnpm test:unit            PASS (33 files, 141 tests)
SANITY_CONTENT_SOURCE=fixture pnpm build:verified       PASS
CI=1 SANITY_CONTENT_SOURCE=fixture pnpm test:browser    PASS (20 journeys)
```

Generated reports under `artifacts/reports/` are local feedback bound to the working-tree identity and set `acceptanceClaim: false`. Deployed cookie/header capture, network trace, distributed abuse qualification, configuration provenance, and immutable candidate identity remain candidate-environment evidence; this report does not substitute for them.

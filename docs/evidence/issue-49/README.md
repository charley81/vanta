# Issue #49 — secure Editorial preview and invalidation report

Scope: `CONTENT-004`, `CONTENT-005`, `CONTENT-006`, and `CONTENT-007`, with supporting checks for `SECURITY-001`, `SECURITY-003`, and `SECURITY-006`.

This is an implementation and local-verification record. It is not release Acceptance evidence for a deployed candidate. The release manifest must still bind the configured origins, secrets, content revisions, deployment identity, deployed captures, and public freshness exercise to one immutable candidate.

## Preview security and isolation

The protected entry handler uses Sanity's short-lived Preview URL secret contract and a least-privilege read token. Before enabling Next.js Draft Mode it validates all of the following:

- the secret against the configured Sanity dataset;
- the initiating Studio's exact configured HTTPS origin;
- an exact `/`, `/monolith`, or `/synth` destination with no query, fragment, alternate origin, or protocol-relative form;
- `drafts` or a bounded, validated release stack ending in `drafts`.

The selected perspective and Studio origin are stored in a one-hour `HttpOnly` HMAC-signed session. Missing or malformed bindings, target injection, malformed perspectives, expired sessions, tampering, and per-client request bursts fail closed. Exit validates the signed session and same-origin browser context, then clears Draft Mode and the private session through POST only.

Preview uses the production route components. It adds a persistent visible marker and disables both Product Bag triggers. The current Core Bag boundary has no mutation implementation, so the global Bag control cannot change state. Preview projections use an authenticated, non-CDN Sanity client outside every `use cache` scope. Published cache functions do not import preview code or the read token.

Metadata takes a separate published-perspective path during preview. The preview banner receives only perspective labels, not route content. No telemetry or browser live-content bridge exists in this candidate, so draft/release values have no journey-analytics, `postMessage`, WebSocket, or EventSource path. Browser verification confirms the preview response is private/no-store and receives response-level noindex.

## Framing and connection policy

Public responses use an enforced static CSP with `frame-ancestors 'none'` plus `X-Frame-Options: DENY`. A valid signed preview session changes framing only on the three allowlisted preview routes and permits only the exact configured Studio origin. Its browser `connect-src` remains `'self'`; draft reads happen on the server and this implementation intentionally adds no browser Sanity or live-refresh connection. API and non-preview routes retain public frame denial.

Both policies are nonce-free and cache-compatible. They retain the framework-required static inline script/style allowances, deny objects and nested frames, restrict images to self/data/blob plus the exact Sanity CDN host, and use same-origin form, worker, media, and connection policies. Camera, microphone, geolocation, payment, USB, browsing topics, and other unused capabilities are disabled.

Deployed report-only observation, exact Studio iframe qualification, and enforcement capture remain deployment checks; this local report does not claim them.

## Invalidation and freshness

The publication endpoint accepts POST JSON only, caps the raw body at 8 KiB, validates Sanity's official signature before parsing, and accepts exactly `{documentId, revision}` for one of the four fixed singleton IDs. The document ID maps internally to one exact cache tag; callers cannot provide a tag, path, URL, or query. Revalidating the same tag is idempotent, so duplicate delivery and replay cannot broaden or compound the effect.

The endpoint marks the affected tag stale with the `max` stale-while-revalidate profile and polls an exact configured public-origin freshness endpoint. Each published view model and its Sanity revision are read and cached as one document-tagged snapshot, so the verifier cannot refresh an unrelated revision cache. The bounded schedule allows seven attempts and at most 53 seconds including request timeouts. A matching cached published revision returns success. Failure returns `503` and `Retry-After`, preserving Next.js's last-valid cached output and asking Sanity to retry rather than reporting a false publication success.

Preview, invalidation, and freshness handlers include bounded per-client/per-instance limits with capped key storage and no logging. Because serverless instances do not share process memory, deployed qualification must also confirm Netlify's distributed abuse controls; the application limiter is defense in depth, not a claim of cross-instance enforcement.

The Studio webhook configuration is documented in [`sanity/README.md`](../../../sanity/README.md). A deployed signed webhook, platform retry observation, and externally observed ≤60-second publication remain candidate-environment evidence.

## Automated checks

Focused coverage includes:

- malicious target, origin, perspective, cookie, and secret/configuration cases;
- POST-only, same-origin preview exit;
- exact draft/release perspective forwarding through fixed projections;
- draft/public cache and metadata isolation;
- public versus preview frame/connect/header policy;
- signature failure, oversized/malformed/injected payloads, exact tag mapping, replay-safe handling, retry success, and operational failure;
- a production-browser preview journey covering the visible marker, no-store/noindex headers, exact frame ancestor, disabled Bag actions, and exit.

Commands and results for this branch:

```sh
SANITY_CONTENT_SOURCE=fixture pnpm validate:editorial
# PASS — schema/seed validation and 60 Editorial tests

SANITY_CONTENT_SOURCE=fixture pnpm test:unit
# PASS — 24 files, 98 tests

pnpm lint
pnpm typecheck
pnpm validate:boundaries
pnpm validate:public-runtime
pnpm validate:requirements
pnpm validate:evidence
# PASS

SANITY_CONTENT_SOURCE=fixture pnpm build:verified
# PASS — public routes remain prerendered with 30-day revalidation / one-year expiry

CI=1 SANITY_CONTENT_SOURCE=fixture pnpm test:browser
# PASS — 17 Chromium journeys, including protected preview and exit
```

The required deployed preview capture and deployed public freshness exercise have not been fabricated or substituted with local evidence. They remain explicit completion gates.

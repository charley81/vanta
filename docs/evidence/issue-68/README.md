# Issue 68 — Discoverability implementation evidence

This directory records implementation-level evidence for `OPS-001`, `OPS-002`, `OPS-003`, `PRODUCT-003`, `PRODUCT-005`, `CONTENT-009`, and the response-policy portion of `SECURITY-002`.

These reports were produced from the working tree based on `eb863f3e697d463a5549ffa9a7839dd839abec77`. They are **not** immutable candidate Acceptance evidence. A protected-main commit, production deployment identity, deployed redirect checks, platform social-card previews, and validator runs against that exact deployment remain launch-candidate work.

## Reports

- [`metadata-indexing-report.json`](metadata-indexing-report.json) — exact titles, description lengths, canonicals, sitemap, icons, social metadata, and noindex boundaries.
- [`redirect-report.json`](redirect-report.json) — configured-origin, host, protocol, trailing-slash, legacy-path, and deploy-preview behavior.
- [`structured-data-validator.json`](structured-data-validator.json) — Schema.org Markup Validator results from rendered local production-build HTML plus prohibited-commerce and injection checks.
- [`social-card-review.json`](social-card-review.json) — dedicated 1200×630 route-card review and rendered metadata checks.

## Implemented policy

Only `/`, `/monolith`, and `/synth` emit indexable metadata, canonicals, and sitemap entries. Checkout Preview, API, missing/operational routes, valid Editorial previews, and non-production Netlify deployments receive `X-Robots-Tag: noindex, nofollow, noarchive`. Robots exclusions supplement rather than replace response-level controls.

Production requests on any alternate host or protocol redirect with `308` to the configured HTTPS origin. Non-root trailing slashes and the documented legacy routes normalize in the same redirect. Deploy previews intentionally remain reachable for qualification while carrying response-level noindex.

Home emits linked `Organization` and `WebSite` JSON-LD. Product emits code-owned identity, material, Graphite finish, dimensions, architecture, connections, controls, published description, and images. It emits no Offer, SKU, availability, rating, review, price, or action property. JSON-LD serialization escapes script-breaking characters.

## Verification completed

- focused unit/integration discoverability suite;
- rendered production-build Playwright discoverability suite;
- TypeScript route generation and type check;
- production build;
- Schema.org Markup Validator: zero errors and zero warnings for Home and Product output;
- source-image inspection at 1200×630.

The final repository-wide checks are recorded in the delivery summary for the implementation branch.

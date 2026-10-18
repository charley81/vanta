# Launch readiness

This checklist is proportionate to a solo-maintained portfolio site. It protects visitor experience, accessibility, security, privacy, Product truth, and recovery without requiring a custom operations platform or enterprise approval process.

The launch record may be a short issue comment or Markdown note. It must identify the deployed Git commit and immutable Netlify deployment URL, list the checks run, record material failures or accepted gaps, and contain one owner go/no-go decision. A separate candidate evidence manifest is optional.

## 1. Automated checks

Before launch, run the repository checks against the intended commit:

- install with the pinned package manager;
- requirement and configuration validation;
- lint and type checking;
- unit, component, and critical browser-journey tests;
- production build through the supported Netlify path;
- Product truth, Catalog, media-source, and public-runtime boundary checks;
- key bundle/media budgets and route-isolation checks;
- metadata, canonical, sitemap, robots, redirect, and structured-data checks;
- automated accessibility checks with no serious or critical finding;
- security-header, secret, dependency, and public-source-map checks.

A failed check is fixed or recorded with its visitor impact. Transaction-boundary, visitor-data, secret-exposure, and deceptive-commerce failures cannot be accepted for launch.

## 2. Focused journey review

Review these journeys on the deployed build:

### Home

- Core content, canonical chapter order, Product and Synth exits;
- vertical and eligible horizontal presentations;
- reduced-motion behavior;
- stable authored fallback when Realtime is unavailable.

### Product

- canonical identity, specifications, `$2,499 USD`, and Editorial sequence;
- Add to Bag, failure feedback, and Product-to-Synth path;
- no eager 3D or audio download on direct entry.

### Synth

- silent entry and explicit **Enable Sound**;
- six semantic controls, transport, and visible status;
- audio remains usable without 3D;
- model, WebGL, and audio failures retain useful content and recovery.

### Bag and Checkout Preview

- empty, add, populated, remove, and expiry behavior;
- keyboard and focus behavior for the Bag modal;
- Contact → Delivery → Review → Ordering offline;
- no editable buyer fields, Shopify request, payment, order, fulfillment, or notification effect.

### Editorial preview

- authenticated entry and exit;
- exact Sanity framing/origin policy;
- Bag mutation disabled;
- drafts excluded from public caches, metadata, and social output;
- public content remains usable during a Sanity failure.

## 3. Accessibility and responsive review

At minimum, review:

- keyboard operation, focus order, focus visibility, modal containment, and focus return;
- headings, landmarks, labels, live status, native range semantics, and error communication;
- 320 CSS pixels and 400% zoom without two-dimensional page scrolling or clipped primary actions;
- reduced motion, forced colors, and 44 × 44 CSS-pixel targets;
- critical journeys with an available screen reader;
- current mainstream desktop and mobile browsers on practical available devices.

Record unavailable device or assistive-technology coverage honestly. Do not represent it as completed, and do not create a prescribed device lab solely for this site.

## 4. Performance and fallback review

- Run at least one repeatable production-build profile for each primary route.
- Confirm key route JavaScript/media budgets and heavy-runtime isolation.
- Confirm Realtime becomes useful or selects the authored fallback without blocking content.
- Check one practical desktop and one practical mobile presentation when available.
- Investigate material regressions; do not require field traffic or a median-of-three laboratory program for launch.

## 5. Security and privacy

- Enforce the validated public and Editorial-preview CSPs and required security headers.
- Verify secrets and draft tokens are absent from browser bundles, generated output, responses, and repository content.
- Verify production browser source maps are not served.
- Run focused security tests for the actual Bag, Draft Mode, and Sanity invalidation endpoints.
- Confirm the public application has no custom analytics, telemetry endpoint, visitor identity, replay, fingerprinting, or custom telemetry storage.
- Confirm no Shopify code, identifier, credential, request, or qualification harness enters public production.

A custom monitoring provider, five-minute probes, private source-map service, field-vitals pipeline, and non-public Shopify qualification are not launch requirements.

## 6. Production bindings and recovery

Maintain one concise owner runbook that records:

- production origin and Netlify project;
- Sanity project/dataset and Studio origin;
- secret locations without secret values;
- Bag configuration and emergency disablement;
- access recovery outside the repository;
- how to select a previous Netlify deployment;
- how to restore known-good Sanity content and verify the public result.

Use MFA and least privilege where supported. A backup custodian is optional; absent backup coverage is an explicit solo-maintainer risk, not a launch blocker.

## 7. Launch

1. Confirm CI and the focused manual review passed for the intended commit.
2. Record the commit and immutable Netlify deployment URL.
3. Record one owner **go** or **no-go** decision.
4. Deploy from protected `main`.
5. Smoke-test Home, Product, Synth, Bag, Checkout Preview, and Editorial publishing.
6. Inspect hosting-provider status or logs if a failure appears.
7. Roll back to a previous Netlify deployment when a material Core, Product-truth, accessibility, security, privacy, or transaction-boundary failure is found.

There is no required seven-role signature set, 30-minute staffed launch watch, or pre-launch rollback rehearsal.

## 8. Post-launch

Field-quality review is optional and uses hosting-provider data only when enough useful data is naturally available. Insufficient traffic does not create a standing task. Add an external uptime check only after availability becomes a demonstrated concern.

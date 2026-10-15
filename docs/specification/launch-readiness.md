# Launch readiness and acceptance handoff

This checklist qualifies one immutable candidate. It is not evidence itself. Every completed item must link to an entry in a release-specific evidence manifest based on `evidence-template.yaml` and to the relevant requirement IDs.

## 1. Candidate identity

Before testing, freeze and record:

- Handoff Baseline commit;
- application commit and immutable deployment ID/URL;
- lockfile, Node and pnpm versions;
- Next.js and Netlify adapter versions;
- Sanity schema commit, dataset, published revision/Content Release;
- Product-truth/Catalog manifest hash;
- approved GLB source hash, derivative-manifest hash, and media manifest;
- configuration schema/hash excluding secrets;
- approver and intended production origin;
- previously qualified rollback deployment.

Evidence collected against another build, content release, asset set, or environment does not qualify this candidate unless the check is explicitly environment-independent and the manifest explains why.

## 2. Automated candidate gates

All must pass:

- clean install with pinned package manager;
- schema/environment/pre-launch-binding validation;
- formatting policy if configured, lint, type check, unit/integration/component tests;
- production build using the deployed adapter path;
- Product-truth and Catalog manifest validation;
- required Sanity singleton/projection validation;
- approved GLB checksum, glTF validation, required-node assertions, derivative reproducibility/manifest checks;
- route-isolation assertions: Product/global shell/Bag exclude 3D/audio; public runtime excludes Shopify identifiers, clients, URLs, and tokens;
- bundle, transfer, font, model, motion, and generated-asset budgets;
- rendered metadata, canonical, redirect, sitemap, robots, noindex, icons, social-card, and JSON-LD assertions;
- automated accessibility with zero serious/critical findings;
- security-header/CSP policy assertions;
- secret, dependency, vulnerability, and public-source-map scans with no unresolved critical finding;
- endpoint schema, origin, rate-limit, idempotency/replay, injection, and abuse tests as applicable;
- telemetry allowlist/redaction/size/failure-isolation tests;
- storage/history parser tests for malformed, expired, impossible, old-version, and forged state;
- failure-injection suite and recovery assertions;
- no-JavaScript Home/Product content/link smoke;
- deployed smoke tests against the immutable candidate.

## 3. Route and journey matrix

Verify direct entry, client navigation, reload, Back/Forward, resize/rotation, and recovery where applicable.

### Home

- opening → nine canonical chapters → MORPH Lab invitation → closing;
- ordinary scrolling, reversible desktop horizontal presentation, and vertical fallback;
- Home → Synth and Home → Product exits;
- semantic restoration without motion replay;
- Core, Motion, Realtime, reduced-motion, data-saving, and runtime-failure presentations;
- realtime absent when ineligible and abandoned safely at runtime thresholds.

### Product

- hero, canonical `$2,499 USD`, Product truth, specifications, Editorial sequence;
- Add to Bag confirmed/idempotent path, failure/timeout/retry, late-result race;
- Product ↔ Synth and final Bag action;
- no 3D/audio modules/model request on direct entry;
- responsive stacks and semantic specifications.

### Synth

- silent direct entry and trusted Enable Sound;
- all six controls through semantic ranges and 3D where eligible;
- unsupported controls inert and non-focusable;
- smooth MORPH semantic tests and five secondary-control tests;
- audio independent of 3D, data-saving opt-in model load, GLB/decode/context fallback;
- Pause/Resume, Bag interruption, route navigation, hidden/frozen/BFCache cycles;
- MORPH persistence through client navigation and reset on reload/new tab;
- ten-minute audio/runtime stress trace.

### Bag

- empty, add, populated, remove, expiry/tamper, disabled, and server failure;
- side drawer and full-screen sheet as one accessible modal;
- invoker focus return, Escape/backdrop/Close/Back behavior;
- Product and MORPH Lab destinations;
- cross-tab invalidation/refetch without copying content;
- no checkout/payment/quantity/discount/tax/shipping controls.

### Checkout Preview

- valid Bag entry and empty/invalid/expired Bag direct entry;
- Contact → Delivery → Review → Ordering offline;
- exact predefined fictional values and no editable fields/network submissions;
- stage locks, revisits, same-URL Back/Forward, terminal Back/Forward;
- interruption Resume/Start again, 30-minute expiry, malformed/forged session;
- Exit/global navigation/Return/Preview again history consumption;
- Bag open/remove during each stage and terminal;
- Return to MONOLITH with Bag retained;
- assertion of no Shopify/payment/order/fulfillment/notification effects.

### Editorial preview and publishing

- authenticated allowlisted entry, visible marker, exact perspective, private/no-store/noindex;
- production component tree and Product truth with Bag mutation disabled;
- malicious secret/target/perspective attempts fail closed;
- draft content excluded from public caches, metadata/social output, and telemetry;
- schema validation, author/publisher audit, preview-before-publish;
- signed idempotent narrow invalidation and ≤60-second public freshness;
- failed invalidation retains last valid result and reports operational failure;
- known-good content rollback and verification.

## 4. Responsive and accessibility evidence

### Layout/input/preferences

Test at minimum 320 CSS pixels, 390×844, 1366×768, 1440×900, and 400% zoom, plus content-driven breakpoints. Exercise keyboard, touch, fine pointer, coarse pointer, viewport changes, orientation, reduced motion, forced colors, Save-Data/data-saving path, and live preference changes.

### Manual accessibility

Record results for:

- complete keyboard-only route and critical-journey operation;
- skip link, headings/landmarks, focus order, visible focus, route focus, restoration;
- menu/Bag focus containment and invoker return;
- 44 × 44 CSS-pixel targets;
- text reflow at 400%/320 CSS pixels without two-dimensional page scroll;
- non-color/non-motion state communication;
- reduced motion and forced colors;
- range semantics/value announcements and throttling;
- meaningful live-region transitions without chatter;
- image alt/decorative decisions;
- error, pending, unavailable, retry, and recovery communication.

Assistive-technology matrix:

- VoiceOver + Safari on macOS;
- VoiceOver + Safari on iOS;
- NVDA + Firefox on Windows;
- JAWS + Chrome on Windows;
- TalkBack + Chrome on Android.

Any A/AA exception requires the waiver process; serious/critical automated findings are not waivable for launch.

## 5. Performance, rendering, and audio evidence

Run the median of three cold production-build measurements per route/presentation and retain raw reports.

- lab Web Vitals/TTFB meet thresholds; route and viewport identified;
- every byte budget includes compressed transfer accounting and activation boundary proof;
- Product request/module graph proves 3D/audio isolation;
- Home/Synth model and renderer requests occur only after qualification/activation;
- Realtime startup trace uses 10 Mbps and 4× CPU reference;
- frame traces cover desktop/mobile targets and hard-floor downgrade;
- GPU resource estimate and decoded texture allocation pass;
- long-task assertions pass;
- context loss and 8-second startup fallback pass;
- cold/warm first-audio and control-to-schedule latency pass;
- visible control update frame and ten-minute sound stress pass;
- physical floor devices pass Core; Realtime floors either qualify and pass or validly select fallback.

Once production field volume is sufficient, attach p75 mobile/desktop route dashboards and alert tests; until then, lab gates remain launch authority.

## 6. Resilience exercises

Inject and record expected local outcome, preserved state, announcement, retry, and telemetry for:

- JavaScript disabled and script chunk failure;
- offline, timeout, and server error;
- missing/malformed Sanity content and failed publication invalidation;
- Bag read/add/remove failure, timeout, duplicate, out-of-order completion, invalid cookie;
- malformed/expired Preview and history state;
- model 404, decoder failure, slow startup, WebGL context loss, sustained low frame rate;
- audio preparation timeout, suspended context, output interruption, repeated hide/restore;
- telemetry and monitoring outage;
- missing/malformed optional and required credentials;
- deployment smoke failure and content/application rollback.

No optional subsystem failure may replace Core route content or corrupt unrelated state.

## 7. Security and privacy qualification

Retain controlled evidence for:

- CSP report-only observation followed by enforced qualification across routes/tiers/preview;
- zero application-breaking enforced violations;
- exact origin lists and documented framework inline allowances;
- public frame denial and exact preview framing exception;
- HSTS/TLS/domain checks; subdomain/preload excluded until separately proven;
- restrictive Permissions Policy and other required headers;
- source-map 404 and private-map controlled upload/retention;
- secret/draft token absence from bundles, output, logs, and responses;
- injection tests for Editorial content, redirects, image URLs, telemetry, JSON-LD;
- endpoint origin/schema/rate-limit/replay/idempotency/abuse checks;
- dependency, vulnerability, and secret scans;
- telemetry payload allowlist, redaction, 10 KiB bound, retention, and GPC/DNT;
- confirmation of no cookies/identity/fingerprint/replay/autocapture/free text;
- public privacy notice and legal review of deployed configuration;
- Preview network capture proving no buyer fields, submission, Shopify, payment, order, fulfillment, or notifications.

Security or privacy evidence that exposes exploit detail, credentials, private maps, or sensitive configuration stays in a restricted system; public manifest entries record result, provenance, custodian, retention, and controlled link.

## 8. Content, Product truth, and design acceptance

- every Product fact/claim and `$2,499 USD` matches canonical truth;
- no public concept/unavailable copy outside Checkout Preview transparency;
- no unsupported claim, false Offer, purchase promise, urgency, scarcity, stock, tax, or shipping estimate;
- Sanity fields respect ownership, limits, links, alt text, and designed structure;
- initial Editorial seed is populated or revised through approved preview/publishing;
- route screenshots at desktop/mobile/reduced-motion/forced-colors are reviewed against pinned Figma regions and Signal Black;
- Product media crops and all GLB derivatives trace to source/pipeline specs;
- production font and cyan choices are recorded and accepted under Implementation latitude;
- exact code-owned Bag/Preview/control/recovery strings are verified.

## 9. Discoverability

- production origin, HTTPS, alternate-host/trailing-slash/legacy redirects pass;
- only Home/Product/Synth canonical and sitemap entries exist;
- Checkout Preview and all private/operational surfaces have response-level noindex policy;
- exact titles, unique 120–160-character descriptions, dedicated 1200×630 social images, icons, Open Graph/large-image metadata pass;
- Product JSON-LD contains required facts and no Offer/SKU/availability/rating/review/action;
- validators show no warning indicating false commerce capability;
- Google Search Console and Bing ownership, URL inspection, and sitemap submission are recorded.

Indexing/ranking is monitored, not promised as a deterministic release result.

## 10. Non-public Shopify qualification

In the password-protected development store only:

- validate expected VANTA/MONOLITH/Graphite/$2,499 catalog identity;
- exercise representative Storefront product and Cart API behavior;
- exercise native test checkout and any Checkout Functions under synthetic data;
- prove test payment cannot charge real money;
- prove notifications and fulfillment are suppressed;
- mark and cancel/archive disposable test orders;
- scan public bundles/config/network/logs for absence of store identifiers, tokens, carts, and checkout URLs;
- demonstrate public VANTA remains fully functional while the development store is unavailable.

A failed or skipped qualification is recorded as failed/not-run evidence and never weakens the public boundary.

## 11. Deployment and rollback exercise

Before promotion:

1. deploy the immutable candidate;
2. run deployed route/security/content/runtime smoke checks;
3. verify dashboards, probes, alerts, deployment identity, and private source maps;
4. roll back to the named previously qualified deployment;
5. repeat essential Core smoke;
6. re-promote the exact candidate without rebuilding;
7. exercise independent Sanity content rollback/invalidation;
8. confirm release record contains all identities, owners, checks, links, and rollback target.

Promotion starts a 30-minute launch watch. During the watch, named owners monitor Core routes, errors, performance, fallback rates, Bag/Preview, content, and transaction/privacy boundary.

## 12. Operations and incident readiness

Verify named primary/backup coverage, MFA/recovery, least privilege, secrets locations, escalation contacts, and runbooks for:

- alert acknowledgement and incident classification;
- local 3D/audio/telemetry/media disablement;
- application and content rollback;
- content freeze and invalidation recovery;
- domain/DNS recovery;
- credential rotation;
- stakeholder communication and post-incident review.

Incident classes:

- **Critical:** disclosure, all Core routes unavailable, or deceptive transaction behavior. Launch watch: acknowledge ≤15 min; disable/rollback ≤30 min.
- **Major:** one Core route unavailable, Bag/Preview broadly broken, publishing corrupts public content, or sustained server errors. Launch watch: acknowledge ≤30 min; restore ≤2 h.
- **Enhancement:** optional 3D/audio/analytics/media failure with useful Core fallback. Fallback immediately; investigate next working period.

No external uptime SLA is promised. Outside launch windows, operation is explicitly best-effort small-team coverage.

## 13. Waivers

A waiver must include:

- requirement/gate ID;
- measured evidence and user/business impact;
- rationale for launch despite the gap;
- compensating control;
- named owner and approvers;
- issue link;
- expiry date and follow-up milestone.

Never change a threshold, test, configuration, or evidence claim merely to obtain a pass. Transaction-boundary, visitor-data prohibition, secret-exposure, and deceptive-commerce failures are not waivable.

## 14. Final sign-off

The signed readiness record must include approvals for:

- product/design;
- engineering;
- accessibility;
- content/editorial;
- security/privacy;
- operations/release;
- one named Release Approver.

One person may hold multiple roles. Each signature records identity, timestamp, candidate deployment, Handoff Baseline commit, evidence-manifest hash/link, accepted waivers, backup status, and explicit **approve** or **reject**. Missing evidence blocks approval.

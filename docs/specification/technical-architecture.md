# Technical architecture specification

## 1. Production shape

VANTA is one server-first Next.js 16 App Router application deployed through Netlify’s Node-backed Next.js integration. It is not a static export, Edge application, microfrontend system, or separate application backend.

Server Components own source composition and route HTML. Client boundaries sit as deeply as possible around global menu/Bag disclosure, Home cinematic rendering, Synth Control deck/runtime, continuity coordination, and other browser-only behavior. The root layout must not read Bag cookies; it renders cacheable navigation, a closed Bag trigger, providers, and route content. Request-time Bag work begins inside the overlay boundary.

Server Components call server-only composition modules directly rather than the application’s own Route Handlers. Browser code reaches privileged behavior only through narrow same-origin Route Handlers. Use `server-only`/`client-only` boundaries and tests to prevent environment poisoning and heavy-runtime leakage.

Pin Node 22.12 or newer and the repository’s pnpm version. Next.js, the Netlify integration, Sanity schema/client, CSP, and material dependency upgrades require normal build and smoke qualification.

## 2. Deep feature modules

Framework route files and handlers remain thin adapters over these deep modules:

1. Product truth and public Catalog values;
2. route view-model composition;
3. Sanity Editorial adapter, validation, preview, and invalidation;
4. first-party Bag session and narrow browser contract;
5. Checkout Preview state machine;
6. MORPH session and calibrated audio engine;
7. shared 3D scene/asset primitives with separate Home and Synth orchestrators;
8. Presentation qualification;
9. Return context and lifecycle coordination.

Vendor SDK responses, credentials, queries, cache policy, and errors stay inside adapters. Public module interfaces return domain-shaped validated data or typed availability results. Expected absence/unavailability is data; unexpected programming defects throw to the nearest boundary.

## 3. Source ownership

| Authority | Owns | Must not own |
|---|---|---|
| Code | Product truth; public Catalog values; route/section structure; behavior; choreography; operational/accessibility language; approved GLB and derivatives; audio calibration; metadata titles/canonicals/index policy; structured-data shape | Editable Editorial prose/media |
| Sanity | Fixed Editorial singleton copy; Editorial images; crop/hotspot; contextual alt text/captions; SEO descriptions; dedicated social images | Price, Product facts, controls, navigation, behavior, arbitrary page building/HTML/links |
| Figma | Composition, content structure, art direction, crop references | Runtime content, geometry, behavior, Product truth |
| Approved GLB | Product geometry and named interaction hierarchy | Copy, layout, behavior |

Composition never fills one owner’s missing value from another owner. VANTA has no Shopify runtime, store, credential, harness, or launch dependency.

## 4. Sanity model and composition

Sanity contains fixed singletons:

- `siteSettings`;
- `homePage` with opening, nine named chapters, MORPH Lab invitation, closing, and contextual media;
- `productPage` with hero, thesis, sonic philosophy, SUB/FRACTURE, MORPH, craft, MORPH Lab invitation, and contextual media;
- `synthPage` for Editorial content outside the instrument;
- inline `editorialImage` and `seo` objects.

There is no generic page/section builder, Portable Text surface, arbitrary HTML, arbitrary link insertion, Sanity product, price, specification record, Bag, navigation, audio/control definition, or behavior record. Designed text fields have explicit limits; links accept only approved internal destinations or validated HTTPS URLs; non-decorative images require contextual alternative text.

The server composition layer joins immutable code Product truth/Catalog values with narrow Sanity projections into validated route view models. A clean candidate build fails if required singletons are absent or invalid. Runtime Sanity failure keeps the last valid cached public result; it never invents fallback Editorial copy or replaces a route with a generic error.

## 5. Caching and preview

Enable Cache Components. Published Sanity reads use explicit async `use cache` functions, `cacheLife("max")`, and singleton/document-specific `cacheTag` values. Request APIs are never read inside ordinary cached scopes. Signed, idempotent Sanity invalidation targets only affected tags and is retried. Publication is operationally successful only when public verification sees the change within 60 seconds; a five-minute synthetic check is the fallback.

Cache entries are deployment-scoped. Do not assume in-process Cache Component state survives requests on serverless infrastructure or survives deployment. If persistent cross-request runtime caching is required, qualify a platform remote handler rather than assuming it.

Draft/release preview uses Next.js Draft Mode and the production component tree. Entry validates authentication, secret, requested perspective, and an application-owned allowlisted Home/Product/Synth destination before enabling Draft Mode. Exit is POST-based. Preview:

- bypasses public caches and never writes draft output into them;
- is visibly marked, private/no-store, non-indexable, and excluded from journey analytics;
- disables Bag mutation;
- cannot alter Product truth, public Catalog values, behavior, or public cache state;
- never emits draft/release data through social images, metadata, or public journey state.

One root Sanity live-content bridge may refresh affected Server Component output. Preview CSP may allow framing only by the exact configured Sanity Studio origin and only the required API/WebSocket origins; public CSP remains stricter.

## 6. Public Bag backend-for-frontend

The browser contract is exactly:

- read Bag;
- add MONOLITH;
- remove MONOLITH.

A request cannot provide product/variant ID, handle, quantity, price, buyer identity, address, discount, GraphQL, checkout URL, or commerce mode. Code resolves the only product and canonical price.

The signed, secure, `HttpOnly`, `SameSite` Bag cookie contains only schema version, MONOLITH membership, and expiry. Production requires HTTPS. Add/Remove are quantity-one, idempotent operations with schema validation, same-origin checks, rate limiting, and mutation ordering/idempotency protection. Bag responses are request-time and are never served from a Next.js or CDN cache.

A late mutation may update the global Bag count but cannot reopen Bag, navigate, steal focus, or overwrite a newer result. Other tabs receive only an invalidation signal and refetch on focus/interaction; they do not copy Bag contents through browser messaging.

Safe configuration defaults to Bag disabled if signing material is missing/malformed. Unknown mode/configuration fails startup. Public production supports `first-party-bag` and an explicit emergency `disabled` state only; the superseded public `shopify-cart` mode must not be implemented.

## 7. Checkout Preview implementation boundary

Checkout Preview is a code-owned deterministic state machine over predefined content. It has no buyer-data model, form submission, payment integration, Shopify adapter, order model, fulfillment effect, or notification effect.

Its tab-local `sessionStorage` record contains only schema version, reached stage, active stage, completion, and last meaningful activity time. History state represents same-URL visible stages and terminal state. Parsing validates reachability, Bag membership, expiry, and legal transitions before rendering. Impossible or forged state resets safely and cannot unlock stages or terminal.

## 8. Shared client state and lifecycle

Do not create one application-wide state object. Use bounded serializable concerns:

- MORPH session: selected control plus six normalized values;
- Presentation qualification: eligibility, selected tier, fallback reason;
- Preview session: progress/completion only;
- local Bag overlay state: disclosure/focus/pending/error; contents remain server-authoritative;
- history-bound Return context.

MORPH and Presentation stores may use separate typed Zustand vanilla stores with selector-based React adapters, mounted only deeply enough to survive client navigation. Runtime objects—`AudioContext`, AudioNodes, Three.js objects, GLTF scenes, renderers, DOM nodes, requests—never enter shared stores.

Audio, rendering, navigation, Bag, and Preview transitions use explicit reducers/state machines and idempotent lifecycle controllers. Repeated hide/freeze/BFCache restore cycles cannot duplicate nodes, loops, or listeners. A newer route intent supersedes an older uncommitted navigation. Opening Bag cancels uncommitted navigation; committed route navigation closes overlays.

## 9. 3D and authored-media pipeline

The immutable source is `VANTA_MONOLITH_v03D.glb`, SHA-256 `ccbdb568548e154335b2d8eb147a8f39b9881eb930e2b290e098f419425ca261`.

The governed pipeline must:

1. verify that hash and run glTF validation;
2. assert bounds, materials, textures, and named hierarchy, including `MORPH_ROTATING_ENCODER`, `MORPH_Light_Ring_Outer`, and all six supported controls;
3. derive one conservative Meshopt browser model without default flattening, joining, simplification, instancing, palette generation, or texture recompression;
4. render color-managed offline masters from versioned camera/light/crop specifications;
5. derive responsive AVIF/WebP stills and only required motion variants with posters;
6. record source hash, pipeline version, camera/light/crop spec, and output properties for every derivative;
7. invalidate and regenerate all derivatives when source geometry changes.

Accepted runtime reference: 141 named nodes, 71,744 triangles, approximately 131 draw calls, roughly 20.6 MB minimum decoded texture allocation, and 2,568,220-byte Meshopt GLB. Further KTX2, texture, draw-call, or mesh optimization requires side-by-side visual and interaction qualification and must preserve named controls.

Route use:

- Home: qualified realtime renderer over a stable authored fallback;
- Product: responsive authored media only, no renderer/model import;
- Synth: poster/shell first; model/renderer load only after qualification and activation;
- Core/Motion fallback: generated assets in the same Figma-defined regions, not a separate design.

Home and Synth share scene/asset primitives but have separate orchestrators. Audio and renderer never import each other. Render loops stop when hidden, offscreen, complete, covered, or no frames are needed.

## 10. Audio engine

Web Audio implementation code loads only after **Enable Sound**. Begin with native AudioNodes and scheduled parameter changes; introduce an AudioWorklet only if measurement proves native nodes cannot satisfy sound or latency requirements.

One normalized state drives physical controls, native ranges, visible values, and calibrated audio parameters. MORPH simultaneously changes fundamental/sub weight, harmonic density, filter baseline, resonance/density, detune, and bounded instability, with loudness compensation. Secondary controls are bounded offsets around the MORPH trajectory.

Calibration must pass:

- smooth values at 0/25/50/75/100 without preset-like discontinuity;
- bright SUB and dark FRACTURE remain recognizably different;
- each secondary control creates a meaningful change with MORPH fixed;
- ten-minute stress trace has no clicks, stuck notes, overlapping transport, runaway gain, or unrecovered interruption.

## 11. Presentation qualification and budgets

Select layout, motion, realtime rendering, input, and data-saving behavior independently.

Tiers:

1. Core: server-rendered content plus authored still/poster and explicit unavailable states;
2. Motion: short authored media when preferences/conditions permit;
3. Realtime: WebGL2 after qualification.

Realtime is ineligible with Save-Data, explicitly reported 3G-or-worse, WebGL2/context failure, or fewer than four logical processors. Missing device-memory/network APIs are neutral. Reduced motion disables Home realtime choreography; directly manipulated Synth 3D may remain without decorative/eased motion. The session may downgrade but never automatically promote or redownload a declined asset.

### Key delivery budgets

| Budget | Ceiling |
|---|---:|
| Product initial client JS | 110 KiB Brotli |
| Home initial client JS | 140 KiB Brotli |
| Synth silent-shell client JS | 140 KiB Brotli |
| Deferred renderer/3D support | 300 KiB Brotli |
| First-render fonts | 120 KiB compressed |
| Runtime GLB | 2.7 MB |
| Single motion variant | 1.5 MB |

These limits protect the main visitor-facing loading boundaries. Product, the global shell, and Bag must not eagerly load Realtime or audio code. Existing media validation may retain more detailed engineering measurements, but those measurements are not separate launch approvals.

Realtime must become useful in a representative production profile or downgrade to the authored fallback. Bound DPR, suspend inactive frame loops, and abandon startup on decode failure, context loss, or clearly unusable sustained performance. Do not require a laboratory matrix of every GPU and device class.

Audio: first sound ≤500 ms cold/≤150 ms warm; accepted input to scheduled parameter ≤50 ms; visible state same animation frame. Audio preparation over 3 seconds becomes explicit unavailable/Retry.

Bag pending feedback ≤100 ms and targeted failure ≤5 seconds. Only idempotent reads receive one automatic retry.

## 12. Performance, support, and accessibility qualification

Run at least one repeatable production-build profile for each primary route and investigate material Core Web Vitals failures. Existing automated budget and isolation checks remain useful engineering feedback. Field data is optional and is reviewed only when the hosting platform naturally provides enough useful volume.

Test critical journeys in current mainstream browsers and on practical available desktop and mobile devices. Core content and actions must remain useful when Realtime does not qualify. Do not maintain a historical browser laboratory or require ownership of a prescribed device fleet.

Launch requires WCAG 2.2 AA, zero automated serious/critical findings, and focused manual checks for keyboard, focus, 400% zoom, 320 CSS pixels, reduced motion, forced colors, target sizing, and an available screen reader. Record unavailable assistive-technology coverage honestly; do not represent it as completed or create a multi-platform lab solely for this site.

## 13. Failure isolation

No 3D, audio, Sanity, or Bag failure replaces route content with a generic error page. Stable authored fallback remains beneath enhancement. Preserve route position, confirmed Bag state, MORPH values, and unaffected actions whenever possible.

Focused tests cover disabled JavaScript, representative network/content failure, Bag failure, GLB/WebGL failure, suspended audio, and malformed Preview state. Do not build an exhaustive fault-injection program for low-consequence variants.

## 14. Privacy and operational visibility

VANTA collects no custom analytics or journey telemetry. It has no `/api/telemetry` endpoint, analytics cookies, persistent visitor identity, fingerprinting, replay, DOM capture, profiles, advertising attribution, or custom telemetry store. This is both the privacy policy and the smallest operational design.

Use Netlify and other existing hosting-provider diagnostics when they are available and useful. Do not provision a custom telemetry stack, retention database, source-map service, probe service, or alert pipeline for launch. A simple external uptime check may be added later if actual outages justify it, provided it collects no visitor data and creates no public runtime dependency.

Production browser source maps remain disabled. Application errors must preserve useful visitor-facing recovery without depending on remote error collection.

## 15. Launch checks

After deployment, the owner manually checks Home, Product, Synth, Bag, and Checkout Preview. Hosting-provider status and logs may assist diagnosis. Lack of a custom dashboard, five-minute probes, field-vitals sampling, or alert thresholds does not block launch.

## 16. Search and metadata

Only `/`, `/monolith`, and `/synth` are indexable, canonical, and in the sitemap. `/checkout-preview` is public but excluded and receives `noindex, nofollow, noarchive`. Bag has no URL. Preview, deploy previews, APIs, health, and operations use response-level noindex controls, not robots alone.

Code owns titles, canonicals, robots policy, sitemap, redirect rules, and JSON-LD shape. Sanity owns validated descriptions and dedicated 1200×630 social images. Alternate hosts, Netlify hosts, legacy paths, and trailing-slash variants permanently redirect to the configured production origin.

Home emits accurate `Organization` and `WebSite` JSON-LD. Product emits sanitized `Product` JSON-LD with brand/name/model/category/description/Graphite/dimensions/images, but no SKU, Offer, availability, rating, review, checkout action, or purchase claim. Visible price is not an Offer. Synth/Preview add no entity.

## 17. Security

Use separate allowlisted public and preview CSPs. Because nonces force dynamic rendering and conflict with the cached-shell architecture, public launch uses a cache-compatible static header policy validated on a deploy preview before enforcement. Experimental SRI is not a launch dependency. Framework-required inline allowances must be documented, minimized, and tested.

Production policy:

- `default-src 'self'`;
- narrow script/style lists;
- images limited to self, required data/blob, exact Sanity CDN;
- explicit media/worker/connect lists;
- `object-src 'none'`;
- `base-uri 'self'`; `form-action 'self'`;
- public `frame-ancestors 'none'` and `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- `X-Content-Type-Options: nosniff`;
- restrictive Permissions Policy disabling camera, microphone, geolocation, payment, USB, browsing topics, and unused capabilities;
- one-year HSTS after HTTPS qualification; add subdomains/preload only after all controlled subdomains are HTTPS-only.

Do not enable cross-origin isolation unless every Sanity/media/audio/worker/preview dependency passes deployed qualification. Broad wildcards and undocumented origins fail.

Bag, Sanity invalidation, and Draft Mode endpoints require focused tests for their actual origin, schema, replay/idempotency, injection, and abuse risks. Apply rate limiting where an endpoint performs a costly or abusable operation. Secrets and draft tokens must be absent from browser bundles and generated output. Critical dependency or secret-scan findings block launch.

## 18. Environments, promotion, and rollback

Contexts:

- local/automated: deterministic fixtures and local environment values;
- deploy preview: published Sanity, code Catalog, Bag disabled, no production preview token, non-indexed;
- protected Editorial preview: authenticated drafts/releases, production component tree, Bag disabled;
- production: published Sanity, code Catalog, first-party Bag and Checkout Preview.

Production is deployed from protected `main` after the existing CI checks pass. Record the deployed commit and immutable Netlify deployment URL, then run a short smoke check against that deployment. A separate candidate evidence system is optional, not a launch prerequisite.

Rollback selects a previous Netlify deployment when Core routes, Product truth, accessibility, security, privacy, or the transaction boundary is materially broken. Optional 3D, audio, or media failure uses its local fallback when that fallback remains useful.

Content rollback republishes a known-good Sanity revision and verifies the public result; it does not roll back application code.

## 19. Shopify boundary

VANTA does not use Shopify in public production and does not require a private Shopify qualification harness. Automated public-runtime scans continue to protect this boundary. A future Shopify demonstration would be separately scoped and would not silently become a launch dependency.

## 20. Operations

Maintain one concise owner runbook covering production origin, Sanity, secret locations, access recovery, deployment rollback, content rollback, and emergency disablement of optional capabilities. Use MFA and least privilege where the providers support them, and keep recovery material outside the repository. A second custodian is optional; absent backup coverage is an accepted solo-maintainer risk.

Required credentials fail startup when safety depends on them or disable only the dependent subsystem. They never select an insecure mode. Rotate credentials after suspected exposure or account changes; do not create a standing review process without a concrete need.

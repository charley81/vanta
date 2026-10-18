# Source register

## Authority rule

Use the precedence in [README](README.md#source-precedence). A source is authoritative only for its named domain. Repository links below pin implementation context; the Git commit containing this approved bundle pins the consolidation.

## Decision traceability

| Decision | Effective contribution | Status in baseline |
|---|---|---|
| [Define the canonical MONOLITH product truth](https://github.com/charley81/vanta/issues/2) | Identity, claims, sound model, specifications, canonical price | Effective except public Shopify authority and original commerce boundary, superseded below |
| [Define the VANTA experience architecture](https://github.com/charley81/vanta/issues/3) | Route purposes, sequence, global navigation, cinematic/instrument distinction | Effective except original no-checkout Bag boundary and concept notice |
| [Refine VANTA's production art direction](https://github.com/charley81/vanta/issues/4) | Signal Black visual/interaction direction | Effective; prototype code remains throwaway |
| [Research headless Shopify for concept-only commerce](https://github.com/charley81/vanta/issues/5) | Risks and historical public-Shopify investigation | Informative only for public architecture; public path superseded |
| [Research Sanity, Next.js, and Netlify content delivery](https://github.com/charley81/vanta/issues/6) | Platform feasibility and deployed qualification constraints | Effective supporting research |
| [Choose the MORPH Lab instrument scope](https://github.com/charley81/vanta/issues/7) | Six-control monophonic scope, sound semantics, accepted prototype tests | Effective |
| [Choose the content and commerce ownership model](https://github.com/charley81/vanta/issues/8) | Code/Sanity field ownership and fixed singleton model | Effective after replacing public Shopify Catalog/Cart ownership with code Catalog and non-public qualification |
| [Choose the 3D asset and rendering pipeline](https://github.com/charley81/vanta/issues/9) | Immutable GLB, governed derivatives, route-fit hybrid | Effective |
| [Define responsive and inclusive experience behavior](https://github.com/charley81/vanta/issues/10) | Experience equivalence, adaptive behavior, Control deck, lifecycle | Effective; outdated concept-disclosure references superseded |
| [Define production quality budgets and fallback tiers](https://github.com/charley81/vanta/issues/11) | Budgets, tiers, support floors, failure/recovery, telemetry thresholds | Effective for product behavior and fallback design; launch measurement and telemetry scope superseded by issue #40 |
| [Choose the production application and deployment architecture](https://github.com/charley81/vanta/issues/12) | Server-first App Router, deep modules, Cache Components, BFF, Netlify | Effective after removal of public Shopify Catalog/Cart and addition of code Catalog/Preview state |
| [Define launch operations and discoverability](https://github.com/charley81/vanta/issues/13) | SEO, privacy, telemetry, security, publishing, promotion, operations, evidence | Discoverability, privacy, and core security remain effective; telemetry and enterprise launch process superseded by issue #40 |
| [Define cross-route continuity and state behavior](https://github.com/charley81/vanta/issues/34) | Storage lifetimes, history, restoration, lifecycle, races | Effective |
| [Choose the checkout boundary](https://github.com/charley81/vanta/issues/36) | First-party Bag and public synthetic Preview; Shopify isolation | Latest authority for commerce boundary |
| [Prototype the public Bag and Checkout Preview](https://github.com/charley81/vanta/issues/37) | Signal Ledger sequence, exact synthetic values/copy, accessibility/recovery | Effective behavior reference |
| [Define the final production specification and acceptance handoff](https://github.com/charley81/vanta/issues/38) | Handoff Baseline form, traceability, evidence, change control | Original bundle approval |
| [Build and qualify the production VANTA experience](https://github.com/charley81/vanta/issues/40) | Proportional-scope revision after the remaining-work audit | Latest authority for launch scope, telemetry, Shopify qualification, operations, and evidence burden |

## Figma

File/page source: [VANTA `final` page](https://www.figma.com/design/JaenDV2NRDnDkPvBQOzxRk/vanta?node-id=89-971)

Inspected through Figma desktop MCP using metadata, variables, design context, and screenshots during consolidation.

| Node | Use |
|---|---|
| `89:971` (`final`) | Overall composition/content structure |
| `129:583` (`horizontal scroll`) | Nine-chapter desktop composition and initial Editorial copy |
| `129:476` (`VANTA / MONOLITH — PRODUCT PAGE / DESIGN 2`) | Product structure, imagery regions, initial Editorial copy |
| `129:693` (`02 / PLAYING — MORPH KNOB FOCUSED`) | Synth full-instrument/focused-control composition |
| `129:455` (`vertical`) | MORPH Lab invitation and brand closing |

Recorded Figma variables: Espresso `#0F0905`, Cream `#FEFCFB`, Peach `#E7C5B1`, Taupe `#DED4CF`, Terracotta `#CA8054`, Brown `#604E43`.

Known Figma conflicts resolved by this baseline:

- `$999` → `$2,499 USD`;
- `EXPLORE PURCHASE` → `ADD TO BAG`;
- `CONCEPT INSTRUMENT / NOT AVAILABLE FOR SALE` → no concept notice on brand/Product; explicit Preview boundary only;
- pointer-only instructions → equivalent semantic controls and keyboard/touch behavior;
- chapter numbering/order in frame placement → canonical decision order in Product/experience specification;
- literal Inter styling → typography roles remain authoritative; final files are Implementation latitude.

Figma is not a runtime asset host. Production media must be exported/derived through governed pipelines and accepted against these regions/crops.

## Approved geometry and derivative reference

- Source path at decision time: `/Users/chrisharley/Desktop/vanta/VANTA_MONOLITH_v03D.glb`
- SHA-256: `ccbdb568548e154335b2d8eb147a8f39b9881eb930e2b290e098f419425ca261`
- Authority: product geometry and named interaction hierarchy only
- Required nodes include `MORPH_ROTATING_ENCODER`, `MORPH_Light_Ring_Outer`, and the six supported control nodes

The source path is local context, not a deploy source. Implementation must place a verified governed source in the repository/asset pipeline without changing the approved hash.

## Prototype decision assets

| Asset | Commit | Authority |
|---|---|---|
| [Signal Black art-direction comparison](https://github.com/charley81/vanta/tree/prototype/vanta-art-direction) | [`8964432`](https://github.com/charley81/vanta/commit/8964432ccda0cb20195eba1d720f8a69d55142b0) | Visual direction and route expressions; not production code/assets/fonts |
| [MORPH Lab scope prototype](https://github.com/charley81/vanta/tree/prototype/morph-lab-scope) | [`8060564`](https://github.com/charley81/vanta/commit/806056410464b6f95f82bb743ea5cd8e9b18073f) | Sound/interaction semantic tests; not production audio code |
| [Route-fit asset pipeline](https://github.com/charley81/vanta/tree/prototype/vanta-asset-pipeline) | [`4edd579`](https://github.com/charley81/vanta/commit/4edd57921821b79d3ae311e00369cfb8d7d2db64) | Pipeline measurements and route comparison; surrogate still/video are not masters |
| [Signal Ledger Bag/Preview](https://github.com/charley81/vanta/tree/prototype/public-bag-checkout-preview) | [`2ada9fd`](https://github.com/charley81/vanta/commit/2ada9fdb9e41aa255a7fd572e15b0d6015cd1e10) | Approved sequence, hierarchy, synthetic content, recovery, terminal; not production code |

## Research assets

| Asset | Commit | Use |
|---|---|---|
| [Shopify concept-commerce research](https://github.com/charley81/vanta/tree/research/shopify-concept-commerce) | [`cb41760`](https://github.com/charley81/vanta/commit/cb41760b0777fa4877e719803c2a53d079669560) | Historical Shopify constraints; public recommendation superseded by first-party boundary |
| [Sanity/Next.js/Netlify research](https://github.com/charley81/vanta/tree/research/sanity-next-netlify) | [`5be7b73`](https://github.com/charley81/vanta/commit/5be7b73faddf6ff3b2529c776b4e2af82ac259f7) | Content delivery, preview, caching, adapter qualification |

## Framework documentation checked for consolidation

The repository’s installed Next.js 16.4 documentation was used as the framework source of truth, including Server/Client Components, Metadata, Route Handlers, Cache Components/`use cache`, Draft Mode, CSP, instrumentation, and the production checklist. Implementation must reread the installed documentation for the exact version before coding or upgrading.

## Supersession matrix

| Superseded statement | Effective statement |
|---|---|
| Shopify owns public Catalog price/identity | Code owns reviewed public Product truth and Catalog values |
| Public first-party Bag resolves live Shopify price | Bag resolves code-owned `$2,499 USD` |
| Public Shopify Cart mode may be enabled | No public Shopify runtime mode exists |
| Public experience has no checkout-shaped route | Public first-party Checkout Preview is allowed under the exact synthetic/no-data/no-transaction boundary |
| Product/Bag shows concept-product disclosure | Public brand/Product remains in-world; Preview carries transparent non-transaction disclosures |
| Checkout prevention depends on Pause and Build | Public prevention is architectural: no Shopify/payment/order integration; development store stays non-public |
| Figma `$999` / purchase label | `$2,499 USD` / `ADD TO BAG` |
| Figma pointer instructions | Semantic Control deck plus equivalent pointer, keyboard, touch, and assistive behavior |
| Custom telemetry endpoint, provider stack, probes, alerts, and field-vitals pipeline | No custom analytics or journey telemetry; use hosting-provider visibility and manual smoke checks |
| Required non-public Shopify qualification | No Shopify harness or qualification dependency; public-runtime isolation scans preserve the boundary |
| Seven-role sign-off, exhaustive evidence manifest, and staffed launch watch | One owner go/no-go decision, deployed commit/URL record, focused review, and post-deploy smoke check |

## Implementation latitude

These choices are deliberately delegated. They must be recorded in the release record and pass the listed constraints; they do not authorize product redesign.

| Choice | Constraints and acceptance |
|---|---|
| Production font files | Preserve approved grotesk/serif-italic/mono roles and Figma composition; licensed; self-hosted; first-render fonts ≤120 KiB; no material CLS; readable at required zoom/contrast |
| Signal cyan refinement | Operational use only; visually consistent with `#7DE3D6`; passes contrast/focus/forced-colors acceptance |
| Internal component/file names | Preserve deep module contracts, route isolation, and server/client boundaries |
| State library details | Separate bounded stores/state machines; serializable state only; no runtime objects/global megastore |
| Audio implementation/calibration | Native AudioNodes first; accepted phrase/six controls/continuum; latency, stress, semantic tests pass |
| Camera/light/media refinements | Preserve Figma region/crop and Signal Black; generated from approved GLB; derivative manifest/evidence required |
| Further GLB optimization | Preserve source authority, hierarchy, interaction, visual captures, budgets; no silent node collapse |
| Sanity image wrapper | Isolated application component; one transformation path; deployed Netlify qualification |

## Pre-launch bindings

Bindings are values to supply, not open design decisions.

| Binding | Owner | Validation | Required by | Safe failure |
|---|---|---|---|---|
| Production HTTPS origin/domain | Domains/Netlify custodian | Canonical/redirect/TLS/DNS/header checks | Launch candidate | Promotion blocked |
| Sanity project, dataset, CDN origin | Content/platform custodian | Exact allowlist, read/publish/preview/invalidation smoke | Deployed candidate | Build/promotion blocked; last valid public deployment remains |
| Sanity Studio origin | Content/platform custodian | Exact preview frame/connect allowlist | Editorial-preview qualification | Preview disabled; public policy unchanged |
| Preview and webhook secrets | Secrets custodian | Length/schema/rotation/replay tests | Preview/invalidation qualification | Endpoint fails closed |
| Bag signing key | Secrets custodian | Startup validation, rotation and tamper tests | Production Bag qualification | Bag disabled; routes remain useful |
| Search Console/Bing ownership | Site owner | Optional ownership and sitemap review | Post-launch discoverability | No launch block; indexing can proceed from the public sitemap |
| Privacy notice URL | Site owner | Render and link review | Launch readiness | Launch blocks only if deployed behavior requires a notice that is missing |
| Owner and optional backup | Site owner | Access and recovery review | Launch readiness | Missing backup is an accepted solo-maintainer risk |
| Rollback deployment reference | Site owner | Confirm a previous Netlify deployment can be selected | Launch readiness | Record recovery limitation if no previous deployment exists |

# Issue 60 — visual-latitude qualification

Status: **awaiting named product/design decision**

This record qualifies the bounded typography, signal-cyan, camera, lighting, crop, and generated-media choices for `PRODUCT-007`, `PRODUCT-008`, `MEDIA-001`, `MEDIA-004`, and the relevant `QUALITY-004` budgets. It does not approve them. The signed issue record is the Acceptance authority.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Completion boundary

Issue 60 can close only when a named `product_design` reviewer approves or rejects every row in the decision tables against one immutable application commit and deployment. A machine pass is supporting evidence, not a design decision. A rejected row must be refined within documented Implementation latitude and reviewed again, or escalated through baseline change control.

## Candidate identities

| Candidate | Identity | Acceptance state |
|---|---|---|
| Typography | Geist variable, Geist Mono variable, Instrument Serif italic 400 | Pending human review |
| Signal cyan | `#7DE3D6` | Pending human review |
| Media pipeline | `media/pipeline.json` version `1.0.0`, SHA-256 `03a91d959c816491714ff7d7072ddd21224b1a35d7165a0ab6d56465db4ae35e` | Pending human review |
| Approved geometry | `ccbdb568548e154335b2d8eb147a8f39b9881eb930e2b290e098f419425ca261` | Fixed baseline input |
| Derivative manifest | `media/manifests/derivatives.json`, SHA-256 `20ea020786e240a3bdf96e90dca255b26a789004d222d5ab219441a2536881f7` | Engineering evidence from issue 59 |
| Public media manifest | `media/manifests/media.json`, SHA-256 `6e289ba5eb5a3554b0741e3815ec442c5c9b5584d48cb10fbebce90f10a815c0` | Engineering evidence from issue 59 |
| Application/deployment | Bind after the review branch is an immutable deployed commit | Unbound; approval blocked |

The pending acceptance overlay is [`accepted-media-candidates.json`](accepted-media-candidates.json), currently SHA-256 `cf744de0763ef1bbe9abdeffbc8bb972c0159f89b669ebec748ca4fe3dd709dd`. Its `acceptanceClaim` remains `false` until every row is decided and the signed issue record names the same immutable commit.

## Typography and license report

The application uses `next/font`, which self-hosts the selected files in the deployment and supplies metric-adjusted fallbacks. Geist Sans and Geist Mono are preloaded; Instrument Serif is `preload: false` and is requested only where its restrained emphasis role is rendered.

| Role | Candidate | Built WOFF2 | SHA-256 | License evidence |
|---|---|---:|---|---|
| Grotesk declarations and identity | Geist variable | 29,288 bytes | `9b6f5ff45b278c744b5f379a2c4ecbaf858a842b8eaf82ac8d21b699ca16c608` | [SIL OFL 1.1](licenses/Geist-OFL-1.1.txt), SHA-256 `1781d2806a07d91c4edf4740b88449fab7d0eadad53f7c351b94cd4d4eb8c00f` |
| Monospaced navigation and telemetry | Geist Mono variable | 23,108 bytes | `5f3d6ad60f29d6cb708414ec6887163d63bf197377ef5417d2483ff31ace6c3b` | [SIL OFL 1.1](licenses/Geist-Mono-OFL-1.1.txt), SHA-256 `1781d2806a07d91c4edf4740b88449fab7d0eadad53f7c351b94cd4d4eb8c00f` |
| Restrained serif-italic emphasis | Instrument Serif italic 400 | 15,684 bytes | `6ee678c33f388dd7ba59700ebea635deb98821baafd817b09891f7927177f702` | [SIL OFL 1.1](licenses/Instrument-Serif-OFL-1.1.txt), SHA-256 `129ed7618959716959f2941fdd5b49e0ad6e6c1d78726761786a00253d865521` |
| Maximum route first-render total | All three files | 68,080 bytes | — | Below the 122,880-byte ceiling by 54,800 bytes |

License sources were retrieved from the canonical Google Fonts repositories for [Geist](https://github.com/google/fonts/tree/main/ofl/geist), [Geist Mono](https://github.com/google/fonts/tree/main/ofl/geistmono), and [Instrument Serif](https://github.com/google/fonts/tree/main/ofl/instrumentserif). The committed copies retain the complete license text. Font artifact hashes must be rechecked from the bound production build before signing.

A fresh production build and Chromium run measured the fonts actually requested by each route:

| Route | Requested fonts | Transfer |
|---|---|---:|
| Home | Geist, Geist Mono, Instrument Serif italic | 68,080 bytes |
| Product | Geist, Geist Mono | 52,396 bytes |
| Synth | Geist, Geist Mono | 52,396 bytes |
| Checkout Preview | Geist, Geist Mono, Instrument Serif italic | 68,080 bytes |

The browser suite measures these routes independently and enforces the ceiling. Human typography review must confirm that the candidates preserve the Figma composition and the approved grotesk/serif-italic/mono roles at wide, narrow, and 400% zoom without clipped or unreadable copy.

## Signal-cyan report

The candidate remains the prototype reference `#7DE3D6`; no hue refinement is proposed.

| Pair | WCAG contrast ratio | Use |
|---|---:|---|
| Signal cyan / Espresso `#0F0905` | `13.03:1` | Active state, progress, live value, and focus |
| Signal cyan / Brown `#604E43` | `5.18:1` | Active state on raised dark surfaces |
| Espresso / signal-cyan fill | `13.03:1` | Operational banners |
| Signal cyan / Cream `#FEFCFB` | `1.48:1` | Not an approved text/background pair |

This branch removes signal cyan from decorative grid, placeholder-marker, and Product-mark uses. Remaining uses represent focus, current/expanded navigation, Bag readiness/progress, Preview state/progress/recovery, live instrument telemetry, or active native ranges. Decorative emphasis uses Peach/Taupe instead.

Global forced-colors handling maps focus to `Highlight`, surfaces/text/rules to system colors, current navigation to `LinkText`, and interactive panels/actions to `Canvas`, `CanvasText`, `ButtonFace`, or `ButtonText`. The existing forced-colors Axe journey remains the automated preflight; the named reviewer still checks visible focus and operational meaning manually.

## Figma comparison captures

The Figma desktop MCP `get_metadata`, `get_design_context`, `get_variable_defs`, and `get_screenshot` tools were used against the approved `final` page. The captures preserve the pinned composition and art-direction context but are **comparison evidence only**: they are not runtime assets, masters, or provenance authority.

[Open the four-row comparison sheet](figma-media-comparison.webp) — SHA-256 `461c813fedbe1f94fd90a4d6756fcffe7ad650de0da9c7bf7ac8e19493fdecbb`.

| Route role | Figma node/capture | Capture SHA-256 | Generated master | Master SHA-256 |
|---|---|---|---|---|
| Home reveal | `129:616` / [`home-reveal.webp`](figma/home-reveal.webp) | `94497e6293a1c289874f49dacf2370bddae512bb61f4ff1713d62d2741956cf2` | `media/masters/home-poster.png` | `563c92fa322753c6b760f581cea62da4a6ec7a177e62a23164317791d19d1a41` |
| Product hero | `129:477` / [`product-hero.webp`](figma/product-hero.webp) | `afbcb6ebbe162b9bac0b88dac8808a0a9fc7c0e706f94ef33815e9b2ef976fb8` | `media/masters/product-hero.png` | `f73cd77eef3953e61a3df3fa5be85310eded8e136afd82c90f522da87721d049` |
| Product MORPH detail | `129:521` / [`product-morph.webp`](figma/product-morph.webp) | `d2d0b438dc2d09504549e4bc189c6379ee44c6d2ec050fa02f508493c7711e3e` | `media/masters/product-morph.png` | `75deaddae376717030cacfa39e5be811935f6249c6c251a7d83950d961edde76` |
| Synth viewport | `129:693` / [`synth.webp`](figma/synth.webp) | `b8f3609c2684686e6817f9367148bf6fb8a8beae5eb1e16ea658d3a3b81114e4` | `media/masters/synth-poster.png` | `a9eebccf2c9969421778c19713763edd778e36db8a757496b1d552c202470577` |

The comparison intentionally exposes material differences rather than declaring equivalence. The generated Product hero uses a Cream background where the pinned Figma hero is dark; the generated lighting is neutral and geometry-led where the Figma reference uses warm photographic atmosphere; and the generated Product MORPH master is landscape while its pinned Figma composition contains a tall image region. These differences require explicit approval or precise rejection/refinement notes.

## Product/design decision table

Complete every row with **approve** or **reject** and exact notes. Do not infer approval from a passing command.

| Choice | Acceptance questions | Decision/notes |
|---|---|---|
| Geist grotesk | Does declaration/identity copy preserve hierarchy, wrapping, character, readability, and route composition? | Pending |
| Geist Mono | Is telemetry/navigation legible without overpowering declarations, including narrow and zoomed layouts? | Pending |
| Instrument Serif italic | Is emphasis restrained, readable, and limited to the approved physical/sonic role? | Pending |
| Signal cyan `#7DE3D6` | Is it visibly operational—not decorative—with acceptable focus, state, contrast, and forced-colors behavior? | Pending |
| Home poster | Do camera, silhouette, graphite lighting, negative space, and 8:5 center crop preserve the Home reveal role? | Pending |
| Product hero | Do camera, Cream background, 4:5 contain crop, and object scale preserve Signal Black and the pinned hero relationship? | Pending |
| Product MORPH | Does the close camera keep MORPH primary across its 8:5 delivery crop and the pinned tall composition? | Pending |
| Synth poster | Does the overhead camera preserve instrument context, MORPH prominence, copy/control clearance, and the 16:9 viewport role? | Pending |
| Runtime GLB | Is the source/runtime comparison visually acceptable while preserving hierarchy and the `2,700,000`-byte ceiling? | Pending |
| Authored motion | Is “not applicable for current contracts” accepted, with stills before Home/Synth realtime readiness? | Pending |

## Branch-level verification

The complete `pnpm check` gate passed on the working tree that prepared this review package, including all validations, lint, type checking, production build, 40 unit-test files / 179 tests, 47 browser journeys, and 7 commerce-boundary journeys. Focused checks also included:

- `pnpm validate:evidence`
- `pnpm validate:media`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit` — 40 files, 179 tests
- `pnpm build:verified`
- `pnpm exec playwright test tests/browser/global-shell.spec.ts` — 9 Chromium tests
- `pnpm exec playwright test tests/browser/checkout-preview.spec.ts tests/browser/bag.spec.ts` — 15 Chromium tests

Wide/narrow Product and wide/narrow forced-colors Checkout Preview screenshots were also inspected for reflow, hierarchy, and system-color fallback after the decorative-cyan cleanup.

## Qualification procedure

1. Deploy a clean immutable commit containing this record and bind its deployment, content/configuration identities, browser/device matrix, and reviewer.
2. Run `pnpm validate:media`, `pnpm build:verified`, and the focused global-shell browser suite. Retain generated reports and build output hashes.
3. Review Home, Product, Synth, Bag, and Checkout Preview at wide, narrow, 400% zoom, reduced motion, and forced colors. Check real focus movement rather than screenshots alone.
4. Review each Figma capture beside the exact generated master and responsive derivatives. Inspect camera, lighting, crop at both delivery widths, poster behavior, and runtime-model comparison.
5. Update `accepted-media-candidates.json` with each decision, the immutable application commit, reviewer, role, timestamp, and notes. Recompute its SHA-256.
6. Post the signed decision block below on issue 60. Link the immutable deployment and this evidence. A rejection starts a new bounded refinement/review cycle; it is not converted to a pass.

## Signed decision template

```text
Decision: APPROVE | REJECT
Reviewer: <name>
Role: product_design
Signed at: <UTC timestamp>
Handoff Baseline: 8177d60995fcce30fad51663b8c8e8fc5c7fceb9
Application commit: <full SHA>
Deployment ID / immutable URL: <ID and URL>
Configuration/content identities: <exact identities>
Accepted-media manifest SHA-256 / URI: <hash and URI>
Typography: Geist <approve/reject>; Geist Mono <approve/reject>; Instrument Serif italic <approve/reject>
Signal cyan #7DE3D6: <approve/reject and notes>
Home poster: <approve/reject and notes>
Product hero: <approve/reject and notes>
Product MORPH: <approve/reject and notes>
Synth poster: <approve/reject and notes>
Runtime GLB comparison: <approve/reject and notes>
Authored motion not-applicable decision: <approve/reject and notes>
Waivers: <IDs or none>
Precise failures or bounded refinements: <text or none>
```

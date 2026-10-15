# VANTA Experience

The shared language for VANTA’s premium electronic-music hardware experience and the visitor journeys around MONOLITH.

## Language

**Home**:
The cinematic VANTA experience that introduces MONOLITH through an authored brand and product narrative.
_Avoid_: Landing page, storefront

**Product**:
The authoritative commercial-editorial presentation of MONOLITH for visitors evaluating the instrument and its specifications.
_Avoid_: Product detail page, PDP

**MONOLITH**:
VANTA’s premium graphite desktop synthesizer, built around continuous movement between the SUB and FRACTURE sound states. It is a single product with no variants or editions.
_Avoid_: Controller, software synth, product range

**MORPH**:
MONOLITH’s central macro control and defining product idea: a continuous transformation of synthesis parameters between SUB and FRACTURE.
_Avoid_: Preset switch, crossfader, volume blend

**SUB**:
The deep, rounded, fundamental-forward, stable, and spacious endpoint of the MORPH continuum.
_Avoid_: State A

**FRACTURE**:
The bright, harmonically dense, unstable, angular, and textured endpoint of the MORPH continuum.
_Avoid_: State B

**Synth**:
The route dedicated to direct, playable interaction with MONOLITH.
_Avoid_: Lab, player

**MORPH Lab**:
The playable MONOLITH experience contained within Synth.
_Avoid_: Synth page, player

**MORPH session**:
The tab-local instrument setting retained across client-side VANTA route navigation: the selected supported control and six normalized control values. It excludes audio consent, playback, focused-panel state, and browser media resources.
_Avoid_: Preset, saved sound, audio session

**Bag**:
A same-browser, time-bounded, commerce-shaped shortlist containing at most one MONOLITH. It may lead only to Checkout Preview, never checkout or purchase, and makes no cross-device persistence promise.
_Avoid_: Checkout, basket

**Product truth**:
The canonical identity, facts, claims, specifications, and vocabulary that every representation of MONOLITH must preserve.
_Avoid_: Product copy, catalog record

**Catalog data**:
Commerce-shaped information about MONOLITH, including its product and variant identity, price, currency, availability, and Bag costs.
_Avoid_: Editorial content

**Editorial content**:
Client-editable narrative copy, imagery, crops, alternative text, captions, and search presentation that express the VANTA experience without redefining Product truth or interaction behavior.
_Avoid_: Catalog data, choreography

**Catalog image**:
The Shopify-owned representation of MONOLITH used only in commerce-shaped contexts such as Bag.
_Avoid_: Editorial image

**Editorial image**:
A Sanity-owned image used to tell the Home or Product narrative, including hero and social imagery.
_Avoid_: Catalog image, product geometry

**Editorial preview**:
An authenticated view of unpublished or release-specific Editorial content combined with the deployed experience and read-only Catalog data.
_Avoid_: Staging, commerce test

**Commerce qualification**:
Authenticated verification of Shopify catalog, Cart API, and checkout behavior in an isolated non-public environment.
_Avoid_: Editorial preview, public checkout

**Checkout Preview**:
The public, VANTA-owned sequence that evokes checkout without invoking Shopify Checkout, collecting or retaining buyer or payment data, creating an order, or promising that a purchase can be completed.
_Avoid_: Checkout, test checkout, payment flow

**Preview session**:
The tab-local, ephemeral progress of one Checkout Preview attempt. It may support explicit interruption recovery but never contains visitor-provided information, crosses tabs, or becomes a transaction.
_Avoid_: Checkout session, cart session, order session

**Return context**:
Transient history-bound information that restores the route, semantic section, progress, and focus position from which a visitor entered an overlay or another route.
_Avoid_: Saved position, visitor profile, navigation session

**Evaluator checkout**:
An authenticated, non-public Shopify checkout demonstration that uses synthetic buyer data and test payment facilities. It may create a test order but cannot charge money, trigger fulfillment, or represent a customer purchase.
_Avoid_: Public checkout, real checkout, production checkout

**Test order**:
A Shopify order created through Evaluator checkout solely to verify the commerce integration, without monetary capture, fulfillment, or customer commitment.
_Avoid_: Customer order, purchase

**Cinematic interaction**:
Visitor input that influences a predefined presentation without producing sound or establishing an instrument setting.
_Avoid_: Playable interaction, instrument control

**Instrument interaction**:
Direct manipulation of MONOLITH controls in MORPH Lab with audible feedback.
_Avoid_: Cinematic interaction, product demo

**Experience equivalence**:
The invariant route purpose, content, available actions, and visitor state preserved across VANTA’s adaptive presentations without requiring identical layout, motion, media, or direct-manipulation surfaces.
_Avoid_: Literal parity, reduced experience

**Control deck**:
The operable MORPH Lab surface containing sound transport and the six supported controls, shared by every visual and capability presentation of the instrument.
_Avoid_: Fallback controls, 3D controls

**Presentation tier**:
One of VANTA’s independently selected media delivery modes. A tier changes how an experience is presented without changing its purpose, content, available actions, or visitor state.
_Avoid_: Device tier, browser tier

**Core tier**:
The universally available presentation built from route content and stable authored media, without depending on motion or realtime rendering.
_Avoid_: Degraded experience, unsupported mode

**Motion tier**:
A presentation that enhances the Core tier with authored motion when visitor preferences and delivery conditions permit it.
_Avoid_: Video fallback

**Realtime tier**:
A presentation that enhances the Core tier with live-rendered 3D after capability and runtime qualification.
_Avoid_: Desktop mode, full experience

**Handoff Baseline**:
The approved, commit-pinned specification bundle that consolidates VANTA’s effective product, experience, technical, and acceptance requirements for implementation.
_Avoid_: Issue summary, implementation plan

**Acceptance evidence**:
Candidate-specific proof that a requirement or launch gate was verified, linked to the exact code, content, assets, deployment, and approval context under test.
_Avoid_: Checklist claim, expected result

**Implementation latitude**:
A bounded choice delegated to implementation because several solutions can satisfy the same settled requirement and acceptance contract.
_Avoid_: Open product decision, unspecified behavior

# Product and experience specification

## 1. Product truth

MONOLITH is VANTA’s premium graphite desktop synthesizer: one eight-voice hybrid polyphonic instrument, in one Graphite finish, built around **MORPH**, a continuous macro control spanning **SUB** and **FRACTURE**. There are no editions, accessories, or configurable variants.

Public messaging is anchored to:

- **Sound, given mass.**
- **Two states. One continuum.**
- **Made to be moved.**

Supporting copy may explain MONOLITH but must not invent awards, scarcity, endorsements, provenance, or measurable sound-quality claims. Public brand and Product surfaces stay in-world and do not call MONOLITH fictional, conceptual, unavailable, or non-purchasable. Checkout Preview alone explains its non-transactional boundary wherever commerce-shaped interaction could otherwise deceive.

### Sound model

- **SUB** is deep, rounded, fundamental-forward, stable, and spacious.
- **FRACTURE** is bright, harmonically dense, unstable, angular, and textured.
- **MORPH** continuously transforms multiple synthesis parameters between them. It is not a preset switch, sample crossfade, volume blend, or renamed cutoff.
- “State A” and “State B” may appear as secondary physical markers but never replace SUB and FRACTURE.

Product architecture: eight-voice polyphony; two digital oscillators per voice; resonant analog filter; per-voice ADSR envelope; LFO and modulation routing; stereo drive and tone stages; preset storage; multi-parameter MORPH modulation. MORPH Lab intentionally demonstrates a smaller, monophonic subset and must not imply full emulation.

### Physical specification

| Attribute | Canonical value |
|---|---|
| Dimensions | 360 × 210 × 80 mm (W × D × H) |
| Enclosure | Bead-blasted graphite aluminum |
| Display | High-contrast OLED |
| Connections | Stereo L/R outputs, headphones, expression input, MIDI In, MIDI Out, USB, external power |
| Panel controls | MORPH, OSC, MIX, MOD, LFO, CUTOFF, RESONANCE, DRIVE, TONE, ATTACK, DECAY, SUSTAIN, RELEASE |
| Display buttons | Three context-sensitive buttons; unnamed in marketing copy |

Do not claim a weight, electrical specification, manufacturing origin, included accessories, warranty, or regulatory status without a new approved Product-truth change.

### Public Catalog values

| Attribute | Canonical value |
|---|---|
| Vendor/brand | VANTA |
| Product/model | MONOLITH |
| Product type/category | Desktop Synthesizer |
| Variant/finish | Graphite |
| Price | $2,499 USD |
| Quantity | One |

Code owns these public values. Sanity cannot edit them and public production does not read them from Shopify. Do not show stock, scarcity, shipping estimates, tax estimates, quantity controls, preorder language, or availability disclaimers.

## 2. Art direction

**Signal Black** presents MONOLITH as precision signal equipment: exact, quiet, technical, and cinematic. Darkness comes from graphite, controlled light, and negative space—not undifferentiated black surfaces.

### Visual roles

- Foundation: Espresso `#0F0905`, Cream `#FEFCFB`, Peach `#E7C5B1`, Taupe `#DED4CF`, Terracotta `#CA8054`, Brown `#604E43`.
- Signal cyan: the approved prototype reference is `#7DE3D6`; reserve it for active controls, readiness, focus, progress, live values, and instrument-state feedback. Production may refine its accessible token under Implementation latitude but must preserve this operational role.
- Typography: a modern grotesk for declarations and product identity; restrained serif italic only for physical/sonic emphasis; monospaced text for indices, measurements, state, and telemetry. Font files are a bounded production choice and must pass visual, licensing, language, layout-shift, and 120 KiB first-render font budgets.
- Composition: generous black fields, calibrated grids, fine rules, edge rails, asymmetrical framing, and density only where interaction requires it.
- Imagery: graphite detail, controlled specular light, legible silhouette. Avoid lifestyle-orange grading, haze, gratuitous glow, gamer RGB, cyberpunk HUDs, fake engineering data, and low contrast.
- Shape: rectilinear and instrument-like. Circular geometry is reserved for encoders, lamps, and truly rotary interactions.

Home is most cinematic; Product is clearest and commercially credible; Synth is most operational; Bag and Checkout Preview are restrained, information-first extensions of Product. Daylight is a restraint benchmark only, not a template.

## 3. Global experience

Canonical routes:

- Home `/`
- Product `/monolith`
- Synth `/synth`
- Checkout Preview `/checkout-preview`

Bag is a modal surface over the current route and has no URL. Home, Product, Synth, and Bag remain globally reachable throughout cinematic, Product, Synth, and Preview states.

The global shell provides a first-focusable Skip to main content link, one descriptive route heading, landmarks, `aria-current`, persistent wide navigation, a labelled narrow-layout menu, and a separate Bag action. Mobile menu and Bag are mutually exclusive modal overlays with focus containment, Escape and explicit close controls, and focus return.

## 4. Home

Home creates desire. A fresh explicit visit starts at its opening; history restoration returns to semantic position without replaying motion.

### Canonical sequence

1. opening cinematic 3D reveal and optional **Enter MORPH Lab** exit;
2. nine chapters in this order: philosophy, reveal, SUB, MONOLITH, MORPH, gesture, FRACTURE, craft, resolution;
3. vertical MORPH Lab invitation;
4. quiet VANTA closing and footer.

The nine chapters form a reversible horizontal passage only when the CSS viewport is at least `64rem × 38rem`, reduced motion is not requested, and sticky positioning works. It maps ordinary vertical document scrolling; it never intercepts wheel input, traps focus, requires dragging, creates a nested horizontal scrollbar, or invents navigation keys. Otherwise the same chapters are a normal vertical document.

Each chapter is one real sequential DOM section with heading and index. Assistive technology encounters it once in canonical order. The opening and chapter progression may drive presentation but never sound or persistent instrument state.

Realtime Home 3D is a qualified enhancement. A generated poster or authored motion occupies the same region before readiness and in Core/Motion tiers. Reduced motion removes camera travel, parallax, horizontal translation, and animated telemetry while preserving every narrative beat in stable compositions.

## 5. Product

Product is the authoritative commercial-editorial evaluation of MONOLITH. It begins at the hero and presents, in order:

1. product media, identity, canonical price, and **Add to Bag**;
2. editorial thesis;
3. sonic philosophy;
4. SUB and FRACTURE;
5. MORPH;
6. materials and craft;
7. technical specifications;
8. MORPH Lab invitation;
9. final Bag action and footer.

Product is a conventional responsive document in every tier. Media/content splits become media-then-content stacks. Specifications become a semantic definition list or table without page-level horizontal scrolling. Product imports no realtime renderer, decoder, or GLB and downloads no model on direct entry.

**Add to Bag** performs an idempotent quantity-one mutation and opens Bag only after confirmation. **Try MORPH Lab** starts Synth. Neither action uses urgency, scarcity, “buy,” “checkout,” or purchase-completion language.

## 6. Synth and MORPH Lab

Synth opens on a silent authored-media shell with the complete instrument, concise introduction, and explicit **Enable Sound** action. Route entry, focus, model readiness, or prior consent never starts audio.

### Instrument scope

MORPH Lab plays one authored, repeating monophonic six-note A–C–D–E–D–C phrase at a steady pulse. Production may refine voicing and timing while preserving the one-voice authored-phrase model. There is no keyboard, note grid, MIDI, chord mode, preset browser, save/share, URL encoding, or polyphony claim.

Playable controls:

- MORPH: defining multi-parameter continuum;
- CUTOFF: bounded darker/brighter offset;
- RESONANCE: filter-edge emphasis;
- DRIVE: post-filter saturation with output compensation;
- ATTACK: onset from immediate to swelling;
- RELEASE: tails from clipped to overlapping.

OSC, MIX, MOD, LFO, TONE, DECAY, SUSTAIN, and the unnamed display buttons remain visible but inert, subdued, and without affordance.

### Control deck

The semantic **Control deck** is authoritative. It provides transport, six control-selection buttons, six native normalized ranges (`0–100`, step `1`), visible values, concise sonic purpose, and SUB/FRACTURE endpoint language. The 3D instrument is an additional visual/direct-manipulation surface hidden from the accessibility tree.

Selecting a supported physical or semantic control opens the same state: a non-modal side panel on wide layouts or an inline panel on narrow layouts. Keyboard selection focuses the range. Escape or Close returns focus to the selecting control without pausing or resetting. Pointer drag may directly adjust a physical control, but tap-then-range produces the same result. Page panning is suppressed only after a valid drag begins.

Enable Sound loads/prepares audio from a trusted gesture and begins the phrase. Persistent Play/Pause follows. Audio transitions—preparing, playing, paused, interrupted, unavailable—are visible and politely announced. Parameter announcements are throttled. Hidden documents, Bag, navigation intent, or OS/browser interruption pause sound and rendering; nothing resumes automatically.

Audio and Control deck usability do not wait for 3D. Under data saving, model loading requires a separate **Load interactive instrument view** action. If audio fails, visitors can inspect controls, purposes, defaults, and the continuum, with unavailable explanation and useful Retry.

## 7. Bag

Bag is a signed, server-authoritative, same-browser shortlist containing zero or one MONOLITH for no more than 30 days. It is a right drawer on wide layouts and full-screen sheet on narrow layouts, but one semantic modal.

Linear contents:

1. Bag heading and same-browser 30-day persistence statement;
2. MONOLITH / Graphite / quantity one;
3. `$2,499 USD` subtotal;
4. Remove MONOLITH;
5. unavoidable statement that this path enters a non-transactional Checkout Preview;
6. **Enter Checkout Preview**;
7. Return to Product and Open MORPH Lab.

No quantity editor, discounts, taxes, shipping calculation, payment affordance, urgency, or stock language appears. Invalid or expired state becomes empty. Reads/adds/removals fail locally and preserve the last confirmed state. Preview entry is disabled until Bag read or Add succeeds.

Opening Bag pauses but does not dispose Synth runtimes. Closing restores its invoker and never resumes sound. Back closes Bag before leaving the route. Named destination actions consume the Bag history state so Back cannot reopen stale UI.

## 8. Checkout Preview

Checkout Preview is a public, first-party product experience, not checkout. It makes no Shopify call and accepts no visitor identity, address, phone, payment, discount, gift card, or free text.

A persistent banner states:

> **Preview** — Synthetic details only. Nothing is entered, submitted, stored, or sent to Shopify.

The **Signal Ledger** model contains exactly three sequential same-URL history states:

1. **Contact** — predefined fictional recipient;
2. **Delivery** — predefined fictional destination and service;
3. **Review** — item, synthetic information, and explicit non-transaction boundary.

Only the active stage expands. Reached stages can be revisited; future stages remain locked. Back moves one stage; Continue advances; Exit consumes Preview/Bag flow history and returns to Product. Stage changes focus and announce the heading.

The persistent order ledger shows MONOLITH, quantity one, `$2,499.00` subtotal, `$0.00` preview delivery, tax **Not calculated**, and `$2,499 USD` preview total, followed by:

> No charge, authorization, order, reservation, or price commitment.

### Synthetic values

- Name: **Mara Vale**
- Email: `mara.vale@example.invalid`
- Phone: **Not collected**
- Destination: **VANTA Preview Studio, 101 Signal Way, Portland, OR 97205, United States**
- Service: **Studio courier**
- Window: **3–5 preview days**
- Cost: **$0.00 preview**

Values are visibly **Predefined / fictional**, rendered as content rather than form defaults, never persisted or transmitted. Review explicitly excludes payment, discounts, gift cards, tax quotes, buyer input, Shopify Checkout, orders, fulfillment, and notifications. Its action is **Complete preview**.

Terminal state:

> **Ordering offline**<br>
> Checkout Preview complete. No order was placed and no payment information was collected.

It also states Payment: Not requested; Order: Not created; Visitor data: Not collected; Bag: MONOLITH retained. Primary action **Return to MONOLITH** returns to Product with Bag intact; **Preview again** replaces terminal with Contact and starts a fresh session.

## 9. Continuity and lifecycle

State precedence is: requested route and server-authoritative Bag; valid history Return context; valid tab-local Preview or MORPH session; canonical defaults. Malformed, expired, contradictory, impossible, or unknown-version transient state is discarded, never inferred.

| State | Lifetime and storage |
|---|---|
| Bag | Signed, secure, `HttpOnly`, `SameSite` cookie; same browser; 30 days; only membership and expiry |
| MORPH session | In-memory, tab-local; selected control and six normalized values; survives client navigation/BFCache; resets on reload/new tab |
| Preview session | Versioned `sessionStorage`; reached stage/completion only; 30 minutes inactivity; no visitor data |
| Return context | Relevant `history.state` entry only |
| Presentation qualification | Versioned `sessionStorage`; session downgrade persists; new tab requalifies |

No continuity state uses `localStorage`, public query parameters, telemetry, or free-form visitor data.

Explicit navigation starts canonical route beginnings and focuses headings. Back/Forward restores semantic section, normalized progress, focus where valid, and visible state. Restore the Core shell first, recompose for current conditions, apply semantic position before enhancements, then restore focus. Cancel delayed correction on visitor interaction.

Leaving Synth closes focused controls, pauses sound, and disposes route-owned audio/3D after committed navigation while retaining MORPH values. Returning reconstructs with explicit Resume Sound. Prefetch never counts as entry, consent, completion, progression, or analytics visitation.

A valid interrupted Preview offers **Resume [stage]** and **Start again**. It is cleared by explicit Exit, global navigation, Return to MONOLITH, Bag removal/expiry, Start again, or 30 minutes inactivity. Direct entry starts Contact only with a valid Bag; otherwise show a transparent unavailable boundary and Return to MONOLITH.

Current content remains usable until a destination shell is ready. Link-local progress appears only after roughly 100 ms. Failed navigation preserves the source route and state and offers Retry; no blocking full-screen loader is used.

## 10. Responsive and inclusive contract

VANTA targets WCAG 2.2 AA and **experience equivalence**: every adaptation preserves route purpose, content, actions, and visitor state without requiring identical layout, motion, media, or direct manipulation.

- Layout follows CSS space; capability never proxies for device identity.
- Motion, realtime qualification, input, and data saving adapt independently and react to live preference changes.
- All actions provide at least 44 × 44 CSS-pixel targets.
- Routes work at 400% zoom and 320 CSS pixels without two-dimensional page scrolling, clipped actions, or overlapping text.
- No essential information/action exists only in imagery, 3D, motion, hover, color, or sound.
- Focus is visible against Signal Black. Forced colors use system/native treatments where needed.
- Reduced motion removes camera travel, parallax, scroll-linked translation, animated telemetry, decorative meters, and eased control choreography; immediate state/value changes remain.
- Authored content and media render before enhancement. Failures remain local and preserve unaffected state.
- Core Home/Product content and links remain useful without JavaScript; client-only features identify themselves as unavailable rather than appearing inert.

## 11. Initial Editorial content seed

Sanity uses fixed singletons, not a page builder. The seed below is the approved implementation starting point. Editorial owners may revise Sanity-owned prose/media through validation, preview, and publishing without changing this baseline, provided Product truth, route purpose, designed constraints, and code-owned strings remain intact.

### `siteSettings`

- default brand: `VANTA`
- default tagline: `Sound, given mass.`
- footer navigation: Home, Product, Synth, Bag action
- privacy notice link: required pre-launch binding
- default social image: dedicated 1200 × 630 Editorial image, not an incidental crop

### `homePage`

Opening seed:

- kicker: `INSTRUMENT 001 / EIGHT VOICES`
- headline: `Sound, given mass.`
- body: `A graphite desktop synthesizer built around one continuous gesture.`
- optional action: `ENTER MORPH LAB`

Nine chapters, in canonical order:

| Chapter | Seed headline | Seed body/action |
|---|---|---|
| 01 Philosophy | `Sound is never standing still.` | `A living instrument that moves with you. From deep foundations to unstable harmonics, every gesture creates a new direction.` |
| 02 Reveal | `Designed for instinct. Built for exploration.` | `Eight voices of expressive synthesis in a compact, tactile instrument. Shape, bend, and transform your sound without losing the moment.` |
| 03 SUB | `Feel the weight.` | `Start with presence: deep fundamentals and controlled movement. SUB is the grounded end of the MONOLITH continuum, ready to evolve with every turn of MORPH.` |
| 04 MONOLITH | `Eight voices. One continuum.` | `A sculptural desktop synthesizer built for tactile exploration. Move between deep foundations and fractured harmonics with a single defining gesture.` |
| 05 MORPH | `MORPH.` | `From the weight of SUB to the harmonic edge of FRACTURE. One encoder moves continuously through the space between them.` |
| 06 Gesture | `Between A and B, everything.` | `Turn the oversized MORPH encoder to reshape the sound itself. Timbre, tension, and texture move together—there is no fixed point between SUB and FRACTURE.` |
| 07 FRACTURE | `FRACTURE.` | `At the far edge of the continuum, texture becomes expressive. FRACTURE brings harmonic tension, movement, and the thrill of the unexpected.` |
| 08 Craft | `Considered in every detail.` | `From the sculpted chassis to the substantial MORPH encoder, every surface is designed to reward touch. The interface stays close to the music—not between you and it.` |
| 09 Resolution | `Make it move.` | `A compact instrument with an expansive point of view. Find a foundation, follow the friction, and take the sound somewhere new.` / `EXPLORE MONOLITH` |

MORPH Lab invitation:

- category: `MORPH LAB`
- headline: `Made to be moved.`
- body: invite direct shaping of one evolving voice between SUB and FRACTURE
- action: `ENTER MORPH LAB`

Closing: VANTA brand plus `Sound, given mass.`; no additional funnel CTA.

### `productPage`

- identifier: `VANTA / INSTRUMENT 001`
- name: `MONOLITH`
- subtitle: `Eight voices. One continuum.`
- hero body: `A sculptural desktop synthesizer built for tactile exploration. Move between deep foundations and fractured harmonics with a single defining gesture.`
- thesis headline: `Sound has no fixed shape.`
- thesis support: `Build a foundation. Find the edge. Discover everything in between.`
- sonic headline: `One movement. Endless possibility.`
- sonic body: `MONOLITH is centered around movement, not menus. Its signature MORPH control makes sound design feel immediate, expressive, and physical.`
- states headline: `Two states. One continuum.`
- SUB: `Depth, weight, and a steady foundation.`
- FRACTURE: `Texture, tension, and harmonic movement.`
- MORPH headline: `Meet MORPH.`
- MORPH body: `At the center of MONOLITH is a large tactile encoder that transforms one evolving sound from SUB to FRACTURE. Turn toward weight. Turn toward tension. Stay anywhere in between.`
- craft intent: emphasize bead-blasted graphite aluminum, tactile controls, and restraint without unsupported manufacturing claims
- MORPH Lab invitation: `Made to be moved.` / `TRY MORPH LAB`

The design’s `$999`, `EXPLORE PURCHASE`, and `CONCEPT INSTRUMENT / NOT AVAILABLE FOR SALE` are rejected. Code renders `$2,499 USD`, `ADD TO BAG`, and the approved Preview boundary instead.

### `synthPage`

- category: `MORPH LAB`
- headline: `One gesture. Endless change.`
- introduction: `Shape one evolving MONOLITH voice continuously between SUB and FRACTURE.`
- support content may explain the six supported controls but cannot imply complete emulation

`Enable Sound`, transport states, control names, normalized values, endpoint labels, keyboard guidance, live-region strings, errors, and recovery actions remain code-owned.

### SEO seed

Exact titles are code-owned:

- Home: `VANTA — Sound, given mass.`
- Product: `MONOLITH — Hybrid Polyphonic Synthesizer | VANTA`
- Synth: `MORPH Lab — Play MONOLITH | VANTA`

Sanity supplies one unique 120–160-character description and dedicated 1200 × 630 social image for each indexed route. The approved initial descriptions are:

- Home: `Discover MONOLITH, VANTA’s eight-voice hybrid desktop synthesizer, through a cinematic journey from deep SUB foundations to FRACTURE.`
- Product: `Explore MONOLITH, a graphite eight-voice hybrid desktop synthesizer built around continuous movement between SUB and FRACTURE.`
- Synth: `Play one evolving MONOLITH voice in MORPH Lab and shape MORPH, cutoff, resonance, drive, attack, and release in real time.`

Later Editorial revisions must retain uniqueness, length, Product truth, and the absence of false purchasing claims.

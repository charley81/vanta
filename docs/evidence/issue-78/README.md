# Issue 78 — focused manual launch review

Review target: **immutable Netlify deploy [`6ad697ee9023cf2be349880c`](https://6ad697ee9023cf2be349880c--vanta-monolith.netlify.app)**  
Application commit: `52634194de9bcb0cba77f00c30797913997936b2`  
Known-good published Sanity revision: `dRT7XPZcRYlOc6zs4Dq2WM` (`siteSettings`, published 2026-10-19)  
Prepared: **2026-10-19 UTC**

This record separates browser-assisted preflight from the human review required by issue 78. Automated interaction, browser emulation, and AI screenshot inspection are not represented as physical-device, assistive-technology, or human coverage.

## Existing candidate evidence

- [Issue 77 launch-candidate record](https://github.com/charley81/vanta/issues/77#issuecomment-6278863323): full repository checks, immutable-deploy identity, deployed smoke, no-JavaScript Core content, public-runtime boundaries, metadata, and rollback deploy.
- [Main CI](https://github.com/charley81/vanta/actions/runs/39334371350), [Commerce qualification](https://github.com/charley81/vanta/actions/runs/39335581343), and [Security qualification](https://github.com/charley81/vanta/actions/runs/39335581076) passed for the candidate.
- [Issue 76 closeout](https://github.com/charley81/vanta/issues/76#issuecomment-6277590927): owner-confirmed recovery access, Editorial publishing/recovery path, production bindings, and authenticated Presentation behavior.
- [`docs/evidence/issue-73/manual-review-checklist.md`](../issue-73/manual-review-checklist.md) remains the canonical human checklist.

## Browser-assisted preflight

The candidate was exercised from macOS 26.6.2 in agent-driven, headless sessions. These results corroborate the candidate but do not complete the human checklist.

| Environment | Coverage | Result |
|---|---|---|
| Google Chrome 155.0.8059.85, 1440 × 900 CSS px | Home, Product, Privacy, real Bag add/modal, Synth keyboard range, complete Checkout Preview | pass |
| Google Chrome 155.0.8059.85, 320 × 720 CSS px | Same journey, page reflow, and visible action-target sampling | pass |
| Playwright Firefox 157.0, 1440 × 900 CSS px | Same critical journey | pass |
| Playwright WebKit 27.2, 390 × 844 CSS px | Same critical journey; engine coverage only, not installed Safari or a physical mobile device | pass |
| Chrome media emulation | reduced motion plus forced colors, stable Home presentation, no autoplay media/animations, visible skip-link focus | pass as emulation only |

Observed preflight outcomes:

- Home, Product, Synth, Privacy, and Checkout Preview rendered their expected primary headings without page-level horizontal overflow.
- Real first-party Bag add opened a populated modal, moved focus to its heading, contained focus, closed with Escape, and returned focus to its invoker.
- Product-to-Synth navigation and every Checkout Preview stage moved focus to the visible route/stage heading.
- The six Synth controls exposed named native `0–100`, step-`1` ranges; CUTOFF keyboard adjustment updated its polite status; Escape returned focus to its selector.
- The Checkout Preview completed at **Ordering offline**, exposed no buyer/payment data-entry control, and retained the no-order, no-payment, and no-visitor-data disclosures.
- Network observation contained only the immutable first-party origin. The only mutating request was `POST /api/bag/add`; no Shopify, payment, analytics, telemetry, or other third-party request was observed.
- Wide and narrow full-page captures of Home, Product, Synth, Privacy, and Checkout Preview were inspected for clipping, overlap, broken authored media, and Signal Black composition; no material defect was identified. These captures were diagnostic and are not retained as human-review evidence.
- A fresh public response exposed the enforced candidate CSP and required security headers. The candidate Security qualification is the retained evidence for the complete public/Preview policy and absent production source maps.

## Human review environments

Reviewer: **site owner**  
Review date: **2026-10-19**

| Environment | Browser | Device / input | Result |
|---|---|---|---|
| Desktop | Google Chrome (version not recorded) | MacBook; keyboard + pointer | pass |
| Mobile | Google Chrome (version not recorded) | Physical iPhone 11; touch | pass |
| Screen reader | Available MacBook screen reader (name/version not recorded) | Keyboard + screen reader | pass |
| Forced colors | Available Chrome review environment (details not recorded) | Keyboard | pass |

The owner reported that every item in the canonical human checklist passed. Exact browser, OS, screen-reader, and forced-colors setup versions were not retained at the owner's direction; this is an evidence-detail limitation, not a reported coverage gap.

## Human checklist status

| Required review | Result | Evidence |
|---|---|---|
| Critical desktop and physical-mobile visitor journeys | pass | Owner review in Chrome on a MacBook and Chrome on a physical iPhone 11. |
| Keyboard operation, focus order/visibility, modal containment, Escape, and focus return | pass | Owner-reported human review. |
| Route and Checkout Preview stage focus/announcement behavior | pass | Owner-reported human review. |
| Six Synth ranges, endpoint/purpose text, and non-chatty status | pass | Owner-reported human review. |
| 320 CSS-pixel layout and actual 400% browser zoom | pass | Owner-reported human review. |
| Touch-target sizing | pass | Owner-reported human review. |
| Reduced motion and forced colors | pass | Owner-reported human review. |
| Available screen reader | pass | Owner-reported human review; implementation/version not retained. |
| No-JavaScript and failure-recovery behavior | pass | Owner review plus retained candidate automation from issues 73 and 77. |
| Product truth and operational strings | pass | Owner-reported human review. |
| Checkout Preview transparency and absence of buyer/payment input | pass | Owner-reported human review. |
| Signal Black composition and authored fallbacks at wide/narrow layouts | pass | Owner-reported human review. |
| Privacy network boundary | pass | Owner review plus retained candidate browser/public-runtime evidence. |
| Enforced public/Preview CSP and absent production source maps | pass | Candidate Security qualification and owner review. |
| Previous Netlify deploy and known-good Sanity content recovery | pass | Owner confirmation and exact recovery paths recorded in issue 76 and [`docs/operations/owner-runbook.md`](../../operations/owner-runbook.md). |

## Decision

- **Known product failures:** none.
- **Known gap:** exact environment versions and assistive-technology setup details were not retained. No unavailable coverage or visitor-impacting gap was reported.
- **Recommendation:** **go**. The owner reports that all focused manual launch-review checks passed on the immutable candidate.

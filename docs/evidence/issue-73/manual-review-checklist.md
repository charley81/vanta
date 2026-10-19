# Focused manual launch-review checklist

Use this checklist for issue 78 against one immutable deployment. Allowed results are `pass`, `fail`, `blocked`, `not available`, and `not run`. Do not convert browser emulation or another person's result into physical-device or assistive-technology coverage.

## Candidate and environments

- Deployment URL / ID:
- Application commit:
- Content release / revisions:
- Reviewer and date:

| Environment | Exact browser / version | OS / device | Input / AT | Available? | Notes |
|---|---|---|---|---|---|
| Desktop 1 |  |  | keyboard + pointer |  |  |
| Desktop 2 |  |  | keyboard + pointer |  |  |
| Mobile 1 |  |  | touch |  |  |
| Screen reader |  |  | name + version |  |  |
| Forced colors |  |  | keyboard |  |  |

## Critical journey and inclusive behavior

| Check | Result | Environment / evidence / gap |
|---|---|---|
| Home → Product → Add to Bag → close Bag → Synth → adjust a native range → Checkout Preview completes without a transaction | not run |  |
| Keyboard-only order is logical; skip link works; every action is reachable; visible focus is never lost | not run |  |
| Menu and Bag contain focus, Escape closes them, and focus returns to the actual invoker | not run |  |
| Client route changes and Preview stage changes focus and announce the visible heading | not run |  |
| Synth exposes six named 0–100 ranges, useful endpoint/purpose text, and non-chatty status announcements | not run |  |
| At 320 CSS pixels, all routes and Bag have no two-dimensional page scrolling, clipped actions, or overlapping text | not run |  |
| At 400% browser zoom, all routes remain operable and readable without two-dimensional page scrolling | not run |  |
| Pointer/touch targets are at least 44 × 44 CSS pixels; any WCAG spacing exception is documented rather than assumed | not run |  |
| Reduced motion removes cinematic travel, parallax, animated readouts, and autoplay while preserving every narrative beat | not run |  |
| Forced colors preserves content, controls, current state, boundaries, and visible focus | not run |  |
| One actually available screen reader reads landmarks, dialog names, range names/values/descriptions, stage changes, and status without continuous chatter | not run |  |

## Core and failure recovery

| Check | Result | Environment / evidence / gap |
|---|---|---|
| With JavaScript disabled, Home, Product, Synth scope, and an honest Checkout Preview recovery path remain useful | not run |  |
| Failed media/content leaves Product truth, price, primary actions, and authored fallbacks available | not run |  |
| Failed or timed-out Bag work preserves the last confirmed state, reports a targeted error promptly, and recovers only after Retry | not run |  |
| Missing WebGL/model support leaves authored media, semantic Synth controls, and sound activation independent | not run |  |
| Suspended or unavailable audio is announced, keeps control values, and never resumes automatically | not run |  |
| Malformed or interrupted Preview state fails closed and offers a clear restart/return path | not run |  |

## Product, privacy, and operational checks

| Check | Result | Environment / evidence / gap |
|---|---|---|
| Product price, eight-voice claims, dimensions, connections, and Bag persistence copy match the approved Product truth | not run |  |
| Checkout Preview repeatedly says it is synthetic/non-transactional and exposes no buyer, address, discount, tax, shipping, stock, payment, or Shopify-order input | not run |  |
| Browser network review shows no visitor data or transaction-shaped request and no unexpected third-party runtime | not run |  |
| Public and Preview CSPs are enforced on the deployment; production source maps are not served | not run |  |
| Signal Black composition and authored fallbacks remain coherent at representative wide and narrow layouts | not run |  |
| Owner can identify a previous immutable Netlify deployment and the known-good Sanity content release to restore | not run |  |

## Decision

- Known failures or unavailable coverage and visitor impact:
- Follow-up issue links:
- Recommendation: `go` / `no-go` / `blocked`
- Reviewer rationale:

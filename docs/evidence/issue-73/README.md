# Issue 73 — accessibility, browser, and fallback qualification

This is focused engineering evidence for `QUALITY-009`, `QUALITY-011`, `QUALITY-012`, and `QUALITY-013`, with supporting coverage for the critical Home, Synth, Bag, and Checkout Preview requirements named by issue 73. It is not a release-candidate sign-off and does not claim that a human used a physical device or assistive technology.

## Automated reports

CI retains the following generated reports and matching Playwright HTML reports, traces, screenshots, and videos under `artifacts/`:

| Report | Command | Scope |
|---|---|---|
| `artifacts/reports/accessibility.json` | `pnpm test:accessibility` | WCAG A/AA Axe scans, 320 CSS-pixel reflow, 44 × 44 targets, keyboard focus, modal containment, native ranges, polite status, reduced motion, and forced colors |
| `artifacts/reports/browser-journeys.json` | `pnpm test:browser:critical` | One critical Home → Product → Bag → Synth → Checkout Preview journey in desktop Chromium, Firefox, and WebKit plus Pixel 7 and iPhone 15 browser emulation |
| `artifacts/reports/fallbacks.json` | `pnpm test:fallbacks` | Disabled JavaScript, representative media/content network failure, Bag failure and Retry, WebGL capability failure, model request failure, suspended audio, and malformed Preview state |

A passing automated accessibility report means the tested states have no Axe findings tagged WCAG 2 A/AA, WCAG 2.1 AA, or WCAG 2.2 AA. Automation cannot establish full WCAG conformance or replace keyboard, zoom, forced-colors, and screen-reader review.

## Browser boundary

The automated matrix uses the browser revisions pinned by Playwright 1.64.1. Chromium, Firefox, and WebKit runs provide current engine coverage; the Pixel and iPhone profiles are viewport/input emulations, not physical-device results. Safari-specific, installed Chrome/Firefox, physical touch, and assistive-technology outcomes must be recorded only when a human actually tests them.

## Manual handoff

Use [`manual-review-checklist.md`](manual-review-checklist.md) for issue 78. Every row starts as `not run`; reviewers record the exact environment, result, evidence where useful, and any unavailable coverage. A missing device or screen reader is a recorded gap, never a pass.

# Issue 72 — practical performance and loading boundaries

This is a short engineering summary, not an Acceptance claim. Generated reports remain under `artifacts/reports/` and CI uploads the full report set.

## Production profile

A local Next.js production build based on `274eecbf11651c714b55cd0544ca2ba43f0e512b` was profiled in headless Chromium at 1440×900. The measured build ID was `uyHqcI6xm-r2mtlD5M6s0`; the worktree was dirty because the issue 72 implementation was under test.

| Route | LCP | CLS | TTFB | accepted-input delay |
|---|---:|---:|---:|---:|
| Home `/` | 108 ms | 0 | 4.8 ms | 2.7 ms |
| Product `/monolith` | 148 ms | 0 | 5.7 ms | 1.5 ms |
| Synth `/synth` | 92 ms | 0.00009 | 7.5 ms | 1.5 ms |
| Checkout Preview `/checkout-preview` | 80 ms | 0.00172 | 5.2 ms | 1.3 ms |

The profile uses one repeatable production-build run, not a prescribed device laboratory. No measured route exceeded the LCP, CLS, TTFB, or responsiveness boundaries. Home Realtime selected its governed `performance` fallback in this headless profile and retained the visible authored poster. Existing focused browser and runtime tests cover successful readiness, context/decode failure, bounded DPR, sustained-frame downgrade, and inactive frame-loop suspension.

## Delivery boundaries

Passing measurements from the same build:

- Home initial JavaScript: 134,577 / 143,360 bytes Brotli.
- Synth silent-shell JavaScript: 134,970 / 143,360 bytes Brotli.
- Deferred renderer/3D support: 140,175 / 307,200 bytes Brotli.
- First-render fonts: 52,396 / 122,880 bytes.
- Runtime GLB: 2,568,220 / 2,700,000 bytes.
- Motion variants: none are required by the governed media manifest.
- Initial Product, shared shell, and Bag chunks contain no renderer/Three.js or audio-engine implementation.

## Material gap

Product initial JavaScript is **127,865 bytes Brotli against the 112,640-byte (110 KiB) ceiling**, a 15,225-byte overage. The common Next.js/Turbopack runtime chunks alone total 112,773 bytes Brotli before VANTA's shell, route error boundary, or Product interaction code, so deleting Product-owned code cannot make this build pass the approved ceiling.

The checker intentionally fails this boundary. The threshold was not raised, framework bytes were not excluded, and no waiver was invented. Resolution requires an approved framework/runtime change or an explicit specification decision; until then, `pnpm validate:delivery-budgets` and CI remain red and issue 72 does not meet its completion boundary.

## Commands

```bash
pnpm build:verified
pnpm validate:delivery-budgets
CI=1 pnpm exec playwright test tests/browser/performance-profile.spec.ts
pnpm test:realtime
```

# Verification substrate

This directory defines the requirement-aware checks used by local development and CI. It does **not** contain candidate Acceptance evidence.

## Stable locations

- Fixtures: `verification/fixtures/`
- Check-to-requirement map: `verification/checks.yaml`
- Evidence schema: `schemas/evidence-manifest.schema.json`
- Generated machine reports: `artifacts/reports/`
- Reviewed Product/Catalog manifest: `verification/fixtures/product-catalog-manifest.json`
- Playwright HTML report: `artifacts/playwright/`
- Playwright failure artifacts: `artifacts/test-results/`

Generated `artifacts/` are ignored by Git and uploaded by CI. Every machine report records the public command, tool versions, Git commit/dirty state, timestamps, and related requirement IDs. The IDs describe the check's context; they do not assert that a broad requirement was fully verified. Reports set `acceptanceClaim: false` because they are engineering feedback. For launch, record the deployed Git commit, immutable Netlify URL, checks run, material gaps, and owner decision. A structured evidence manifest is optional.

## Commands

```bash
pnpm validate:requirements
pnpm validate:evidence
pnpm validate:performance
pnpm validate:delivery-budgets # after pnpm build:verified
pnpm validate:product-catalog
pnpm validate:boundaries
pnpm validate:public-runtime
pnpm validate:audio-calibration
pnpm validate:audio-stress
pnpm validate:audio-isolation
pnpm validate:media-source
pnpm build:media
pnpm validate:media
pnpm test:audio-latency
pnpm test:realtime
pnpm test:unit
pnpm build:verified
pnpm test:browser
pnpm test:commerce
pnpm check
```

`validate:evidence` checks the optional structured template and any YAML files below `evidence/manifests/`. Pass explicit manifest paths to validate another location. The schema remains strict when a team chooses to use it, but a candidate manifest is not required for launch.

`validate:performance` exercises the existing regression checker with a deterministic scaffold fixture. It remains useful regression-review feedback; it is not by itself a launch approval system.

`validate:delivery-budgets` inspects a completed Turbopack production build. It Brotli-compresses every route's initial JavaScript chunk independently, enforces the approved Home/Product/Synth ceilings, scans initial Product/shared shell/Bag chunks for eager renderer or audio implementations, and checks deferred renderer, first-render font, runtime GLB, and motion-variant limits. It writes the measured paths and byte counts even on failure; thresholds are not adjusted to obtain a pass.

`test:browser` runs the production-build journey suite, including the repeatable primary-route profile in `tests/browser/performance-profile.spec.ts`, followed by the focused commerce boundary suite. The profile records its Next.js build ID, commit/dirty state, LCP, CLS, TTFB, input delay, and the useful-Realtime-or-authored-fallback outcome in `artifacts/reports/production-route-profile.json`. `test:commerce` can run independently against a local temporary HTTPS proxy, or against an immutable Netlify deployment when `COMMERCE_QUALIFICATION_BASE_URL`, `COMMERCE_QUALIFICATION_DEPLOYMENT_ID`, and `COMMERCE_QUALIFICATION_APPLICATION_COMMIT` are all supplied. The deployed config rejects mutable aliases and verifies the public deploy record before exercising the journey. The manually triggered `Commerce qualification` GitHub Actions workflow accepts the deployment ID and deployed commit, checks out that commit, runs the deployed suite, and retains the sanitized Acceptance evidence for 30 days.

`validate:product-catalog` compares the code-owned Product truth and Catalog values with the reviewed deterministic manifest and records its SHA-256. `validate:boundaries` rejects missing environment markers, server/client poisoning, local Route Handler calls from Server Components, and heavy runtime leakage into the root or Product route. `validate:public-runtime` scans public source and production configuration for forbidden commerce-platform dependencies, modes, endpoints, identifiers, and secret-shaped public variables.

The audio checks produce non-Acceptance engineering reports under `artifacts/reports/`. `validate:audio-calibration` records the five-point continuum, endpoint fingerprints, secondary-control deltas, and predicted compensation spread. `validate:audio-stress` runs the authored phrase scheduler and bounded mappings through a deterministic simulated ten-minute session; candidate qualification must still pair it with a reviewed real-output stress trace. `validate:audio-isolation` proves that audio and rendering source do not import each other and that Web Audio stays behind the trusted-gesture dynamic import. `test:audio-latency` measures cold, warm, and control-to-schedule budgets in Chromium.

The media checks govern the immutable approved GLB and all current derivatives. `validate:media-source` verifies the source hash, glTF report, bounds, material/texture inventory, named-control hierarchy, and decoded texture/GPU estimates. `build:media` performs the conservative Meshopt derivation and offline authored-media render from `media/pipeline.json`. `validate:media` regenerates every model, master, responsive still, comparison image, and manifest in a clean temporary tree and requires byte-identical output while enforcing model, motion, texture, and GPU ceilings. See `media/README.md` for the exact hash-scoped source finding policy.

`test:realtime` exercises the independent Presentation-selection matrix, versioned session downgrade, lazy-loader gate, governed resource accounting, context-loss fallback, frame-loop suspension, stale startup cleanup, and idempotent disposal. Its generated report is focused engineering feedback. Launch adds a practical production-profile and fallback check, not a prescribed physical-device laboratory.

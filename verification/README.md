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

Generated `artifacts/` are ignored by Git and uploaded by CI. Every machine report records the public command, tool versions, Git commit/dirty state, timestamps, and related requirement IDs. The IDs describe the check's future qualification context; they do not assert that a broad requirement was fully verified. Reports set `acceptanceClaim: false`: a passing local or branch report is verification feedback only, not candidate Acceptance evidence. A release-specific manifest must bind applicable artifacts to one immutable candidate and deployment before review can make that claim.

## Commands

```bash
pnpm validate:requirements
pnpm validate:evidence
pnpm validate:performance
pnpm validate:product-catalog
pnpm validate:boundaries
pnpm validate:public-runtime
pnpm test:unit
pnpm build:verified
pnpm test:browser
pnpm test:commerce
pnpm check
```

`validate:evidence` checks the normative template and every YAML file below `evidence/manifests/` by default. Pass explicit manifest paths to validate another location. The schema permits null example values only for `status: template` or an in-progress `status: draft`; `status: candidate` requires candidate identity. Draft/template manifests cannot record passing or waived candidate/launch artifacts, and the `OPS-015` mappings in `checks.yaml` cannot appear in waivers.

`validate:performance` exercises the regression gate with the deterministic scaffold fixture. Later measurement jobs can call `tsx tooling/verification/cli.ts performance <input.json>` with at least three baseline and candidate samples. A median regression above 10% fails unless its input records an explicit approve decision for `QUALITY-003`, the Release Approver's identity and role, timestamp, and an HTTPS approval-record link.

`test:browser` runs the production-build journey suite followed by the focused commerce boundary suite. `test:commerce` can run independently against a local temporary HTTPS proxy, or against an immutable Netlify deployment when `COMMERCE_QUALIFICATION_BASE_URL`, `COMMERCE_QUALIFICATION_DEPLOYMENT_ID`, and `COMMERCE_QUALIFICATION_APPLICATION_COMMIT` are all supplied. The deployed config rejects mutable aliases and verifies the public deploy record before exercising the journey. The manually triggered `Commerce qualification` GitHub Actions workflow accepts the deployment ID and deployed commit, checks out that commit, runs the deployed suite, and retains the sanitized Acceptance evidence for 30 days.

`validate:product-catalog` compares the code-owned Product truth and Catalog values with the reviewed deterministic manifest and records its SHA-256. `validate:boundaries` rejects missing environment markers, server/client poisoning, local Route Handler calls from Server Components, and heavy runtime leakage into the root or Product route. `validate:public-runtime` scans public source and production configuration for forbidden commerce-platform dependencies, modes, endpoints, identifiers, and secret-shaped public variables.

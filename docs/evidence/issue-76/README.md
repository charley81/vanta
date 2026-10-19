# Issue 76 — production bindings and recovery

Verified: **2026-10-19 UTC**

Implementation: [pull request #119](https://github.com/charley81/vanta/pull/119)

This record contains provider identities and outcomes only. It intentionally excludes tokens, signing material, webhook secrets, recovery codes, cookies, and environment-variable values that are credentials.

## Safe binding record

| Check | Result |
|---|---|
| Canonical production origin | `https://vanta-monolith.netlify.app` |
| Netlify project | `vanta-monolith` / `1d61bad6-06f4-4304-9bde-c4ff5f619d41` |
| Delivery source | GitHub `charley81/vanta`, protected `main` |
| Sanity project/dataset | `vanta` / `o2kc8mv4` / `production` |
| Sanity Studio | `https://vanta-monolith-studio.sanity.studio`, application `hqf91rq4dplvkajud4do9pon`; preview identity origin `https://vanta-monolith-studio.sanity.studio`; Presentation browser origin `https://www.sanity.io` |
| Bag | `first-party-bag` in production; GET returned `200` with an empty quantity-one contract; non-production contexts are disabled |
| Privacy destination | Repository `/privacy` route added on this branch; production Sanity binding to `/privacy` is a post-merge publishing check |
| Sanity invalidation | Enabled document webhook for published create/update events, fixed singleton filter, and `{documentId, revision}` projection |
| Backup custodian | None; accepted solo-maintainer risk |

The production environment now contains the required public bindings and credential names. `BAG_SIGNING_KEYS` and `EDITORIAL_PREVIEW_SESSION_SECRET` are marked as Netlify secrets. Editorial preview uses a dedicated Sanity robot with the `viewer` role; the broader expiring write token remains provisioning-only. The owner runbook records provider locations without values.

A protected-main configuration deployment completed as Netlify deploy `6ad6205b93619a49728792c6` for commit `cf5cd1dbbe3afc97eff8b9684da6743f8bc1b0f1`. The earlier deployed security qualification passed deploy/commit identity, public-header, configured preview-header, and absent-source-map checks, but its preview check did not emulate the nested `www.sanity.io` shell → deployed Studio → VANTA preview ancestor chain. It therefore did not detect that preview authentication and browser framing require both distinct exact origins in one `frame-ancestors` directive. The replacement browser regression exercises the complete nested frame chain and visual-editing handshake. The Netlify and GitHub Actions preview-session secrets were rotated to one matching value before the earlier run. Rerun deployed qualification after this fix merges and deploys.

A signed idempotent invalidation using the already-published `homePage` revision returned `200`, `accepted: true`, and `fresh: true`; the public freshness endpoint independently returned `fresh: true`. This exercised invalidation and public verification without manufacturing an Editorial change.

The four published singleton documents were present in `production` and shared the last provisioning transaction revision `lwovfYlwNcvzYkZ0exXPvF`, updated `2026-10-15T21:04:13Z`. Sanity document history remains canonical for selecting a known-good content revision.

## Recovery record

[`docs/operations/owner-runbook.md`](../../operations/owner-runbook.md) covers:

- normal protected-main deployment and post-deploy smoke checks;
- provider status/log use without custom visitor telemetry;
- material Editorial preview, publish, webhook, and freshness verification;
- selecting and publishing a previous immutable Netlify deployment;
- restoring and publishing a known-good Sanity revision;
- emergency Bag disablement while retaining signing material;
- preview/webhook credential response;
- provider access recovery and the explicit lack of a second custodian.

## Required owner completion

The following cannot be represented as complete by this branch:

1. **MFA:** the provider API check reported that Netlify MFA is not enabled. Enable it, then interactively confirm GitHub MFA and the GitHub identity used by Sanity. Confirm that recovery material exists in the owner's password manager and separate offline recovery store; do not record the material or a sensitive location here.
2. **Privacy publication:** after this branch is merged and `/privacy` is live, preview `siteSettings.privacyNoticeUrl=/privacy` in Studio, publish it, and verify the public footer and route. This is the material Editorial publishing-path check for `CONTENT-008`.
3. **Studio Presentation:** use the authenticated Studio once to confirm Home/Product/Synth opens in marked Editorial preview, exact-origin framing succeeds, and Bag mutation is disabled. Automated policy qualification does not substitute for the owner login check.
4. **Post-merge smoke:** record the merged commit and immutable production deploy, then check Home, Product, Synth, Bag, Checkout Preview, and Privacy.

Issue 76 must remain open until these owner checks are recorded. No mandatory rollback rehearsal or backup custodian is required.

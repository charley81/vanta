# VANTA owner runbook

Last verified: **2026-10-19 UTC**

Requirements: `CONTENT-008`, `OPS-006`, `OPS-007`, `OPS-008`, `OPS-009`, `OPS-010`, `SECURITY-004`

This is the single routine-operation and recovery runbook for the site owner. It records no credential, token, signing key, recovery code, or other recovery material.

## Production bindings

| Area | Production binding |
|---|---|
| Public origin | [`https://vanta-monolith.netlify.app`](https://vanta-monolith.netlify.app) |
| Source | GitHub [`charley81/vanta`](https://github.com/charley81/vanta), protected `main` |
| Netlify | [`vanta-monolith`](https://app.netlify.com/projects/vanta-monolith), project ID `1d61bad6-06f4-4304-9bde-c4ff5f619d41` |
| Sanity | [`vanta`](https://www.sanity.io/manage/project/o2kc8mv4), project ID `o2kc8mv4`, dataset `production` |
| Editorial Studio entry | [`https://vanta-monolith-studio.sanity.studio`](https://vanta-monolith-studio.sanity.studio), application ID `hqf91rq4dplvkajud4do9pon` |
| Studio preview identity origin | `https://vanta-monolith-studio.sanity.studio` |
| Presentation browser origin | `https://www.sanity.io` (the Studio entry redirects into Sanity's authenticated application shell) |
| Studio preview target | `https://vanta-monolith.netlify.app` |
| Privacy notice | Repository-owned `/privacy`; Sanity `siteSettings.privacyNoticeUrl` must be `/privacy` |
| Bag | `first-party-bag` in production; disabled in deploy previews and branch deploys |
| Editorial invalidation | Sanity webhook `VANTA production Editorial invalidation`, published create/update events only, fixed singleton filter, fixed revision projection |

Netlify builds `pnpm run build` from `main`, publishes `.next` through its managed Next.js integration, and provides the Node-backed Functions runtime. Detailed delivery-path controls remain in [`delivery-path.md`](delivery-path.md).

## Secrets and access

Secret **values** belong only in provider controls or the owner's ignored local environment:

| Binding | Authoritative location | Notes |
|---|---|---|
| `BAG_SIGNING_KEYS` | Netlify project environment | Production Bag signing and verification material; never expose with `NEXT_PUBLIC_` |
| `SANITY_API_READ_TOKEN` | Netlify project environment | Sanity robot token with the `viewer` role; production Editorial preview only |
| `EDITORIAL_PREVIEW_SESSION_SECRET` | Netlify project environment | Production preview-session signing material |
| `SANITY_WEBHOOK_SECRET` | Netlify project environment and Sanity webhook control | The two values must match |
| GitHub Actions `EDITORIAL_PREVIEW_SESSION_SECRET` | GitHub Actions repository secret | Copy of the candidate runtime value used only by deployed security qualification; rotate with the Netlify value |
| Temporary `SANITY_API_WRITE_TOKEN` | Owner's ignored `.env.local` or password manager | Provisioning/reset only; use an expiring least-privilege token and remove it when the operation ends |
| Provider recovery codes | Owner's password manager and separate offline recovery store | Never place them in Git, an issue, build logs, shell history, or this runbook |

The Netlify plan applies its available site-variable scopes. Sanity preview uses a dedicated viewer robot rather than the broader provisioning token. Production accounts remain individual—never share a personal login or personal access token.

### Account recovery and ownership

- GitHub repository administrator: `charley81`.
- Netlify project/team owner: `charley81`.
- Sanity project administrator: the owner account, authenticated through GitHub.
- Enable MFA on GitHub, Netlify, and the identity used by Sanity wherever each provider supports it. Verify recovery material outside the repository after any identity change.
- Recover GitHub first when the linked GitHub identity is needed by another provider. Use the provider's recovery flow and offline recovery material; contact provider support only after those fail.
- After recovery, inspect active sessions, provider members, repository/deploy integration, Sanity robots, webhooks, and environment-variable names. Rotate affected credentials before restoring normal operation.

There is no second human custodian. Loss or compromise of the owner's accounts can therefore delay recovery. This is an explicit, accepted solo-maintainer risk; the runbook does not invent backup coverage.

## Normal deployment

1. Merge through the protected `main` branch only after the required `verify` check passes.
2. In Netlify **Deploys**, open the resulting production deploy. Confirm `Ready`, `main`, and the expected full Git commit.
3. Record the commit and deploy-ID URL (`https://<deploy-id>--vanta-monolith.netlify.app`), not only a mutable alias.
4. Smoke-test `/`, `/monolith`, `/synth`, `/checkout-preview`, Bag add/remove, and `/privacy` on the public origin.
5. Confirm the public responses retain the expected CSP/security headers. Run the repository Security qualification workflow for a candidate source-map and preview-policy check when the security configuration changes.
6. Use Netlify status and function/deploy logs only to diagnose an observed failure. VANTA has no custom visitor analytics or telemetry store.

## Preview and publish Editorial content

1. Open the bound Editorial Studio and choose the fixed Home, Product, or Synth singleton.
2. For a material change, use Presentation preview before publishing. Confirm the preview marker is visible, the intended route is shown, Bag mutation is disabled, and public metadata/content has not changed.
3. Publish the document. Do not use `pnpm seed:editorial`; that command replaces all four singleton documents and is reserved for explicit provisioning/reset.
4. In Sanity **API → Webhooks**, confirm `VANTA production Editorial invalidation` completed successfully.
5. Confirm the changed public route shows the published result within 60 seconds. If needed, obtain the published revision without printing content:

   ```bash
   pnpm exec sanity documents query \
     '*[_id == "homePage"][0]{_id,_rev,_updatedAt}' \
     --project-id o2kc8mv4 --dataset production --api-version 2025-01-01
   ```

6. Verify the exact revision through the public freshness endpoint:

   ```bash
   curl --fail --get \
     --data-urlencode 'document=homePage' \
     --data-urlencode 'revision=<published-revision>' \
     https://vanta-monolith.netlify.app/api/editorial/freshness
   ```

A `200` response with `{"fresh":true}` confirms the public cache sees that revision. A `409` means it has not refreshed yet; a `503` means public verification failed. Inspect the webhook attempt and retry after correcting the cause. Do not repeatedly publish unrelated edits to force refreshes.

## Deployment rollback

Use this when code or built configuration causes a material Core, Product-truth, accessibility, security, privacy, or transaction-boundary failure.

1. In Netlify **Deploys**, filter to successful production deploys from `main`.
2. Open a known-good deploy and confirm its Git commit, checks, and deploy-ID URL.
3. Use **Publish deploy** / **Restore deploy** for that immutable deploy. Do not trigger a branch or local production deploy.
4. Confirm the public origin now identifies the selected deploy, then smoke-test Home, Product, Synth, Bag, Checkout Preview, and Privacy.
5. Record the failed commit, restored deploy ID/commit, reason, and result in the active incident or launch issue.

Selecting an old deploy restores its built code and functions; it does not restore Sanity content and does not rebuild against newly changed environment variables.

## Sanity content rollback

Use this when published Editorial content—not application code—is wrong.

1. Identify the affected fixed singleton and a known-good revision from Sanity document history or a previously recorded publishing result.
2. In Studio document history, open that revision, review the complete diff, and choose **Restore**.
3. Preview the restored draft in Presentation. Confirm the route and that Product/Catalog facts remain code-owned.
4. Publish the restored document.
5. Confirm the invalidation webhook succeeded, verify its new published revision through `/api/editorial/freshness`, and inspect the public route and metadata.
6. Record the document ID, restored source revision, resulting published revision, time, and public result. Do not copy document content or credentials into the record.

If Sanity is unavailable, leave the last valid public cached content in service. Do not deploy fixture content to Netlify.

## Emergency disablement

### Bag

1. In the Netlify project environment, set production `BAG_MODE=disabled`.
2. Do **not** delete or overwrite `BAG_SIGNING_KEYS`; retain them for recovery and cookie-expiry review.
3. trigger a normal protected-`main` Netlify production build, then confirm `/api/bag` reports the disabled response and Product retains useful content.
4. Record the reason and verification. Re-enable only after fixing the cause and rechecking add/remove, cookie security, and Checkout Preview.

### Editorial preview or invalidation

- Suspected preview-token/session compromise: replace the dedicated Sanity viewer token and preview-session secret in their provider controls, redeploy from `main`, and revoke the old token.
- Suspected webhook compromise or retry storm: disable the Sanity webhook first. Published pages keep their last valid cached content; restore a matching secret and re-enable only after a controlled publication check.
- Optional Realtime/audio failures should select their built-in authored or silent fallback. If they do not, restore a known-good Netlify deploy rather than replacing route content.

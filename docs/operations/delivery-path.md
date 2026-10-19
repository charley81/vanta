# Delivery path control record

This record describes the shared development and deploy-preview path established for [issue #44](https://github.com/charley81/vanta/issues/44). It is an operational binding record, not a launch result. The launch note records the deployed commit, immutable Netlify URL, checks, material gaps, and owner decision. Routine operation and recovery use the single [`owner-runbook.md`](owner-runbook.md).

Last verified: **2026-10-15 UTC**

Requirements supported: `ARCH-001`, `OPS-008`, `SECURITY-005`, `SECURITY-007`

## Netlify binding

| Setting | Bound value |
|---|---|
| Netlify project | [`vanta-monolith`](https://app.netlify.com/projects/vanta-monolith) |
| Project ID | `1d61bad6-06f4-4304-9bde-c4ff5f619d41` |
| Git provider/repository | GitHub / `charley81/vanta` |
| Production branch | `main` |
| Build command | `pnpm run build` |
| Publish directory | `.next` |
| Integration | Netlify-managed Next.js integration; no repository-pinned adapter |
| Deploy previews | Enabled for pull requests |
| Branch deploys | Restricted to `main` |
| Non-Git production deploys | Blocked |
| Functions region | `us-east-2` |

The exact non-production toolchain values are repository-owned: Node `22.22.1` in [`.node-version`](../../.node-version) and pnpm `10.32.1` in [`package.json`](../../package.json). Do not invent placeholder configuration values.

### Canonical production origin

The currently bound canonical origin is `https://vanta-monolith.netlify.app`, matching the project's public Netlify SSL URL. Runtime discoverability policy resolves `VANTA_PRODUCTION_ORIGIN` first, Netlify's production `URL` binding second, and this repository-bound origin for deterministic local verification. Every accepted value must be an HTTPS origin without credentials, path, query, or fragment; malformed values fail startup. A custom-domain cutover must set `VANTA_PRODUCTION_ORIGIN` in the appropriate Netlify contexts and requalify DNS/TLS, host and protocol redirects, canonicals, sitemap, robots, social cards, and structured data before promotion.

Secrets must be entered through Netlify's environment-variable controls with the narrowest applicable deploy contexts and scopes. They must never be committed, written into this record, exposed through a `NEXT_PUBLIC_` name, copied into issue comments, or included in generated reports. Values required by both startup validation and server handlers need Builds and Functions scope.

### Bag configuration and rotation

Bag defaults to safely disabled. Its private deployment configuration is:

| Variable | Contract |
|---|---|
| `BAG_MODE` | `disabled` or `first-party-bag`; an unknown value fails application startup |
| `BAG_SIGNING_KEYS` | Present only for `first-party-bag`: one to three unique comma-separated base64url values, each decoding to 32–64 bytes; the first key signs and all keys verify |

Missing, malformed, duplicate, or excessive signing keys keep Bag disabled without exposing configuration details. The signing variable must never use a `NEXT_PUBLIC_` name. Production requires HTTPS because the `__Host-vanta_bag` cookie is always `Secure`, as well as `HttpOnly`, host-only, path `/`, and `SameSite=Strict`.

Generate signing material in an approved secret-management context rather than this repository or a shell transcript. To rotate, prepend a new active key, retain the previous key as a verifier for at least the full 30-day Bag lifetime, deploy and verify cookie re-signing, then remove the previous key. Emergency shutdown sets `BAG_MODE=disabled`; do not remove or overwrite retained key material until recovery and expiry implications are reviewed. Public records capture only configuration status and provenance, never values.

### Immutable preview identity

Deploy Preview 84 demonstrates the traceability contract:

- commit: [`3fd1f2df0d59d1f3dc61f8eda767b62001b89851`](https://github.com/charley81/vanta/commit/3fd1f2df0d59d1f3dc61f8eda767b62001b89851)
- Netlify deploy ID: [`6ad0fcfb3abdc7febf815373`](https://app.netlify.com/projects/vanta-monolith/deploys/6ad0fcfb3abdc7febf815373)
- immutable URL: [`https://6ad0fcfb3abdc7febf815373--vanta-monolith.netlify.app`](https://6ad0fcfb3abdc7febf815373--vanta-monolith.netlify.app)
- pull request: [#84](https://github.com/charley81/vanta/pull/84)

The deploy record's `commit_ref` must equal the reviewed Git commit. Record the deploy-ID URL, not only the mutable pull-request alias, in the launch note.

## Protected delivery path

GitHub branch protection for `main` enforces:

- changes arrive through pull requests;
- no approving review is required while the repository has a single maintainer;
- the GitHub Actions `verify` check is required and must run against the latest base branch;
- conversations must be resolved;
- administrators are subject to the rule;
- force pushes and branch deletion are blocked.

The required `verify` job runs the requirement/evidence validators, performance regression fixture, lint, generated-route type check, unit/component tests, production build, and browser/accessibility tests. Netlify deploy checks remain visible on pull requests, but `verify` is the established merge-gating CI check.

GitHub secret scanning, push protection, vulnerability alerts, and Dependabot security updates are enabled. No open Dependabot alert was present when this record was verified. These repository controls support, but do not replace, candidate-specific dependency, vulnerability, secret, bundle, and deployed-output scans.

## Ownership, access, and recovery status

| Area | Primary / observed access | Backup status | Deployment identity / secret location |
|---|---|---|---|
| GitHub repository and protected branch | `charley81`, repository administrator | No second collaborator was present at verification time | GitHub commit, pull request, Actions run, and branch-protection records |
| Netlify project and deploy previews | `charley81`, Netlify team owner | No second project custodian was verified | Netlify project/deploy records; environment values stay in Netlify |

The absent backup is an explicit solo-maintainer risk, not fictional separation of duties, and does not block launch. A backup may be added later if another maintainer actually participates.

Access and recovery expectations:

1. Use individual accounts with least privilege and MFA; never share a personal login or access token.
2. Keep recovery codes and service credentials outside this repository.
3. Rotate credentials after suspected exposure or account/access changes.
4. Recover a failed deployment by selecting a previous Netlify deploy.
5. Re-run normal build and smoke checks after changing the Git integration, production branch, build command, toolchain, environment contexts, or deployment project, and update this record when its facts change.

## Verification

Re-check the public/non-secret controls without printing environment values:

```bash
gh api repos/charley81/vanta/branches/main/protection
netlify api getSite --data '{"site_id":"1d61bad6-06f4-4304-9bde-c4ff5f619d41"}'
netlify api listSiteDeploys --data '{"site_id":"1d61bad6-06f4-4304-9bde-c4ff5f619d41","per_page":20}'
```

For candidate security qualification, bind the GitHub Actions `EDITORIAL_PREVIEW_SESSION_SECRET` secret to the same value as the candidate deployment without printing or copying it into workflow inputs. Run the **Security qualification** workflow with the immutable Netlify deployment ID, its full application commit, and the exact public Sanity Studio origin. The workflow rejects mutable deployment aliases, confirms the Netlify deployment is ready and commit-bound, checks public and Editorial-preview CSP/header behavior, and verifies browser source maps return `404`. Its retained artifact contains only deployment identity, policy headers, and status/count outcomes; tracing and video are disabled so the signed preview cookie is not retained.

The repository and browser-output secret scans, critical dependency audit, local production build, and endpoint security tests run in normal CI. A local result has `acceptanceClaim: false`; link the successful immutable-deployment workflow run from the launch issue rather than creating another evidence store.

Do not place secret values, signed preview cookies, recovery material, or private environment configuration in public issue or release records.

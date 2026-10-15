# Delivery path control record

This record describes the shared development and deploy-preview path established for [issue #44](https://github.com/charley81/vanta/issues/44). It is an operational binding record, not candidate Acceptance evidence. A release-specific evidence manifest must still bind checks to the exact candidate being qualified.

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

The exact non-production toolchain values are repository-owned: Node `22.22.1` in [`.node-version`](../../.node-version) and pnpm `10.32.1` in [`package.json`](../../package.json). The project had no environment variables configured when this record was verified because the current scaffold requires none. Do not invent placeholder values. Add future public configuration and secrets only when their owning feature specifies exact values and contexts.

Secrets must be entered through Netlify's environment-variable controls with the narrowest applicable deploy contexts and scopes. They must never be committed, written into this record, exposed through a `NEXT_PUBLIC_` name, copied into issue comments, or included in generated reports. Values required by both prerendering and server handlers need Builds and Functions scope.

### Immutable preview identity

Deploy Preview 84 demonstrates the traceability contract:

- commit: [`3fd1f2df0d59d1f3dc61f8eda767b62001b89851`](https://github.com/charley81/vanta/commit/3fd1f2df0d59d1f3dc61f8eda767b62001b89851)
- Netlify deploy ID: [`6ad0fcfb3abdc7febf815373`](https://app.netlify.com/projects/vanta-monolith/deploys/6ad0fcfb3abdc7febf815373)
- immutable URL: [`https://6ad0fcfb3abdc7febf815373--vanta-monolith.netlify.app`](https://6ad0fcfb3abdc7febf815373--vanta-monolith.netlify.app)
- pull request: [#84](https://github.com/charley81/vanta/pull/84)

The deploy record's `commit_ref` must equal the Git commit under qualification. The deploy-ID URL, not the mutable pull-request alias, is the identity recorded in candidate evidence.

## Protected delivery path

GitHub branch protection for `main` enforces:

- changes arrive through pull requests;
- one approving review is required;
- stale approvals are dismissed and the latest push must be approved by someone other than its author;
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

The absent backup is an explicit operational gap, not fictional separation of duties. Because protected merges require an independent approval, a least-privilege backup reviewer must be granted appropriate repository access before another change can merge. Before launch, the accountable `operations_release` role must also confirm the named backup's Netlify access, individual MFA, recovery method, and escalation route in an access-controlled system.

Access and recovery expectations:

1. Use individual accounts with least privilege and MFA; never share a personal login or access token.
2. Keep recovery codes, service credentials, and escalation contact details in an approved system outside this repository.
3. Review access and webhook inventories quarterly and secret locations/rotation status at least every six months.
4. Rotate credentials after suspected exposure or personnel/access changes.
5. Recover a failed deployment by selecting a previously qualified immutable Netlify deploy; do not rebuild and call the result the same candidate.
6. Removing or replacing the Git integration, changing the production branch, build command, toolchain, adapter behavior, environment contexts, or deployment project is a qualification event and requires this record to be updated.

## Verification

Re-check the public/non-secret controls without printing environment values:

```bash
gh api repos/charley81/vanta/branches/main/protection
netlify api getSite --data '{"site_id":"1d61bad6-06f4-4304-9bde-c4ff5f619d41"}'
netlify api listSiteDeploys --data '{"site_id":"1d61bad6-06f4-4304-9bde-c4ff5f619d41","per_page":20}'
```

Capture sensitive access, MFA, recovery, and environment-variable evidence in the approved restricted system. Public issue/release records should contain only status, provenance, custodian, retention, and an access-controlled link.

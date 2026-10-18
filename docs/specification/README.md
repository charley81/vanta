# VANTA production specification

Status: **Approved Handoff Baseline — proportionate launch scope revised 2026-10-18**

This bundle consolidates the effective product, experience, technical, and acceptance decisions for the production VANTA experience. After approval, the immutable Git commit containing this bundle is the **Handoff Baseline**. Implementation may choose among the bounded options recorded as Implementation latitude, but it must not reopen or silently weaken settled requirements.

## Scope

The baseline specifies:

- the public Home, Product, Synth, Bag, and Checkout Preview experiences;
- the code-owned MONOLITH Product truth and public Catalog values;
- Sanity-owned Editorial content and media;
- the approved GLB-derived 3D and authored-media pipeline;
- the production Next.js 16 App Router and Netlify architecture;
- responsive, accessible, resilient, privacy-preserving behavior;
- proportionate launch hardening, owner review, and recovery.

The public experience has no purchase capability. It collects no buyer or payment information and creates no Shopify cart, checkout, order, fulfillment, notification, or qualification dependency.

Out of scope: a public case study, creator commentary inside the brand experience, journal, accounts, search, support center, other products, localization, additional currencies or markets, real commerce, a complete eight-voice software emulation, native apps, plug-ins, and hardware firmware.

## Artifact map

| Artifact | Purpose |
|---|---|
| [Product and experience](product-experience.md) | Product truth, visual language, routes, interaction, continuity, adaptation, and initial content seed |
| [Technical architecture](technical-architecture.md) | Runtime boundaries, source ownership, caching, state, security, privacy, deployment, and operations |
| [Requirements register](requirements.yaml) | Normative, stable, machine-readable requirements and traceability |
| [Launch readiness](launch-readiness.md) | Focused automated checks, manual review, recovery, and owner launch decision |
| [Source register](source-register.md) | Pinned decisions and assets, precedence, supersession, bindings, and Implementation latitude |
| [Evidence template](evidence-template.yaml) | Release-specific evidence manifest schema; the template itself makes no pass claims |

The prose explains the system. `requirements.yaml` is the normative verification index. If prose and a requirement appear inconsistent, stop and resolve the inconsistency through the change-control process; do not choose whichever is easier to implement.

## Normative language

- **must**: required for conformance or launch unless an approved, expiring waiver exists where waivers are permitted;
- **should**: expected unless measured evidence and review support another conforming choice;
- **may**: permitted, not required;
- **must not**: prohibited and not waivable when it protects the public transaction, privacy, Product-truth, or security boundary.

The 2026-10-18 proportional-scope revision deliberately relaxes or removes telemetry, Shopify qualification, field-monitoring, device-lab, and enterprise-governance gates that were not justified for this portfolio site. Security, privacy, accessibility, Product truth, and transaction boundaries remain mandatory.

## Source precedence

When sources conflict, use this order:

1. an effective requirement in this Handoff Baseline;
2. the latest explicitly superseding decision ticket;
3. canonical Product truth and code-owned operational/accessibility language;
4. an approved prototype for the behavior it tested;
5. Figma for composition, content structure, art direction, and art-directed crops;
6. the approved GLB for product geometry;
7. donor implementations and research as non-authoritative references.

Authority is domain-specific. The GLB cannot redefine copy or behavior. Figma cannot override accessibility, Product truth, quality budgets, or a later decision. Prototypes prove selected behavior and direction; their source code is throwaway and must not be promoted directly.

## How implementation uses the baseline

1. Select requirements by domain, route, capability, and acceptance stage.
2. Reference requirement IDs from implementation tickets, tests, and evidence.
3. Preserve source and supersession links when decomposing work.
4. Record material implementation choices in the relevant issue or release note.
5. Run the focused [Launch readiness](launch-readiness.md) checklist against the intended deployment.
6. Record the deployed commit, immutable Netlify URL, checks, known gaps, and one owner go/no-go decision. The structured `evidence-template.yaml` remains available but is optional.

The implementation ticket graph is tracked in [Build and qualify the production VANTA experience](https://github.com/charley81/vanta/issues/40), including the proportional-scope revision to the original delivery plan.

## Completeness and pre-launch bindings

The baseline contains no unresolved product or technical `TBD`. Values that cannot exist before implementation—such as the production domain, service project IDs, deployed URLs, named custodians, and secret locations—are **pre-launch bindings**, not deferred design decisions. Each binding in the [Source register](source-register.md#pre-launch-bindings) has an owner role, validation rule, required-by gate, and safe failure behavior.

## Approval and change control

This approved baseline is identified by the Git commit containing these files, as linked from the resolution of [Define the final production specification and acceptance handoff](https://github.com/charley81/vanta/issues/38), not by an editable label. After approval:

- clarifications may improve wording only when observable behavior and acceptance remain unchanged;
- normative changes require a linked approving decision and a changelog entry in this file;
- implementation convenience is not grounds to weaken a requirement;
- a launch record names the application commit and immutable deployment URL it verifies;
- historical launch records are not rewritten to hide failures or changed results;
- sensitive values remain outside the repository and public issue content.

The site owner records the launch decision. Missing backup coverage is an accepted solo-maintainer risk rather than fictional separation of duties.

## Changelog

- 2026-10-15: approved the first Handoff Baseline after human review; its immutable identity is the final Git commit linked from the approving decision.
- 2026-10-18: approved the proportional-scope revision in [issue #40](https://github.com/charley81/vanta/issues/40). Removed custom telemetry/monitoring and private Shopify qualification from launch scope; simplified performance, browser/accessibility coverage, operations, candidate evidence, and launch approval while preserving visitor-facing quality, security, privacy, and transaction boundaries.

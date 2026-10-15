# VANTA production specification

Status: **Approved Handoff Baseline**

This bundle consolidates the effective product, experience, technical, and acceptance decisions for the production VANTA experience. After approval, the immutable Git commit containing this bundle is the **Handoff Baseline**. Implementation may choose among the bounded options recorded as Implementation latitude, but it must not reopen or silently weaken settled requirements.

## Scope

The baseline specifies:

- the public Home, Product, Synth, Bag, and Checkout Preview experiences;
- the code-owned MONOLITH Product truth and public Catalog values;
- Sanity-owned Editorial content and media;
- the approved GLB-derived 3D and authored-media pipeline;
- the production Next.js 16 App Router and Netlify architecture;
- responsive, accessible, resilient, privacy-preserving behavior;
- non-public Shopify integration qualification;
- launch hardening, evidence, approval, and change control.

The public experience has no purchase capability. It collects no buyer or payment information and creates no public Shopify cart, checkout, order, fulfillment, or notification. Shopify is isolated qualification infrastructure, not a public runtime dependency.

Out of scope: a public case study, creator commentary inside the brand experience, journal, accounts, search, support center, other products, localization, additional currencies or markets, real commerce, a complete eight-voice software emulation, native apps, plug-ins, and hardware firmware.

## Artifact map

| Artifact | Purpose |
|---|---|
| [Product and experience](product-experience.md) | Product truth, visual language, routes, interaction, continuity, adaptation, and initial content seed |
| [Technical architecture](technical-architecture.md) | Runtime boundaries, source ownership, caching, state, security, telemetry, deployment, and operations |
| [Requirements register](requirements.yaml) | Normative, stable, machine-readable requirements and traceability |
| [Launch readiness](launch-readiness.md) | Candidate qualification, launch gates, exercises, evidence, and sign-off |
| [Source register](source-register.md) | Pinned decisions and assets, precedence, supersession, bindings, and Implementation latitude |
| [Evidence template](evidence-template.yaml) | Release-specific evidence manifest schema; the template itself makes no pass claims |

The prose explains the system. `requirements.yaml` is the normative verification index. If prose and a requirement appear inconsistent, stop and resolve the inconsistency through the change-control process; do not choose whichever is easier to implement.

## Normative language

- **must**: required for conformance or launch unless an approved, expiring waiver exists where waivers are permitted;
- **should**: expected unless measured evidence and review support another conforming choice;
- **may**: permitted, not required;
- **must not**: prohibited and not waivable when it protects the public transaction, privacy, Product-truth, or security boundary.

All existing decision-ticket release gates remain `must`. Consolidation does not downgrade them.

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
4. Record bounded implementation choices in the release record.
5. Populate a release-specific copy of `evidence-template.yaml` with links to real results.
6. Run [Launch readiness](launch-readiness.md) against one immutable candidate.
7. Obtain the named approvals before promotion.

The implementation ticket graph and delivery order are intentionally separate. They are decided by [Choose the implementation ticket graph and risk-first delivery sequence](https://github.com/charley81/vanta/issues/39), derived from the stable IDs in this bundle.

## Completeness and pre-launch bindings

The baseline contains no unresolved product or technical `TBD`. Values that cannot exist before implementation—such as the production domain, service project IDs, deployed URLs, named custodians, and secret locations—are **pre-launch bindings**, not deferred design decisions. Each binding in the [Source register](source-register.md#pre-launch-bindings) has an owner role, validation rule, required-by gate, and safe failure behavior.

## Approval and change control

This approved baseline is identified by the Git commit containing these files, as linked from the resolution of [Define the final production specification and acceptance handoff](https://github.com/charley81/vanta/issues/38), not by an editable label. After approval:

- clarifications may improve wording only when observable behavior and acceptance remain unchanged;
- normative changes require a linked approving decision and a changelog entry in this file;
- implementation convenience is not grounds to weaken a requirement;
- release evidence always names the exact baseline commit it verifies;
- historical evidence is immutable; corrected evidence is a new record linked to the superseded record;
- sensitive artifacts remain in approved restricted systems while the public manifest records provenance, hash where appropriate, custodian, retention, and access-controlled link.

One person may hold multiple approval roles. Missing backup coverage is recorded as accepted operational risk rather than disguised with fictional separation of duties.

## Changelog

- 2026-10-15: approved the first Handoff Baseline after human review; its immutable identity is the final Git commit linked from the approving decision.

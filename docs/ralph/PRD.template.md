# PRD: {{FEATURE_SLUG}}

Status: DRAFT

> Replace every instructional placeholder, review the complete scope with a human, then change the status to `APPROVED`.

## Problem

Who has which problem, and what evidence shows it is worth solving?

## Desired end state

Describe observable user and system behavior when the feature is complete.

## Scope

### In scope

- Define included behavior.

### Out of scope

- Define adjacent behavior that this feature will not add.

## Constraints and decisions

- Record product, design, accessibility, security, performance, data, and compatibility constraints.
- Link approved Figma frames or save the necessary design details in the repository before an AFK run.
- Treat this as production code optimized for maintainability and long-term quality.

## Work items

Order does not determine execution priority. Ralph chooses the highest-risk incomplete item first.

### [ ] F-001 — Replace with a small, end-to-end outcome

**Risk:** State what this item proves or de-risks.

**Acceptance criteria:**

- [ ] State behavior in observable terms.
- [ ] Include important empty, error, loading, boundary, and responsive states where applicable.

**Verification:**

- [ ] Name the focused automated or manual check that proves each criterion.

## Definition of done

- [ ] Every in-scope acceptance criterion is verified and every work item is complete.
- [ ] Relevant success, failure, boundary, empty, and network-failure behavior is covered where meaningful.
- [ ] The affected user journey has been manually reviewed; UI work is checked at relevant responsive sizes.
- [ ] `pnpm check` passes.
- [ ] No unresolved blocker or undocumented follow-up remains.

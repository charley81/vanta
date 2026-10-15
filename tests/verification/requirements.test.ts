import { describe, expect, it } from "vitest";

import {
  parseRequirementRegister,
  parseVerificationChecks,
  validateRequirementReferences,
} from "@/tooling/verification/requirements";

describe("requirements register validation", () => {
  it("loads stable IDs from a valid register", () => {
    const result = parseRequirementRegister(`
      schema_version: 1
      status: approved
      sources:
        quality_budgets: https://example.com/quality
      requirements:
        - id: QUALITY-003
          domain: QUALITY
          level: must
          statement: Regressions need approval.
          applies_to: [all_routes]
          source: quality_budgets
          acceptance_stage: candidate
          verification: [measurement, review]
          evidence: [regression_report]
          owner: release_approver
    `);

    expect(result.issues).toEqual([]);
    expect(result.requirementIds).toEqual(new Set(["QUALITY-003"]));
  });

  it("rejects duplicate and malformed IDs", () => {
    const result = parseRequirementRegister(`
      schema_version: 1
      status: approved
      sources: {}
      requirements:
        - id: quality-003
        - id: QUALITY-003
        - id: QUALITY-003
    `);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_requirement_id" }),
        expect.objectContaining({ code: "duplicate_requirement_id" }),
      ]),
    );
  });
});

describe("verification check validation", () => {
  it("rejects malformed requirement reference values", () => {
    const result = parseVerificationChecks(
      `
        schema_version: 1
        artifact_root: artifacts
        fixture_root: verification/fixtures
        non_waivable_requirement_ids: [QUALITY-003, 7]
        checks:
          - id: unit-tests
            command: pnpm test:unit
            tool: vitest
            report_path: artifacts/reports/unit-tests.json
            requirement_ids: [QUALITY-003, 7]
      `,
      new Set(["QUALITY-003"]),
    );

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_requirement_reference",
          path: "$.non_waivable_requirement_ids[1]",
        }),
        expect.objectContaining({
          code: "invalid_requirement_reference",
          path: "$.checks[0].requirement_ids[1]",
        }),
      ]),
    );
  });

  it("rejects unknown references and report paths outside the artifact root", () => {
    const result = parseVerificationChecks(
      `
        schema_version: 1
        artifact_root: artifacts
        fixture_root: verification/fixtures
        checks:
          - id: browser-tests
            command: pnpm test:browser
            tool: playwright
            report_path: elsewhere/report.json
            requirement_ids: [QUALITY-999]
      `,
      new Set(["QUALITY-003"]),
    );

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown_requirement" }),
        expect.objectContaining({ code: "invalid_report_path" }),
      ]),
    );
  });
});

describe("requirement reference validation", () => {
  it("rejects an unknown requirement ID", () => {
    const issues = validateRequirementReferences({
      knownIds: new Set(["QUALITY-003"]),
      references: [
        {
          source: "verification/checks.yaml#checks[0]",
          requirementIds: ["QUALITY-999"],
        },
      ],
    });

    expect(issues).toEqual([
      {
        code: "unknown_requirement",
        message: "Unknown requirement ID QUALITY-999",
        path: "verification/checks.yaml#checks[0].requirement_ids[0]",
      },
    ]);
  });
});

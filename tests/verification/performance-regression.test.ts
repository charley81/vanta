import { describe, expect, it } from "vitest";

import { evaluatePerformanceRegression } from "@/tooling/verification/performance-regression";

describe("performance regression approval gate", () => {
  it("passes a median regression at the ten-percent boundary", () => {
    const result = evaluatePerformanceRegression({
      baselineSamples: [100, 100, 100],
      candidateSamples: [110, 110, 110],
    });

    expect(result).toMatchObject({
      baselineMedian: 100,
      candidateMedian: 110,
      regressionPercent: 10,
      status: "pass",
      requirementIds: ["QUALITY-003"],
    });
  });

  it("fails any regression above ten percent without rounding it down", () => {
    const result = evaluatePerformanceRegression({
      baselineSamples: [100, 100, 100],
      candidateSamples: [110.0000004, 110.0000004, 110.0000004],
    });

    expect(result.status).toBe("fail");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "approval_required" }),
    );
  });

  it("fails a regression above ten percent without explicit approval", () => {
    const result = evaluatePerformanceRegression({
      baselineSamples: [100, 100, 100],
      candidateSamples: [111, 111, 111],
    });

    expect(result.status).toBe("fail");
    expect(result.issues).toContainEqual({
      code: "approval_required",
      message: "A 11% median regression exceeds 10% and needs explicit approval",
      path: "$.approval",
    });
  });

  it("records explicit approval for a regression above ten percent", () => {
    const result = evaluatePerformanceRegression({
      baselineSamples: [100, 100, 100],
      candidateSamples: [120, 120, 120],
      approval: {
        decision: "approve",
        approvedAt: "2026-10-15T10:00:00.000Z",
        approvedBy: "A. Release Approver",
        approverRole: "release_approver",
        issueUrl: "https://github.com/charley81/vanta/issues/999",
        requirementIds: ["QUALITY-003"],
      },
    });

    expect(result.status).toBe("pass");
    expect(result.approval).toEqual(
      expect.objectContaining({ approvedBy: "A. Release Approver" }),
    );
  });

  it("rejects structurally incomplete input instead of throwing", () => {
    const result = evaluatePerformanceRegression({
      baselineSamples: null,
      candidateSamples: [],
    });

    expect(result.status).toBe("fail");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_input",
          path: "$.baselineSamples",
        }),
      ]),
    );
  });

  it("requires three valid measurements for each median", () => {
    const result = evaluatePerformanceRegression({
      baselineSamples: [100, 100],
      candidateSamples: [100, Number.NaN, -1],
    });

    expect(result.status).toBe("fail");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "insufficient_samples" }),
        expect.objectContaining({ code: "invalid_sample" }),
      ]),
    );
  });
});

import type { ValidationIssue } from "./requirements";
import { isRecord } from "./validation";

export type RegressionApproval = {
  decision: "approve";
  approvedAt: string;
  approvedBy: string;
  approverRole: "release_approver";
  issueUrl: string;
  requirementIds: ["QUALITY-003"];
};

export type PerformanceRegressionInput = {
  baselineSamples: number[];
  candidateSamples: number[];
  approval?: RegressionApproval;
};

export type PerformanceRegressionResult = {
  baselineMedian: number | null;
  candidateMedian: number | null;
  regressionPercent: number | null;
  thresholdPercent: 10;
  status: "pass" | "fail";
  requirementIds: ["QUALITY-003"];
  approval?: RegressionApproval;
  issues: ValidationIssue[];
};

function median(samples: number[]): number {
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function parseSamples(
  input: Record<string, unknown>,
  name: "baselineSamples" | "candidateSamples",
  issues: ValidationIssue[],
): number[] {
  const value = input[name];
  if (!Array.isArray(value)) {
    issues.push({
      code: "invalid_input",
      message: `${name} must be an array of measurements`,
      path: `$.${name}`,
    });
    return [];
  }

  if (value.length < 3) {
    issues.push({
      code: "insufficient_samples",
      message: `${name} must contain at least three measurements`,
      path: `$.${name}`,
    });
  }

  return value.flatMap((sample, index) => {
    if (typeof sample !== "number" || !Number.isFinite(sample) || sample < 0) {
      issues.push({
        code: "invalid_sample",
        message: "Performance measurements must be finite, non-negative numbers",
        path: `$.${name}[${index}]`,
      });
      return [];
    }
    return [sample];
  });
}

function parseApproval(
  value: unknown,
  issues: ValidationIssue[],
): RegressionApproval | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    issues.push({
      code: "invalid_approval",
      message: "Approval must be an explicit release decision record",
      path: "$.approval",
    });
    return undefined;
  }

  const validIssueUrl = (() => {
    if (typeof value.issueUrl !== "string") return false;
    try {
      return new URL(value.issueUrl).protocol === "https:";
    } catch {
      return false;
    }
  })();
  const validRequirementIds =
    Array.isArray(value.requirementIds) &&
    value.requirementIds.length === 1 &&
    value.requirementIds[0] === "QUALITY-003";
  const valid =
    value.decision === "approve" &&
    typeof value.approvedAt === "string" &&
    !Number.isNaN(Date.parse(value.approvedAt)) &&
    typeof value.approvedBy === "string" &&
    value.approvedBy.trim().length > 0 &&
    value.approverRole === "release_approver" &&
    validIssueUrl &&
    validRequirementIds;

  if (!valid) {
    issues.push({
      code: "invalid_approval",
      message:
        "Approval must name the Release Approver, decision, time, HTTPS record, and QUALITY-003",
      path: "$.approval",
    });
    return undefined;
  }

  return value as RegressionApproval;
}

export function evaluatePerformanceRegression(
  value: unknown,
): PerformanceRegressionResult {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      baselineMedian: null,
      candidateMedian: null,
      regressionPercent: null,
      thresholdPercent: 10,
      status: "fail",
      requirementIds: ["QUALITY-003"],
      issues: [
        {
          code: "invalid_input",
          message: "Performance comparison must be an object",
          path: "$",
        },
      ],
    };
  }

  const baselineSamples = parseSamples(value, "baselineSamples", issues);
  const candidateSamples = parseSamples(value, "candidateSamples", issues);
  const approval = parseApproval(value.approval, issues);
  const samplesAreValid =
    issues.every((issue) => issue.code !== "invalid_input" && issue.code !== "invalid_sample" && issue.code !== "insufficient_samples") &&
    baselineSamples.length >= 3 &&
    candidateSamples.length >= 3;
  const baselineMedian = samplesAreValid ? median(baselineSamples) : null;
  const candidateMedian = samplesAreValid ? median(candidateSamples) : null;

  if (baselineMedian === 0) {
    issues.push({
      code: "invalid_baseline",
      message: "Baseline median must be greater than zero",
      path: "$.baselineSamples",
    });
  }

  const rawRegressionPercent =
    baselineMedian !== null &&
    candidateMedian !== null &&
    baselineMedian > 0
      ? ((candidateMedian - baselineMedian) / baselineMedian) * 100
      : null;
  const regressionPercent =
    rawRegressionPercent === null
      ? null
      : Math.round(rawRegressionPercent * 1e9) / 1e9;

  if (rawRegressionPercent !== null && rawRegressionPercent > 10 && !approval) {
    issues.push({
      code: "approval_required",
      message: `A ${regressionPercent}% median regression exceeds 10% and needs explicit approval`,
      path: "$.approval",
    });
  }

  return {
    baselineMedian,
    candidateMedian,
    regressionPercent,
    thresholdPercent: 10,
    status: issues.length === 0 ? "pass" : "fail",
    requirementIds: ["QUALITY-003"],
    ...(approval ? { approval } : {}),
    issues,
  };
}

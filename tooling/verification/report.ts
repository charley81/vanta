import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { ValidationIssue } from "./requirements";

export type VerificationReportInput = {
  checkId: string;
  command: string;
  commit: string;
  dirty: boolean;
  startedAt: string;
  completedAt: string;
  status: "pass" | "fail";
  requirementIds: string[];
  tools: Record<string, string>;
  summary: Record<string, unknown>;
  issues: ValidationIssue[];
};

export function buildVerificationReport(input: VerificationReportInput) {
  return {
    schemaVersion: 1 as const,
    checkId: input.checkId,
    status: input.status,
    acceptanceClaim: false as const,
    command: input.command,
    source: {
      commit: input.commit,
      dirty: input.dirty,
    },
    requirementIds: input.requirementIds,
    tools: input.tools,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    summary: input.summary,
    issues: input.issues,
  };
}

export function writeVerificationReport(
  reportPath: string,
  input: VerificationReportInput,
): void {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(
    reportPath,
    `${JSON.stringify(buildVerificationReport(input), null, 2)}\n`,
    "utf8",
  );
}

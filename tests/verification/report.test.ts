import { describe, expect, it } from "vitest";

import { buildVerificationReport } from "@/tooling/verification/report";

describe("verification report metadata", () => {
  it("binds a result to its command, tools, commit, and requirement IDs", () => {
    const report = buildVerificationReport({
      checkId: "unit-tests",
      command: "pnpm exec vitest run",
      commit: "abc123",
      dirty: false,
      startedAt: "2026-10-15T10:00:00.000Z",
      completedAt: "2026-10-15T10:00:01.000Z",
      status: "pass",
      requirementIds: ["ARCH-002", "ARCH-003"],
      tools: {
        node: "22.22.1",
        pnpm: "10.32.1",
        vitest: "5.0.5",
      },
      summary: { exitCode: 0 },
      issues: [],
    });

    expect(report).toMatchObject({
      schemaVersion: 1,
      checkId: "unit-tests",
      command: "pnpm exec vitest run",
      source: { commit: "abc123", dirty: false },
      requirementIds: ["ARCH-002", "ARCH-003"],
      tools: { vitest: "5.0.5" },
      status: "pass",
      acceptanceClaim: false,
    });
  });
});

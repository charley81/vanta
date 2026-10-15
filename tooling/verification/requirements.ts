import { parse } from "yaml";

import { isRecord } from "./validation";

export type ValidationIssue = {
  code: string;
  message: string;
  path: string;
};

export type RequirementReference = {
  source: string;
  requirementIds: string[];
};

export type RequirementRegisterResult = {
  requirementIds: Set<string>;
  issues: ValidationIssue[];
};

export type VerificationCheck = {
  id: string;
  command: string;
  tool: string;
  reportPath: string;
  requirementIds: string[];
};

export type VerificationChecksResult = {
  artifactRoot: string | null;
  fixtureRoot: string | null;
  nonWaivableRequirementIds: Set<string>;
  checks: VerificationCheck[];
  issues: ValidationIssue[];
};

const requirementIdPattern = /^[A-Z]+(?:-[A-Z]+)*-\d{3}$/;

export function parseRequirementRegister(
  yamlSource: string,
): RequirementRegisterResult {
  let document: unknown;

  try {
    document = parse(yamlSource);
  } catch (error) {
    return {
      requirementIds: new Set(),
      issues: [
        {
          code: "invalid_yaml",
          message: error instanceof Error ? error.message : "Invalid YAML",
          path: "$",
        },
      ],
    };
  }

  if (!isRecord(document) || !Array.isArray(document.requirements)) {
    return {
      requirementIds: new Set(),
      issues: [
        {
          code: "invalid_register",
          message: "Requirements register must contain a requirements array",
          path: "$.requirements",
        },
      ],
    };
  }

  const requirementIds = new Set<string>();
  const issues: ValidationIssue[] = [];

  document.requirements.forEach((requirement, index) => {
    const path = `$.requirements[${index}].id`;
    const id = isRecord(requirement) ? requirement.id : undefined;

    if (typeof id !== "string" || !requirementIdPattern.test(id)) {
      issues.push({
        code: "invalid_requirement_id",
        message: `Requirement ID must match ${requirementIdPattern}`,
        path,
      });
      return;
    }

    if (requirementIds.has(id)) {
      issues.push({
        code: "duplicate_requirement_id",
        message: `Duplicate requirement ID ${id}`,
        path,
      });
      return;
    }

    requirementIds.add(id);
  });

  return { requirementIds, issues };
}

export function parseVerificationChecks(
  yamlSource: string,
  knownIds: ReadonlySet<string>,
): VerificationChecksResult {
  let document: unknown;
  try {
    document = parse(yamlSource);
  } catch (error) {
    return {
      artifactRoot: null,
      fixtureRoot: null,
      nonWaivableRequirementIds: new Set(),
      checks: [],
      issues: [
        {
          code: "invalid_yaml",
          message: error instanceof Error ? error.message : "Invalid YAML",
          path: "$",
        },
      ],
    };
  }

  if (!isRecord(document) || !Array.isArray(document.checks)) {
    return {
      artifactRoot: null,
      fixtureRoot: null,
      nonWaivableRequirementIds: new Set(),
      checks: [],
      issues: [
        {
          code: "invalid_checks_manifest",
          message: "Verification manifest must contain a checks array",
          path: "$.checks",
        },
      ],
    };
  }

  const artifactRoot =
    typeof document.artifact_root === "string" ? document.artifact_root : null;
  const fixtureRoot =
    typeof document.fixture_root === "string" ? document.fixture_root : null;
  const issues: ValidationIssue[] = [];
  const rawNonWaivableRequirementIds = Array.isArray(
    document.non_waivable_requirement_ids,
  )
    ? document.non_waivable_requirement_ids
    : [];
  rawNonWaivableRequirementIds.forEach((id, index) => {
    if (typeof id !== "string") {
      issues.push({
        code: "invalid_requirement_reference",
        message: "Requirement references must be strings",
        path: `$.non_waivable_requirement_ids[${index}]`,
      });
    }
  });
  const nonWaivableRequirementIds = new Set(
    rawNonWaivableRequirementIds.filter(
      (id): id is string => typeof id === "string",
    ),
  );
  issues.push(
    ...validateRequirementReferences({
      knownIds,
      references: [
        {
          source: "$",
          requirementIds: [...nonWaivableRequirementIds],
        },
      ],
    }),
  );
  const checks: VerificationCheck[] = [];
  const checkIds = new Set<string>();
  const reportPaths = new Set<string>();

  document.checks.forEach((value, index) => {
    const path = `$.checks[${index}]`;
    if (!isRecord(value)) {
      issues.push({
        code: "invalid_check",
        message: "Each verification check must be an object",
        path,
      });
      return;
    }

    const { id, command, tool, report_path: reportPath } = value;
    const rawRequirementIds = Array.isArray(value.requirement_ids)
      ? value.requirement_ids
      : [];
    rawRequirementIds.forEach((requirementId, requirementIndex) => {
      if (typeof requirementId !== "string") {
        issues.push({
          code: "invalid_requirement_reference",
          message: "Requirement references must be strings",
          path: `${path}.requirement_ids[${requirementIndex}]`,
        });
      }
    });
    const requirementIds = rawRequirementIds.filter(
      (item): item is string => typeof item === "string",
    );

    if (
      typeof id !== "string" ||
      typeof command !== "string" ||
      typeof tool !== "string" ||
      typeof reportPath !== "string" ||
      requirementIds.length === 0
    ) {
      issues.push({
        code: "invalid_check",
        message:
          "A check needs id, command, tool, report_path, and requirement_ids",
        path,
      });
      return;
    }

    if (checkIds.has(id)) {
      issues.push({
        code: "duplicate_check_id",
        message: `Duplicate check ID ${id}`,
        path: `${path}.id`,
      });
    }
    checkIds.add(id);

    if (reportPaths.has(reportPath)) {
      issues.push({
        code: "duplicate_report_path",
        message: `Duplicate report path ${reportPath}`,
        path: `${path}.report_path`,
      });
    }
    reportPaths.add(reportPath);

    const expectedPrefix = artifactRoot ? `${artifactRoot}/reports/` : null;
    if (
      !expectedPrefix ||
      !reportPath.startsWith(expectedPrefix) ||
      reportPath.includes("..") ||
      !reportPath.endsWith(".json")
    ) {
      issues.push({
        code: "invalid_report_path",
        message: "Report paths must be unique JSON files under artifact_root/reports",
        path: `${path}.report_path`,
      });
    }

    issues.push(
      ...validateRequirementReferences({
        knownIds,
        references: [
          {
            source: path,
            requirementIds,
          },
        ],
      }),
    );

    checks.push({ id, command, tool, reportPath, requirementIds });
  });

  return {
    artifactRoot,
    fixtureRoot,
    nonWaivableRequirementIds,
    checks,
    issues,
  };
}

export function validateRequirementReferences({
  knownIds,
  references,
}: {
  knownIds: ReadonlySet<string>;
  references: RequirementReference[];
}): ValidationIssue[] {
  return references.flatMap((reference) =>
    reference.requirementIds.flatMap((requirementId, index) =>
      knownIds.has(requirementId)
        ? []
        : [
            {
              code: "unknown_requirement",
              message: `Unknown requirement ID ${requirementId}`,
              path: `${reference.source}.requirement_ids[${index}]`,
            },
          ],
    ),
  );
}

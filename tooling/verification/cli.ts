import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";

import { parse } from "yaml";

import {
  evaluateProductCatalogManifest,
  evaluatePublicRuntime,
  evaluateSourceBoundaries,
} from "./architecture";
import { validateEvidenceManifest } from "./evidence-manifest";
import { evaluatePerformanceRegression } from "./performance-regression";
import { writeVerificationReport } from "./report";
import {
  parseRequirementRegister,
  parseVerificationChecks,
  type ValidationIssue,
  type VerificationCheck,
} from "./requirements";

const requirementsPath = "docs/specification/requirements.yaml";
const checksPath = "verification/checks.yaml";
const evidenceTemplatePath = "docs/specification/evidence-template.yaml";

function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

function loadConfiguration() {
  const register = parseRequirementRegister(readUtf8(requirementsPath));
  const checks = parseVerificationChecks(
    readUtf8(checksPath),
    register.requirementIds,
  );
  return { register, checks };
}

function getCheck(id: string): VerificationCheck {
  const { checks } = loadConfiguration();
  const check = checks.checks.find((item) => item.id === id);
  if (!check) throw new Error(`Unknown verification check ${id}`);
  return check;
}

function packageVersion(name: string): string {
  if (name === "vanta-verification") {
    return JSON.parse(readUtf8("package.json")).version as string;
  }

  const packagePath = join("node_modules", ...name.split("/"), "package.json");
  try {
    return JSON.parse(readUtf8(packagePath)).version as string;
  } catch {
    return "unknown";
  }
}

const toolPackages: Record<string, string> = {
  ajv: "ajv",
  eslint: "eslint",
  next: "next",
  playwright: "@playwright/test",
  typescript: "typescript",
  vitest: "vitest",
  yaml: "yaml",
  "vanta-verification": "vanta-verification",
};

function toolVersions(tool: string): Record<string, string> {
  const packageManager = JSON.parse(readUtf8("package.json"))
    .packageManager as string;
  return {
    node: process.versions.node,
    pnpm: packageManager.replace(/^pnpm@/, ""),
    next: packageVersion("next"),
    [tool]: packageVersion(toolPackages[tool] ?? tool),
  };
}

function gitValue(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function reportResult({
  check,
  startedAt,
  status,
  summary,
  issues,
}: {
  check: VerificationCheck;
  startedAt: string;
  status: "pass" | "fail";
  summary: Record<string, unknown>;
  issues: ValidationIssue[];
}): void {
  writeVerificationReport(check.reportPath, {
    checkId: check.id,
    command: check.command,
    commit: gitValue(["rev-parse", "HEAD"]),
    dirty: gitValue(["status", "--porcelain"]) !== "",
    startedAt,
    completedAt: new Date().toISOString(),
    status,
    requirementIds: check.requirementIds,
    tools: toolVersions(check.tool),
    summary,
    issues,
  });
}

function printIssues(issues: ValidationIssue[]): void {
  issues.forEach((issue) => {
    console.error(`${issue.path}: ${issue.message} [${issue.code}]`);
  });
}

function validateRequirements(): number {
  const startedAt = new Date().toISOString();
  const { register, checks } = loadConfiguration();
  const issues = [...register.issues, ...checks.issues];
  const check =
    checks.checks.find((item) => item.id === "requirement-references") ??
    getCheck("requirement-references");

  reportResult({
    check,
    startedAt,
    status: issues.length === 0 ? "pass" : "fail",
    summary: {
      requirementCount: register.requirementIds.size,
      checkCount: checks.checks.length,
      inputs: [requirementsPath, checksPath],
    },
    issues,
  });
  printIssues(issues);
  return issues.length === 0 ? 0 : 1;
}

function listYamlFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? listYamlFiles(path) : [path];
    })
    .filter((path) => /\.ya?ml$/i.test(path));
}

function validateEvidence(paths: string[]): number {
  const startedAt = new Date().toISOString();
  const { register, checks } = loadConfiguration();
  const inputs =
    paths.length > 0
      ? paths
      : [evidenceTemplatePath, ...listYamlFiles("evidence/manifests")];
  const issues: ValidationIssue[] = [];

  inputs.forEach((path) => {
    try {
      const manifest = parse(readUtf8(path)) as unknown;
      validateEvidenceManifest(
        manifest,
        register.requirementIds,
        checks.nonWaivableRequirementIds,
      ).forEach((issue) => {
          issues.push({ ...issue, path: `${path}:${issue.path}` });
        },
      );
    } catch (error) {
      issues.push({
        code: "invalid_yaml",
        message: error instanceof Error ? error.message : "Invalid YAML",
        path,
      });
    }
  });

  const check = getCheck("evidence-manifest");
  reportResult({
    check,
    startedAt,
    status: issues.length === 0 ? "pass" : "fail",
    summary: { inputs: inputs.map((path) => relative(".", path)) },
    issues,
  });
  printIssues(issues);
  return issues.length === 0 ? 0 : 1;
}

function validatePerformance(path: string): number {
  const startedAt = new Date().toISOString();
  const check = getCheck("performance-regression");
  let input: unknown;
  try {
    input = JSON.parse(readUtf8(path));
  } catch (error) {
    const issues = [
      {
        code: "invalid_json",
        message:
          error instanceof Error ? error.message : "Invalid performance JSON",
        path,
      },
    ];
    reportResult({
      check,
      startedAt,
      status: "fail",
      summary: { input: relative(".", path) },
      issues,
    });
    printIssues(issues);
    return 1;
  }

  const result = evaluatePerformanceRegression(input);
  reportResult({
    check,
    startedAt,
    status: result.status,
    summary: {
      input: relative(".", path),
      baselineMedian: result.baselineMedian,
      candidateMedian: result.candidateMedian,
      regressionPercent: result.regressionPercent,
      thresholdPercent: result.thresholdPercent,
      approval: result.approval ?? null,
    },
    issues: result.issues,
  });
  printIssues(result.issues);
  return result.status === "pass" ? 0 : 1;
}

function runArchitectureCheck(
  checkId: string,
  evaluate: (root: string) => {
    status: "pass" | "fail";
    summary: Record<string, unknown>;
    issues: ValidationIssue[];
  },
): number {
  const startedAt = new Date().toISOString();
  const check = getCheck(checkId);
  const result = evaluate(process.cwd());
  reportResult({ check, startedAt, ...result });
  printIssues(result.issues);
  return result.status === "pass" ? 0 : 1;
}

function runCheck(checkId: string, command: string[]): number {
  if (command.length === 0) throw new Error("A command is required after --");
  const startedAt = new Date().toISOString();
  const check = getCheck(checkId);
  const result = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
    env: process.env,
  });
  const exitCode = result.status ?? 1;
  const issues: ValidationIssue[] =
    exitCode === 0
      ? []
      : [
          {
            code: "command_failed",
            message: `Command exited with code ${exitCode}`,
            path: "$",
          },
        ];

  reportResult({
    check,
    startedAt,
    status: exitCode === 0 ? "pass" : "fail",
    summary: {
      exitCode,
      executedCommand: command.join(" "),
      signal: result.signal,
    },
    issues,
  });
  return exitCode;
}

function usage(): never {
  throw new Error(
    "Usage: cli.ts requirements | evidence [manifest ...] | performance <input.json> | product-catalog | boundaries | public-runtime | run <check-id> -- <command ...>",
  );
}

function main(): number {
  const [subcommand, ...args] = process.argv.slice(2);
  switch (subcommand) {
    case "requirements":
      return validateRequirements();
    case "evidence":
      return validateEvidence(args);
    case "performance":
      return args[0] ? validatePerformance(args[0]) : usage();
    case "product-catalog":
      return runArchitectureCheck(
        "product-catalog-manifest",
        evaluateProductCatalogManifest,
      );
    case "boundaries":
      return runArchitectureCheck(
        "architecture-boundaries",
        evaluateSourceBoundaries,
      );
    case "public-runtime":
      return runArchitectureCheck("public-runtime-scan", evaluatePublicRuntime);
    case "run": {
      const separator = args.indexOf("--");
      if (!args[0] || separator === -1) return usage();
      return runCheck(args[0], args.slice(separator + 1));
    }
    default:
      return usage();
  }
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

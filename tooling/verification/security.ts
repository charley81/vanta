import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import type { ValidationIssue } from "./requirements";

export type SecurityIssue = ValidationIssue;

type CredentialDetector = {
  code: string;
  pattern: RegExp;
};

const MAXIMUM_TEXT_FILE_BYTES = 10 * 1024 * 1024;
const CREDENTIAL_DETECTORS: readonly CredentialDetector[] = [
  {
    code: "private_key",
    pattern: /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/gu,
  },
  { code: "aws_access_key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu },
  {
    code: "github_token",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{80,255})\b/gu,
  },
  {
    code: "google_api_key",
    pattern: /\bAIza[A-Za-z0-9_-]{35}\b/gu,
  },
  {
    code: "slack_token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,255}\b/gu,
  },
  {
    code: "stripe_live_key",
    pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,255}\b/gu,
  },
  {
    code: "netlify_token",
    pattern: /\bnfp_[A-Za-z0-9_-]{32,255}\b/gu,
  },
  {
    code: "hardcoded_application_secret",
    pattern:
      /\b(?:SANITY_API_READ_TOKEN|SANITY_WEBHOOK_SECRET|EDITORIAL_PREVIEW_SESSION_SECRET|BAG_SIGNING_KEYS)\b\s*(?:=|:)\s*["'][A-Za-z0-9+/_=-]{24,256}["']/gu,
  },
];
const PRIVATE_BROWSER_BINDING =
  /\b(?:SANITY_API_READ_TOKEN|SANITY_WEBHOOK_SECRET|EDITORIAL_PREVIEW_SESSION_SECRET|BAG_SIGNING_KEYS)\b/gu;

function normalizedPath(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function readTextFile(path: string): string | null {
  let bytes: Buffer;
  try {
    if (!statSync(path).isFile() || statSync(path).size > MAXIMUM_TEXT_FILE_BYTES) {
      return null;
    }
    bytes = readFileSync(path);
  } catch {
    return null;
  }
  if (bytes.includes(0)) return null;
  return bytes.toString("utf8");
}

function scanCredentials(path: string, text: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const detector of CREDENTIAL_DETECTORS) {
    detector.pattern.lastIndex = 0;
    if (detector.pattern.test(text)) {
      issues.push({
        code: detector.code,
        message: `Potential ${detector.code.replaceAll("_", " ")} detected; the matched value is intentionally omitted.`,
        path,
      });
    }
  }
  return issues;
}

export function inspectRepositorySecrets(
  root: string,
  relativePaths: readonly string[],
): SecurityIssue[] {
  const absoluteRoot = resolve(root);
  const issues: SecurityIssue[] = [];
  for (const candidate of relativePaths) {
    const absolutePath = resolve(absoluteRoot, candidate);
    if (
      absolutePath !== absoluteRoot &&
      !absolutePath.startsWith(`${absoluteRoot}${sep}`)
    ) {
      issues.push({
        code: "invalid_scan_path",
        message: "The secret scan refused a path outside the repository root.",
        path: candidate,
      });
      continue;
    }
    const text = readTextFile(absolutePath);
    if (text === null) continue;
    issues.push(...scanCredentials(normalizedPath(absoluteRoot, absolutePath), text));
  }
  return issues.sort((left, right) =>
    `${left.path}:${left.code}`.localeCompare(`${right.path}:${right.code}`),
  );
}

function filesRecursively(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesRecursively(path) : [path];
  });
}

export function inspectProductionOutput(root: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const configPath = join(root, "next.config.ts");
  const config = readTextFile(configPath);
  if (!config || !/\bproductionBrowserSourceMaps\s*:\s*false\b/u.test(config)) {
    issues.push({
      code: "browser_source_maps_enabled",
      message:
        "next.config.ts must explicitly disable production browser source maps.",
      path: "next.config.ts",
    });
  }

  const outputRoot = join(root, ".next");
  const staticRoot = join(outputRoot, "static");
  if (!existsSync(staticRoot)) {
    issues.push({
      code: "production_output_missing",
      message: "Build the production application before scanning browser output.",
      path: ".next/static",
    });
    return issues;
  }

  for (const absolutePath of filesRecursively(outputRoot)) {
    const text = readTextFile(absolutePath);
    if (text === null) continue;
    issues.push(
      ...scanCredentials(normalizedPath(root, absolutePath), text),
    );
  }

  for (const browserRoot of [staticRoot, join(root, "public")]) {
    for (const absolutePath of filesRecursively(browserRoot)) {
      const path = normalizedPath(root, absolutePath);
      if (absolutePath.endsWith(".map")) {
        issues.push({
          code: "browser_source_map_file",
          message: "A browser source-map file is present in production output.",
          path,
        });
      }
      const text = readTextFile(absolutePath);
      if (text === null) continue;
      if (/\bsourceMappingURL\s*=/u.test(text)) {
        issues.push({
          code: "browser_source_map_reference",
          message: "A browser bundle references a source map.",
          path,
        });
      }
      PRIVATE_BROWSER_BINDING.lastIndex = 0;
      if (PRIVATE_BROWSER_BINDING.test(text)) {
        issues.push({
          code: "private_binding_in_browser_output",
          message:
            "A private server binding name is present in a production browser bundle.",
          path,
        });
      }
      if (browserRoot !== staticRoot) {
        issues.push(...scanCredentials(path, text));
      }
    }
  }

  return issues.sort((left, right) =>
    `${left.path}:${left.code}`.localeCompare(`${right.path}:${right.code}`),
  );
}

type AuditEvaluation = {
  status: "pass" | "fail";
  summary: Record<string, unknown>;
  issues: SecurityIssue[];
};

export function evaluatePnpmAuditReport(report: unknown): AuditEvaluation {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return invalidAuditReport();
  }
  const metadata = (report as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return invalidAuditReport();
  }
  const candidate = metadata as {
    dependencies?: unknown;
    vulnerabilities?: unknown;
  };
  const vulnerabilities = candidate.vulnerabilities;
  if (
    !vulnerabilities ||
    typeof vulnerabilities !== "object" ||
    Array.isArray(vulnerabilities) ||
    !Number.isSafeInteger(candidate.dependencies) ||
    (candidate.dependencies as number) < 0
  ) {
    return invalidAuditReport();
  }

  const counts = vulnerabilities as Record<string, unknown>;
  const severities = ["info", "low", "moderate", "high", "critical"] as const;
  if (
    !severities.every(
      (severity) =>
        Number.isSafeInteger(counts[severity] ?? 0) &&
        (counts[severity] as number | undefined ?? 0) >= 0,
    )
  ) {
    return invalidAuditReport();
  }

  const summary = {
    dependencies: candidate.dependencies,
    vulnerabilities: Object.fromEntries(
      severities.map((severity) => [severity, counts[severity] ?? 0]),
    ),
  };
  const critical = (counts.critical as number | undefined) ?? 0;
  const issues: SecurityIssue[] =
    critical === 0
      ? []
      : [
          {
            code: "critical_vulnerability",
            message: `${critical} critical dependency vulnerability${critical === 1 ? "" : "ies"} must be resolved.`,
            path: "pnpm-lock.yaml",
          },
        ];
  return {
    status: issues.length === 0 ? "pass" : "fail",
    summary,
    issues,
  };
}

function invalidAuditReport(): AuditEvaluation {
  return {
    status: "fail",
    summary: {},
    issues: [
      {
        code: "invalid_audit_report",
        message: "pnpm audit did not return a complete vulnerability summary.",
        path: "pnpm-lock.yaml",
      },
    ],
  };
}

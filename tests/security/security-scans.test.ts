import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  evaluatePnpmAuditReport,
  inspectProductionOutput,
  inspectRepositorySecrets,
} from "@/tooling/verification/security";

const temporaryRoots: string[] = [];

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "vanta-security-"));
  temporaryRoots.push(root);
  for (const [path, contents] of Object.entries(files)) {
    const destination = join(root, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, contents, "utf8");
  }
  return root;
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => rmSync(root, { recursive: true }));
});

describe("repository secret scan", () => {
  it("reports high-confidence credentials without treating documented placeholders as secrets", () => {
    const root = project({
      "safe.txt": "SANITY_API_READ_TOKEN=<configured in Netlify>",
      "unsafe.txt": [
        `github=${"ghp_"}${"a".repeat(36)}`,
        `aws=${"AKIA"}${"A".repeat(16)}`,
        `stripe=${"sk_live_"}${"b".repeat(24)}`,
        `SANITY_WEBHOOK_SECRET=${JSON.stringify("randomApplicationSecret1234567890")}`,
      ].join("\n"),
    });

    const issues = inspectRepositorySecrets(root, ["safe.txt", "unsafe.txt"]);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "github_token", path: "unsafe.txt" }),
        expect.objectContaining({ code: "aws_access_key", path: "unsafe.txt" }),
        expect.objectContaining({ code: "stripe_live_key", path: "unsafe.txt" }),
        expect.objectContaining({
          code: "hardcoded_application_secret",
          path: "unsafe.txt",
        }),
      ]),
    );
    expect(issues).toHaveLength(4);
    expect(JSON.stringify(issues)).not.toContain("ghp_");
  });
});

describe("production output security scan", () => {
  it("requires source maps to be disabled explicitly and absent from browser output", () => {
    const root = project({
      "next.config.ts": "export default { productionBrowserSourceMaps: true };",
      ".next/static/chunks/app.js": "console.log('app');\n//# sourceMappingURL=app.js.map",
      ".next/static/chunks/app.js.map": "{}",
      "public/vendor.js.map": "{}",
    });

    const issues = inspectProductionOutput(root);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "browser_source_maps_enabled" }),
        expect.objectContaining({
          code: "browser_source_map_file",
          path: ".next/static/chunks/app.js.map",
        }),
        expect.objectContaining({
          code: "browser_source_map_file",
          path: "public/vendor.js.map",
        }),
        expect.objectContaining({ code: "browser_source_map_reference" }),
      ]),
    );
  });

  it("reports credential material and private binding names in browser bundles", () => {
    const root = project({
      "next.config.ts": "export default { productionBrowserSourceMaps: false };",
      ".next/static/chunks/app.js":
        "const binding='SANITY_API_READ_TOKEN';",
      ".next/server/app.js":
        `const credential='${"github_pat_"}${"a".repeat(82)}';`,
    });

    expect(inspectProductionOutput(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "private_binding_in_browser_output" }),
        expect.objectContaining({
          code: "github_token",
          path: ".next/server/app.js",
        }),
      ]),
    );
  });
});

describe("critical dependency audit", () => {
  it("passes only a complete pnpm audit report with no critical vulnerability", () => {
    expect(
      evaluatePnpmAuditReport({
        metadata: {
          dependencies: 100,
          vulnerabilities: {
            critical: 0,
            high: 2,
            info: 0,
            low: 1,
            moderate: 3,
          },
        },
      }),
    ).toMatchObject({ status: "pass", issues: [] });

    expect(
      evaluatePnpmAuditReport({
        metadata: {
          dependencies: 100,
          vulnerabilities: { critical: 1 },
        },
      }),
    ).toMatchObject({
      status: "fail",
      issues: [expect.objectContaining({ code: "critical_vulnerability" })],
    });

    expect(evaluatePnpmAuditReport({ error: "registry unavailable" })).toMatchObject({
      status: "fail",
      issues: [expect.objectContaining({ code: "invalid_audit_report" })],
    });
  });
});

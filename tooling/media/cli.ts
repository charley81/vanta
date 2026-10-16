import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { parse } from "yaml";

import { buildMedia, mediaPaths, validateApprovedSource, verifyMediaReproducibility } from "./pipeline";
import { sha256 } from "./glb";
import { writeVerificationReport } from "../verification/report";
const root = process.cwd();

type VerificationCheck = {
  id: string;
  command: string;
  tool: string;
  reportPath: string;
  requirementIds: string[];
};

type RawCheckConfiguration = {
  checks: Array<{
    id: string;
    command: string;
    tool: string;
    report_path: string;
    requirement_ids: string[];
  }>;
};

function gitValue(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function getCheck(id: string): VerificationCheck {
  const configuration = parse(
    readFileSync("verification/checks.yaml", "utf8"),
  ) as RawCheckConfiguration;
  const check = configuration.checks.find((item) => item.id === id);
  if (!check) throw new Error(`Unknown verification check ${id}`);
  return {
    id: check.id,
    command: check.command,
    tool: check.tool,
    reportPath: check.report_path,
    requirementIds: check.requirement_ids,
  };
}

function report(
  id: string,
  startedAt: string,
  status: "pass" | "fail",
  summary: Record<string, unknown>,
  issues: Array<{ code: string; message: string; path: string }>,
): void {
  const check = getCheck(id);
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    packageManager: string;
  };
  writeVerificationReport(check.reportPath, {
    checkId: check.id,
    command: check.command,
    commit: gitValue(["rev-parse", "HEAD"]),
    dirty: gitValue(["status", "--porcelain"]) !== "",
    startedAt,
    completedAt: new Date().toISOString(),
    status,
    requirementIds: check.requirementIds,
    tools: {
      node: process.versions.node,
      pnpm: packageJson.packageManager.replace(/^pnpm@/, ""),
      "vanta-media": "1.0.0",
    },
    summary,
    issues,
  });
}

async function validate(): Promise<number> {
  const startedAt = new Date().toISOString();
  const result = await validateApprovedSource(root);
  report("media-source-validation", startedAt, result.status, {
    source: "media/source/VANTA_MONOLITH_v03D.glb",
    validator: result.validator,
    stats: result.stats,
    imageAllocations: result.imageAllocations,
    decodedTextureBytes: result.decodedTextureBytes,
    renderTargetBytes: result.renderTargetBytes,
    estimatedGpuBytes: result.estimatedGpuBytes,
  }, result.issues);
  result.issues.forEach((issue) => console.error(`${issue.path}: ${issue.message} [${issue.code}]`));
  return result.status === "pass" ? 0 : 1;
}

async function build(): Promise<number> {
  const generated = await buildMedia(root);
  console.log(`Generated ${generated.outputs.length} governed derivatives.`);
  console.log(`${mediaPaths.derivativeManifest}\n${mediaPaths.mediaManifest}`);
  return 0;
}

async function verify(): Promise<number> {
  const startedAt = new Date().toISOString();
  const result = await verifyMediaReproducibility(root);
  const { generated } = result;
  const derivativeManifestBytes = readFileSync(mediaPaths.derivativeManifest);
  const mediaManifestBytes = readFileSync(mediaPaths.mediaManifest);
  const browserModel = generated.outputs.find((output) => output.kind === "browser-model");
  const motionAssets = generated.outputs.filter((output) =>
    output.mediaType.startsWith("video/"),
  );
  const config = JSON.parse(readFileSync(mediaPaths.config, "utf8")) as {
    budgets: {
      singleMotionBytes: number;
      decodedTextureBytes: number;
      estimatedGpuBytes: number;
    };
    browserModel: { maxBytes: number };
  };
  const budgetIssues = [
    ...(browserModel && browserModel.bytes > config.browserModel.maxBytes
      ? [{ code: "runtime_glb_budget", message: "Runtime GLB exceeds its ceiling", path: browserModel.path }]
      : []),
    ...motionAssets
      .filter((output) => output.bytes > config.budgets.singleMotionBytes)
      .map((output) => ({ code: "motion_budget", message: "Motion output exceeds its ceiling", path: output.path })),
    ...(generated.sourceValidation.decodedTextureBytes > config.budgets.decodedTextureBytes
      ? [{ code: "decoded_texture_budget", message: "Decoded textures exceed their ceiling", path: "resourceEstimate.decodedTextureBytes" }]
      : []),
    ...(generated.sourceValidation.estimatedGpuBytes > config.budgets.estimatedGpuBytes
      ? [{ code: "gpu_resource_budget", message: "Estimated GPU resources exceed their ceiling", path: "resourceEstimate.estimatedGpuBytes" }]
      : []),
  ];

  report("media-source-validation", startedAt, generated.sourceValidation.status, {
    source: "media/source/VANTA_MONOLITH_v03D.glb",
    validator: generated.sourceValidation.validator,
    stats: generated.sourceValidation.stats,
    imageAllocations: generated.sourceValidation.imageAllocations,
    decodedTextureBytes: generated.sourceValidation.decodedTextureBytes,
    renderTargetBytes: generated.sourceValidation.renderTargetBytes,
    estimatedGpuBytes: generated.sourceValidation.estimatedGpuBytes,
  }, generated.sourceValidation.issues);
  report("media-derivative-manifests", startedAt, result.status, {
    derivativeManifest: { path: mediaPaths.derivativeManifest, sha256: sha256(derivativeManifestBytes) },
    mediaManifest: { path: mediaPaths.mediaManifest, sha256: sha256(mediaManifestBytes) },
    outputs: generated.outputs.length,
    visualComparison: mediaPaths.comparison,
  }, result.issues);
  report("media-reproducibility", startedAt, result.status, {
    comparedOutputs: generated.outputs.length,
    manifests: [mediaPaths.derivativeManifest, mediaPaths.mediaManifest],
    cleanStagingRun: true,
  }, result.issues);
  report("media-resource-budgets", startedAt, budgetIssues.length === 0 ? "pass" : "fail", {
    runtimeGlbBytes: browserModel?.bytes ?? null,
    runtimeGlbMaxBytes: config.browserModel.maxBytes,
    motionVariantCount: motionAssets.length,
    motionVariantMaxBytes: config.budgets.singleMotionBytes,
    decodedTextureBytes: generated.sourceValidation.decodedTextureBytes,
    decodedTextureMaxBytes: config.budgets.decodedTextureBytes,
    renderTargetBytes: generated.sourceValidation.renderTargetBytes,
    estimatedGpuBytes: generated.sourceValidation.estimatedGpuBytes,
    estimatedGpuMaxBytes: config.budgets.estimatedGpuBytes,
  }, budgetIssues);

  [...result.issues, ...budgetIssues].forEach((issue) =>
    console.error(`${issue.path}: ${issue.message} [${issue.code}]`),
  );
  return result.status === "pass" && budgetIssues.length === 0 ? 0 : 1;
}

async function main(): Promise<number> {
  const command = process.argv[2];
  switch (command) {
    case "validate":
      return validate();
    case "build":
      return build();
    case "verify":
      return verify();
    default:
      throw new Error("Usage: tooling/media/cli.ts validate | build | verify");
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });

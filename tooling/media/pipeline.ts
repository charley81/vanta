import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

import { validateBytes, version as validatorVersion, type ValidationMessage } from "gltf-validator";
import sharp from "sharp";

import {
  calculateSceneStats,
  hasNamedAncestor,
  parseGlb,
  sha256,
  type SceneStats,
  type Vec3,
} from "./glb";
import {
  encodeResponsiveVariant,
  renderGlbToPng,
  type CameraSpecification,
  type LightSpecification,
} from "./renderer";

export type ValidationIssue = {
  code: string;
  message: string;
  path: string;
};

type PipelineConfiguration = {
  schemaVersion: number;
  pipelineVersion: string;
  source: {
    path: string;
    sha256: string;
    byteLength: number;
    acceptedValidatorFindings: Array<{
      code: string;
      pointer: string;
      rationale: string;
    }>;
    expected: Omit<SceneStats, "geometryBytes" | "textures"> & { bounds: { min: Vec3; max: Vec3 } };
  };
  requiredControls: Array<{ name: string; ancestor: string }>;
  browserModel: {
    path: string;
    maxBytes: number;
    expected: {
      sha256: string;
      byteLength: number;
      namedNodes: number;
      triangles: number;
      drawCalls: number;
      materials: number;
      images: number;
    };
    derivation: { tool: string; version: string; command: string[] };
  };
  budgets: {
    singleMotionBytes: number;
    decodedTextureBytes: number;
    estimatedGpuBytes: number;
    gpuEstimate: {
      referenceViewport: { width: number; height: number; dpr: number };
      colorBuffers: number;
      bytesPerColorPixel: number;
      bytesPerDepthStencilPixel: number;
    };
  };
  renders: RenderSpecification[];
};

type RenderSpecification = {
  id: string;
  purpose: string;
  master: { path: string; width: number; height: number };
  camera: CameraSpecification;
  light: LightSpecification;
  crop: { fit: "cover" | "contain"; anchor: string; aspectRatio: string };
  variants: Array<{
    format: "avif" | "webp";
    width: number;
    quality: number;
  }>;
};

type OutputRecord = {
  id: string;
  kind: "browser-model" | "offline-master" | "responsive-still" | "visual-comparison";
  path: string;
  sha256: string;
  bytes: number;
  mediaType: string;
  width?: number;
  height?: number;
  properties: Record<string, unknown>;
  provenance: {
    sourceSha256: string;
    pipelineVersion: string;
    camera: CameraSpecification | { applicability: string };
    light: LightSpecification | { applicability: string };
    crop: RenderSpecification["crop"] | { applicability: string };
  };
};

export type SourceValidation = {
  status: "pass" | "fail";
  issues: ValidationIssue[];
  validator: {
    version: string;
    errors: number;
    warnings: number;
    infos: number;
    hints: number;
    acceptedFindings: Array<ValidationMessage & { rationale: string }>;
  };
  stats: SceneStats;
  decodedTextureBytes: number;
  renderTargetBytes: number;
  estimatedGpuBytes: number;
  imageAllocations: Array<{
    name: string;
    width: number;
    height: number;
    baseBytes: number;
    mipmappedBytes: number;
  }>;
};

export type GeneratedMedia = {
  derivativeManifest: Record<string, unknown>;
  mediaManifest: Record<string, unknown>;
  sourceValidation: SourceValidation;
  outputs: OutputRecord[];
};

export type PortableImageComparison = {
  path: string;
  meanAbsoluteChannelDifference: number;
  maximumChannelDifference: number;
  changedChannelRatio: number;
  encodedSizeDeltaRatio: number;
  dimensionsMatch: boolean;
};

export const PORTABLE_AVIF_TOLERANCE = {
  meanAbsoluteChannelDifference: 0.3,
  maximumChannelDifference: 48,
  changedChannelRatio: 0.15,
  encodedSizeDeltaRatio: 0.15,
} as const;

export function isPortableAvifEquivalent(
  comparison: PortableImageComparison,
): boolean {
  return (
    comparison.dimensionsMatch &&
    comparison.meanAbsoluteChannelDifference <=
      PORTABLE_AVIF_TOLERANCE.meanAbsoluteChannelDifference &&
    comparison.maximumChannelDifference <=
      PORTABLE_AVIF_TOLERANCE.maximumChannelDifference &&
    comparison.changedChannelRatio <= PORTABLE_AVIF_TOLERANCE.changedChannelRatio &&
    comparison.encodedSizeDeltaRatio <=
      PORTABLE_AVIF_TOLERANCE.encodedSizeDeltaRatio
  );
}

export const APPROVED_SOURCE_SHA256 =
  "ccbdb568548e154335b2d8eb147a8f39b9881eb930e2b290e098f419425ca261";

const configPath = "media/pipeline.json";
const derivativeManifestPath = "media/manifests/derivatives.json";
const mediaManifestPath = "media/manifests/media.json";
const comparisonPath = "docs/evidence/issue-59/visual-comparison.webp";

function loadConfiguration(root: string): PipelineConfiguration {
  return JSON.parse(readFileSync(join(root, configPath), "utf8")) as PipelineConfiguration;
}

function closeEnough(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= 0.00001;
}

function compareStats(
  actual: SceneStats,
  expected: PipelineConfiguration["source"]["expected"],
  prefix: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const key of ["namedNodes", "triangles", "drawCalls", "materials", "images"] as const) {
    if (actual[key] !== expected[key]) {
      issues.push({
        code: `unexpected_${key}`,
        message: `Expected ${expected[key]}, received ${actual[key]}`,
        path: `${prefix}.${key}`,
      });
    }
  }
  for (const bound of ["min", "max"] as const) {
    for (let axis = 0; axis < 3; axis += 1) {
      if (!closeEnough(actual.bounds[bound][axis], expected.bounds[bound][axis])) {
        issues.push({
          code: "unexpected_bounds",
          message: `Expected ${expected.bounds[bound][axis]}, received ${actual.bounds[bound][axis]}`,
          path: `${prefix}.bounds.${bound}[${axis}]`,
        });
      }
    }
  }
  return issues;
}

async function textureAllocations(glbPath: string) {
  const glb = parseGlb(glbPath);
  const allocations = [];
  for (const image of glb.json.images ?? []) {
    if (image.bufferView === undefined) {
      throw new Error(`Image ${image.name ?? "unnamed"} is not embedded`);
    }
    if (image.mimeType !== "image/png") {
      throw new Error(`Image ${image.name ?? "unnamed"} is not an approved embedded PNG`);
    }
    const view = glb.json.bufferViews[image.bufferView];
    const start = view.byteOffset ?? 0;
    const encoded = glb.binary.subarray(start, start + view.byteLength);
    const metadata = await sharp(encoded).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error(`Image ${image.name ?? "unnamed"} has no measurable dimensions`);
    }
    const baseBytes = metadata.width * metadata.height * 4;
    allocations.push({
      name: image.name ?? "unnamed",
      width: metadata.width,
      height: metadata.height,
      baseBytes,
      mipmappedBytes: Math.ceil((baseBytes * 4) / 3),
    });
  }
  return allocations;
}

function acceptedFinding(
  message: ValidationMessage,
  config: PipelineConfiguration,
): { rationale: string } | undefined {
  const finding = config.source.acceptedValidatorFindings.find(
    (item) => item.code === message.code && item.pointer === message.pointer,
  );
  return finding ? { rationale: finding.rationale } : undefined;
}

export async function validateApprovedSource(root: string): Promise<SourceValidation> {
  const config = loadConfiguration(root);
  const sourcePath = join(root, config.source.path);
  const glb = parseGlb(sourcePath);
  const stats = calculateSceneStats(glb);
  const issues: ValidationIssue[] = [];

  if (config.source.sha256 !== APPROVED_SOURCE_SHA256) {
    issues.push({
      code: "approved_hash_policy_changed",
      message: "Pipeline configuration does not name the baseline-approved source SHA-256",
      path: `${configPath}:source.sha256`,
    });
  }
  if (sha256(glb.bytes) !== APPROVED_SOURCE_SHA256) {
    issues.push({ code: "source_hash_mismatch", message: "Approved source SHA-256 does not match", path: config.source.path });
  }
  if (glb.bytes.length !== config.source.byteLength) {
    issues.push({ code: "source_size_mismatch", message: "Approved source byte length does not match", path: config.source.path });
  }
  issues.push(...compareStats(stats, config.source.expected, "source"));

  config.requiredControls.forEach(({ name, ancestor }) => {
    if (!hasNamedAncestor(glb.json, name, ancestor)) {
      issues.push({
        code: "required_control_hierarchy",
        message: `${name} must remain below ${ancestor}`,
        path: `source.nodes.${name}`,
      });
    }
  });
  if ((glb.json.materials ?? []).some((material) => !material.name)) {
    issues.push({ code: "unnamed_material", message: "Every source material must be named", path: "source.materials" });
  }

  const validatorReport = await validateBytes(new Uint8Array(glb.bytes), { maxIssues: 1000 });
  const acceptedFindings: Array<ValidationMessage & { rationale: string }> = [];
  validatorReport.issues.messages
    .filter((message) => message.severity === 0)
    .forEach((message) => {
      const accepted = acceptedFinding(message, config);
      if (
        accepted &&
        config.source.sha256 === APPROVED_SOURCE_SHA256 &&
        sha256(glb.bytes) === APPROVED_SOURCE_SHA256
      ) {
        acceptedFindings.push({ ...message, rationale: accepted.rationale });
      } else {
        issues.push({ code: message.code, message: message.message, path: message.pointer });
      }
    });

  const imageAllocations = await textureAllocations(sourcePath);
  const decodedTextureBytes = imageAllocations.reduce((sum, item) => sum + item.mipmappedBytes, 0);
  const gpuEstimate = config.budgets.gpuEstimate;
  const renderWidth = gpuEstimate.referenceViewport.width * gpuEstimate.referenceViewport.dpr;
  const renderHeight = gpuEstimate.referenceViewport.height * gpuEstimate.referenceViewport.dpr;
  const renderTargetBytes = renderWidth * renderHeight * (
    gpuEstimate.colorBuffers * gpuEstimate.bytesPerColorPixel +
    gpuEstimate.bytesPerDepthStencilPixel
  );
  const estimatedGpuBytes = decodedTextureBytes + stats.geometryBytes + renderTargetBytes;
  if (decodedTextureBytes > config.budgets.decodedTextureBytes) {
    issues.push({ code: "decoded_texture_budget", message: "Decoded texture allocation exceeds 32 MiB", path: "budgets.decodedTextureBytes" });
  }
  if (estimatedGpuBytes > config.budgets.estimatedGpuBytes) {
    issues.push({ code: "gpu_resource_budget", message: "Estimated asset GPU resources exceed 96 MiB", path: "budgets.estimatedGpuBytes" });
  }

  return {
    status: issues.length === 0 ? "pass" : "fail",
    issues,
    validator: {
      version: validatorVersion(),
      errors: validatorReport.issues.numErrors,
      warnings: validatorReport.issues.numWarnings,
      infos: validatorReport.issues.numInfos,
      hints: validatorReport.issues.numHints,
      acceptedFindings,
    },
    stats,
    decodedTextureBytes,
    renderTargetBytes,
    estimatedGpuBytes,
    imageAllocations,
  };
}

function runGltfTransform(root: string, args: string[]): void {
  const result = spawnSync("pnpm", ["exec", "gltf-transform", ...args], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`glTF Transform failed: ${result.stderr || result.stdout}`);
  }
}

function outputLocation(root: string, stagingRoot: string | undefined, canonicalPath: string): string {
  return join(stagingRoot ?? root, canonicalPath);
}

async function outputRecord({
  root,
  stagingRoot,
  path,
  id,
  kind,
  properties,
  provenance,
}: {
  root: string;
  stagingRoot?: string;
  path: string;
  id: string;
  kind: OutputRecord["kind"];
  properties: Record<string, unknown>;
  provenance: OutputRecord["provenance"];
}): Promise<OutputRecord> {
  const actualPath = outputLocation(root, stagingRoot, path);
  const bytes = readFileSync(actualPath);
  const record: OutputRecord = {
    id,
    kind,
    path,
    sha256: sha256(bytes),
    bytes: bytes.length,
    mediaType: path.endsWith(".glb")
      ? "model/gltf-binary"
      : path.endsWith(".avif")
        ? "image/avif"
        : path.endsWith(".webp")
          ? "image/webp"
          : "image/png",
    properties,
    provenance,
  };
  if (!path.endsWith(".glb")) {
    const metadata = await sharp(actualPath).metadata();
    record.width = metadata.width;
    record.height = metadata.height;
  }
  return record;
}

function responsivePath(render: RenderSpecification, variant: RenderSpecification["variants"][number]): string {
  return `public/media/stills/${render.id}-${variant.width}.${variant.format}`;
}

async function buildVisualComparison({
  root,
  stagingRoot,
  sourceGlbPath,
  runtimeGlbPath,
  renders,
}: {
  root: string;
  stagingRoot?: string;
  sourceGlbPath: string;
  runtimeGlbPath: string;
  renders: RenderSpecification[];
}): Promise<void> {
  const source = parseGlb(sourceGlbPath);
  const runtime = parseGlb(runtimeGlbPath);
  const tileWidth = 400;
  const tileHeight = 250;
  const rows: Buffer[] = [];
  const temporary = mkdtempSync(join(tmpdir(), "vanta-visual-"));
  try {
    for (const render of renders) {
      const sourcePath = join(temporary, `${render.id}-source.png`);
      const runtimePath = join(temporary, `${render.id}-runtime.png`);
      await renderGlbToPng({ glb: source, camera: render.camera, light: render.light, width: tileWidth, height: tileHeight, outputPath: sourcePath });
      await renderGlbToPng({ glb: runtime, camera: render.camera, light: render.light, width: tileWidth, height: tileHeight, outputPath: runtimePath });
      rows.push(await sharp({
        create: { width: 800, height: tileHeight, channels: 3, background: "#0f0905" },
      })
        .composite([
          { input: sourcePath, top: 0, left: 0 },
          { input: runtimePath, top: 0, left: tileWidth },
        ])
        .webp({ quality: 88, effort: 6 })
        .toBuffer());
    }
    const target = outputLocation(root, stagingRoot, comparisonPath);
    mkdirSync(dirname(target), { recursive: true });
    await sharp({
      create: {
        width: tileWidth * 2,
        height: rows.length * tileHeight,
        channels: 3,
        background: "#0f0905",
      },
    })
      .composite(rows.map((input, index) => ({ input, top: index * tileHeight, left: 0 })))
      .webp({ quality: 90, effort: 6 })
      .toFile(target);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export async function generateMedia(root: string, stagingRoot?: string): Promise<GeneratedMedia> {
  const config = loadConfiguration(root);
  const sourceValidation = await validateApprovedSource(root);
  if (sourceValidation.status === "fail") {
    throw new Error(`Approved source validation failed: ${JSON.stringify(sourceValidation.issues)}`);
  }

  const sourcePath = join(root, config.source.path);
  const browserPath = outputLocation(root, stagingRoot, config.browserModel.path);
  mkdirSync(dirname(browserPath), { recursive: true });
  const command = config.browserModel.derivation.command.map((part) =>
    part === "{source}" ? sourcePath : part === "{output}" ? browserPath : part,
  );
  runGltfTransform(root, command);

  const browserBytes = readFileSync(browserPath);
  if (browserBytes.length > config.browserModel.maxBytes) {
    throw new Error(`Browser GLB exceeds ${config.browserModel.maxBytes} bytes`);
  }
  if (
    browserBytes.length !== config.browserModel.expected.byteLength ||
    sha256(browserBytes) !== config.browserModel.expected.sha256
  ) {
    throw new Error("Browser GLB does not reproduce the accepted Meshopt derivative");
  }
  const browserValidator = await validateBytes(new Uint8Array(browserBytes), { maxIssues: 1000 });
  if (browserValidator.issues.numErrors > 0) {
    throw new Error(`Browser GLB validation failed: ${JSON.stringify(browserValidator.issues.messages)}`);
  }

  const working = mkdtempSync(join(tmpdir(), "vanta-media-"));
  const decompressedPath = join(working, "runtime-decompressed.glb");
  try {
    runGltfTransform(root, ["copy", browserPath, decompressedPath]);
    const runtimeGlb = parseGlb(decompressedPath);
    const runtimeStats = calculateSceneStats(runtimeGlb);
    const structureIssues = compareStats(runtimeStats, {
      ...config.browserModel.expected,
      bounds: config.source.expected.bounds,
    }, "browserModel");
    const sourceNames = parseGlb(sourcePath).json.nodes.map((node) => node.name ?? "");
    const runtimeNames = runtimeGlb.json.nodes.map((node) => node.name ?? "");
    if (JSON.stringify(runtimeNames) !== JSON.stringify(sourceNames)) {
      structureIssues.push({ code: "node_names_changed", message: "Browser model does not preserve all named nodes in order", path: "browserModel.nodes" });
    }
    config.requiredControls.forEach(({ name, ancestor }) => {
      if (!hasNamedAncestor(runtimeGlb.json, name, ancestor)) {
        structureIssues.push({ code: "required_control_hierarchy", message: `${name} must remain below ${ancestor}`, path: `browserModel.nodes.${name}` });
      }
    });
    if (structureIssues.length > 0) {
      throw new Error(`Browser model structural validation failed: ${JSON.stringify(structureIssues)}`);
    }

    const outputs: OutputRecord[] = [];
    outputs.push(await outputRecord({
      root,
      stagingRoot,
      path: config.browserModel.path,
      id: "runtime-meshopt",
      kind: "browser-model",
      properties: {
        compression: "meshopt",
        namedNodes: runtimeStats.namedNodes,
        triangles: runtimeStats.triangles,
        drawCalls: runtimeStats.drawCalls,
        validatorErrors: browserValidator.issues.numErrors,
        derivation: config.browserModel.derivation,
      },
      provenance: {
        sourceSha256: config.source.sha256,
        pipelineVersion: config.pipelineVersion,
        camera: { applicability: "route-owned runtime camera; not baked into model" },
        light: { applicability: "route-owned runtime lighting; not baked into model" },
        crop: { applicability: "route-owned responsive viewport; not baked into model" },
      },
    }));

    const sourceGlb = parseGlb(sourcePath);
    for (const render of config.renders) {
      const masterPath = outputLocation(root, stagingRoot, render.master.path);
      await renderGlbToPng({
        glb: sourceGlb,
        camera: render.camera,
        light: render.light,
        width: render.master.width,
        height: render.master.height,
        outputPath: masterPath,
      });
      const provenance = {
        sourceSha256: config.source.sha256,
        pipelineVersion: config.pipelineVersion,
        camera: render.camera,
        light: render.light,
        crop: render.crop,
      };
      outputs.push(await outputRecord({
        root,
        stagingRoot,
        path: render.master.path,
        id: `${render.id}-master`,
        kind: "offline-master",
        properties: {
          purpose: render.purpose,
          renderer: `vanta-offline-rasterizer@${config.pipelineVersion}`,
          colorSpace: "sRGB",
          sourceKind: "approved GLB geometry (offline render; not a browser screenshot)",
        },
        provenance,
      }));
      for (const variant of render.variants) {
        const path = responsivePath(render, variant);
        await encodeResponsiveVariant({
          sourcePath: masterPath,
          outputPath: outputLocation(root, stagingRoot, path),
          ...variant,
        });
        outputs.push(await outputRecord({
          root,
          stagingRoot,
          path,
          id: `${render.id}-${variant.width}-${variant.format}`,
          kind: "responsive-still",
          properties: {
            purpose: render.purpose,
            format: variant.format,
            quality: variant.quality,
            master: render.master.path,
            colorSpace: "sRGB",
          },
          provenance,
        }));
      }
    }

    await buildVisualComparison({
      root,
      stagingRoot,
      sourceGlbPath: sourcePath,
      runtimeGlbPath: decompressedPath,
      renders: config.renders,
    });
    outputs.push(await outputRecord({
      root,
      stagingRoot,
      path: comparisonPath,
      id: "source-runtime-visual-comparison",
      kind: "visual-comparison",
      properties: {
        subjects: config.renders.map((render) => render.id),
        left: "approved immutable source",
        right: "decompressed Meshopt derivative",
        reviewStatus: "pending human review",
      },
      provenance: {
        sourceSha256: config.source.sha256,
        pipelineVersion: config.pipelineVersion,
        camera: { applicability: "each row uses the corresponding versioned render camera" },
        light: { applicability: "each row uses the corresponding versioned render lighting" },
        crop: { applicability: "each row uses the corresponding versioned render crop" },
      },
    }));

    const derivativeManifest = {
      schemaVersion: 1,
      pipelineVersion: config.pipelineVersion,
      source: {
        path: config.source.path,
        sha256: config.source.sha256,
        bytes: config.source.byteLength,
        immutable: true,
      },
      generationPolicy: {
        invalidateAllWhenSourceHashChanges: true,
        browserScreenshotsPermittedAsMasters: false,
        figmaHostedAssetsPermittedAsMasters: false,
        donorPrototypeAssetsPermittedAsMasters: false,
        silentGeometryOptimizationPermitted: false,
      },
      toolchain: {
        node: process.versions.node,
        gltfTransform: config.browserModel.derivation.version,
        gltfValidator: validatorVersion(),
        sharp: sharp.versions.sharp,
        libvips: sharp.versions.vips,
        offlineRenderer: config.pipelineVersion,
      },
      budgets: config.budgets,
      resourceEstimate: {
        decodedTextureBytes: sourceValidation.decodedTextureBytes,
        geometryBytes: sourceValidation.stats.geometryBytes,
        renderTargetBytes: sourceValidation.renderTargetBytes,
        estimatedGpuBytes: sourceValidation.estimatedGpuBytes,
        remainingBudgetHeadroomBytes:
          config.budgets.estimatedGpuBytes - sourceValidation.estimatedGpuBytes,
        methodology:
          "Unique source geometry buffer views, RGBA8 texture allocation with a full 4/3 mip chain, and the configured reference viewport's double color buffer plus depth/stencil target",
      },
      motion: {
        variants: [],
        rationale: "No authored motion variant is required by the current route contracts; Home and Synth use realtime enhancement over these stable authored posters.",
        maxSingleVariantBytes: config.budgets.singleMotionBytes,
      },
      outputs,
    };

    const publicAssets = outputs
      .filter((output) => output.path.startsWith("public/"))
      .map((output) => ({
        id: output.id,
        path: output.path.replace(/^public/, ""),
        sha256: output.sha256,
        bytes: output.bytes,
        mediaType: output.mediaType,
        width: output.width,
        height: output.height,
      }));
    const mediaManifest = {
      schemaVersion: 1,
      pipelineVersion: config.pipelineVersion,
      sourceSha256: config.source.sha256,
      ownership: {
        runtimeModel: "code",
        generatedStills: "code pipeline outputs prepared for reviewed Sanity publication",
        layoutAndCropAuthority: "Figma final regions via versioned crop specifications",
      },
      routeUsage: {
        home: { poster: "/media/stills/home-poster-1440.avif", runtimeModel: "/media/models/VANTA_MONOLITH_runtime_meshopt.glb" },
        product: { hero: "/media/stills/product-hero-1440.avif", morph: "/media/stills/product-morph-1440.avif", runtimeModel: null },
        synth: { poster: "/media/stills/synth-poster-1440.avif", runtimeModel: "/media/models/VANTA_MONOLITH_runtime_meshopt.glb", activation: "explicit qualification boundary" },
      },
      assets: publicAssets,
    };

    return { derivativeManifest, mediaManifest, sourceValidation, outputs };
  } finally {
    rmSync(working, { recursive: true, force: true });
  }
}

function serialized(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

type ManifestAsset = {
  path: string;
  mediaType: string;
  sha256: string;
  bytes: number;
};

function normalizePortableAvifIdentities(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = structuredClone(actual);
  for (const key of ["outputs", "assets"] as const) {
    const actualAssets = normalized[key];
    const expectedAssets = expected[key];
    if (!Array.isArray(actualAssets) || !Array.isArray(expectedAssets)) continue;
    const expectedByPath = new Map(
      (expectedAssets as ManifestAsset[]).map((asset) => [asset.path, asset]),
    );
    for (const asset of actualAssets as ManifestAsset[]) {
      if (asset.mediaType !== "image/avif") continue;
      const expectedAsset = expectedByPath.get(asset.path);
      if (!expectedAsset) continue;
      asset.sha256 = expectedAsset.sha256;
      asset.bytes = expectedAsset.bytes;
    }
  }
  return normalized;
}

async function comparePortableImage(
  committedPath: string,
  regeneratedPath: string,
  path: string,
): Promise<PortableImageComparison> {
  const committedSize = statSync(committedPath).size;
  const regeneratedSize = statSync(regeneratedPath).size;
  const committed = await sharp(committedPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const regenerated = await sharp(regeneratedPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const dimensionsMatch =
    committed.info.width === regenerated.info.width &&
    committed.info.height === regenerated.info.height &&
    committed.info.channels === regenerated.info.channels &&
    committed.data.length === regenerated.data.length;
  let totalDifference = 0;
  let maximumChannelDifference = 0;
  let changedChannels = 0;
  if (dimensionsMatch) {
    for (let index = 0; index < committed.data.length; index += 1) {
      const difference = Math.abs(committed.data[index] - regenerated.data[index]);
      totalDifference += difference;
      maximumChannelDifference = Math.max(maximumChannelDifference, difference);
      if (difference > 0) changedChannels += 1;
    }
  }
  return {
    path,
    meanAbsoluteChannelDifference: dimensionsMatch
      ? totalDifference / committed.data.length
      : Number.POSITIVE_INFINITY,
    maximumChannelDifference: dimensionsMatch
      ? maximumChannelDifference
      : Number.POSITIVE_INFINITY,
    changedChannelRatio: dimensionsMatch
      ? changedChannels / committed.data.length
      : 1,
    encodedSizeDeltaRatio:
      Math.abs(committedSize - regeneratedSize) / committedSize,
    dimensionsMatch,
  };
}

export async function buildMedia(root: string): Promise<GeneratedMedia> {
  const generated = await generateMedia(root);
  mkdirSync(join(root, dirname(derivativeManifestPath)), { recursive: true });
  writeFileSync(join(root, derivativeManifestPath), serialized(generated.derivativeManifest));
  writeFileSync(join(root, mediaManifestPath), serialized(generated.mediaManifest));
  return generated;
}

export async function verifyMediaReproducibility(root: string): Promise<{
  status: "pass" | "fail";
  issues: ValidationIssue[];
  generated: GeneratedMedia;
  portableImageComparisons: PortableImageComparison[];
}> {
  const stagingRoot = mkdtempSync(join(tmpdir(), "vanta-media-repro-"));
  try {
    const generated = await generateMedia(root, stagingRoot);
    const issues: ValidationIssue[] = [];
    const portableImageComparisons: PortableImageComparison[] = [];
    for (const [path, value] of [
      [derivativeManifestPath, generated.derivativeManifest],
      [mediaManifestPath, generated.mediaManifest],
    ] as const) {
      const expectedText = readFileSync(join(root, path), "utf8");
      const expected = JSON.parse(expectedText) as Record<string, unknown>;
      const actual = serialized(normalizePortableAvifIdentities(value, expected));
      if (expectedText !== actual) {
        issues.push({ code: "manifest_not_reproducible", message: `${path} differs from a clean generated manifest`, path });
      }
    }
    for (const output of generated.outputs) {
      const committedPath = join(root, output.path);
      if (
        statSync(committedPath).size === output.bytes &&
        sha256(readFileSync(committedPath)) === output.sha256
      ) {
        continue;
      }
      if (output.mediaType === "image/avif") {
        const comparison = await comparePortableImage(
          committedPath,
          join(stagingRoot, output.path),
          output.path,
        );
        portableImageComparisons.push(comparison);
        if (isPortableAvifEquivalent(comparison)) continue;
        issues.push({
          code: "portable_image_not_equivalent",
          message: `${output.path} exceeds the cross-platform AVIF tolerance`,
          path: output.path,
        });
        continue;
      }
      issues.push({ code: "output_not_reproducible", message: `${output.path} differs from a clean generated output`, path: output.path });
    }
    return {
      status: issues.length === 0 ? "pass" : "fail",
      issues,
      generated,
      portableImageComparisons,
    };
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }
}

export const mediaPaths = {
  config: configPath,
  derivativeManifest: derivativeManifestPath,
  mediaManifest: mediaManifestPath,
  comparison: comparisonPath,
};

export function relativeMediaPath(root: string, path: string): string {
  return relative(root, path);
}

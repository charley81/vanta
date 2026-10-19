import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { calculateSceneStats, parseGlb, sha256 } from "@/tooling/media/glb";
import {
  isPortableAvifEquivalent,
  PORTABLE_AVIF_TOLERANCE,
  validateApprovedSource,
  type PortableImageComparison,
} from "@/tooling/media/pipeline";

const temporaryRoots: string[] = [];

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
});

describe("governed media pipeline", () => {
  it("recognizes the approved immutable source and its interaction structure", async () => {
    const result = await validateApprovedSource(process.cwd());

    expect(result).toMatchObject({
      status: "pass",
      issues: [],
      stats: {
        namedNodes: 141,
        triangles: 71_744,
        drawCalls: 131,
        materials: 16,
        images: 5,
      },
      decodedTextureBytes: 20_621_997,
      renderTargetBytes: 62_208_000,
      estimatedGpuBytes: 84_300_329,
      validator: {
        errors: 1,
        acceptedFindings: [
          {
            code: "MESH_PRIMITIVE_TOO_FEW_TEXCOORDS",
            pointer: "/meshes/12/primitives/0/material",
          },
        ],
      },
    });
  });

  it("fails closed when the approved source identity policy changes", async () => {
    const root = mkdtempSync(join(tmpdir(), "vanta-media-test-"));
    temporaryRoots.push(root);
    mkdirSync(join(root, "media/source"), { recursive: true });
    const configuration = JSON.parse(readFileSync("media/pipeline.json", "utf8")) as {
      source: { sha256: string };
    };
    configuration.source.sha256 = "0".repeat(64);
    writeFileSync(join(root, "media/pipeline.json"), `${JSON.stringify(configuration)}\n`);
    cpSync(
      "media/source/VANTA_MONOLITH_v03D.glb",
      join(root, "media/source/VANTA_MONOLITH_v03D.glb"),
    );

    const result = await validateApprovedSource(root);

    expect(result.status).toBe("fail");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "approved_hash_policy_changed" }),
        expect.objectContaining({ code: "MESH_PRIMITIVE_TOO_FEW_TEXCOORDS" }),
      ]),
    );
    expect(result.validator.acceptedFindings).toEqual([]);
  });

  it("bounds cross-platform AVIF variance without accepting recipe drift", () => {
    const atBoundary: PortableImageComparison = {
      path: "public/media/stills/example.avif",
      dimensionsMatch: true,
      ...PORTABLE_AVIF_TOLERANCE,
    };

    expect(isPortableAvifEquivalent(atBoundary)).toBe(true);
    for (const metric of [
      "meanAbsoluteChannelDifference",
      "maximumChannelDifference",
      "changedChannelRatio",
      "encodedSizeDeltaRatio",
    ] as const) {
      expect(
        isPortableAvifEquivalent({
          ...atBoundary,
          [metric]: PORTABLE_AVIF_TOLERANCE[metric] + 0.001,
        }),
        metric,
      ).toBe(false);
    }
    expect(
      isPortableAvifEquivalent({ ...atBoundary, dimensionsMatch: false }),
    ).toBe(false);
  });

  it("pins the accepted conservative Meshopt output", () => {
    const source = parseGlb("media/source/VANTA_MONOLITH_v03D.glb");
    const runtime = parseGlb("public/media/models/VANTA_MONOLITH_runtime_meshopt.glb");
    const sourceStats = calculateSceneStats(source);

    expect(sha256(source.bytes)).toBe(
      "ccbdb568548e154335b2d8eb147a8f39b9881eb930e2b290e098f419425ca261",
    );
    expect(sha256(runtime.bytes)).toBe(
      "e764793bea736a369995ea1ee20a1a9bf263e52363e9db214f219d5b60552cc1",
    );
    expect(runtime.bytes.length).toBeLessThanOrEqual(2_700_000);
    expect(sourceStats).toMatchObject({
      namedNodes: 141,
      triangles: 71_744,
      drawCalls: 131,
    });
  });

  it("records full provenance for every derivative and excludes Product runtime", () => {
    const derivatives = JSON.parse(
      readFileSync("media/manifests/derivatives.json", "utf8"),
    ) as {
      source: { sha256: string };
      outputs: Array<{
        path: string;
        provenance: {
          sourceSha256: string;
          pipelineVersion: string;
          camera: unknown;
          light: unknown;
          crop: unknown;
        };
      }>;
    };
    const media = JSON.parse(readFileSync("media/manifests/media.json", "utf8")) as {
      routeUsage: { product: { runtimeModel: string | null } };
    };

    expect(derivatives.outputs.length).toBeGreaterThan(0);
    derivatives.outputs.forEach((output) => {
      expect(output.provenance).toEqual(
        expect.objectContaining({
          sourceSha256: derivatives.source.sha256,
          pipelineVersion: "1.0.0",
          camera: expect.any(Object),
          light: expect.any(Object),
          crop: expect.any(Object),
        }),
      );
    });
    expect(media.routeUsage.product.runtimeModel).toBeNull();
  });
});

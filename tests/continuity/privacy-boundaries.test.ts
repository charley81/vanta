import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createDefaultPresentationSession,
  createDefaultPreviewSession,
  createMorphSessionStore,
} from "@/src/continuity";

const continuityRoot = join(process.cwd(), "src", "continuity");
const continuitySource = readdirSync(continuityRoot)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => readFileSync(join(continuityRoot, file), "utf8"))
  .join("\n");

describe("continuity privacy and architecture boundaries", () => {
  it("uses neither durable/public persistence nor visitor-data channels", () => {
    expect(continuitySource).not.toMatch(/localStorage|URLSearchParams|location\.search/);
    expect(continuitySource).not.toMatch(/analytics|telemetry|referrer/);
  });

  it("keeps shared state serializable and free of runtime browser/media objects", () => {
    const boundedStates = [
      createMorphSessionStore().getSnapshot(),
      createDefaultPresentationSession(),
      createDefaultPreviewSession(1_000),
    ];
    expect(() => JSON.stringify(boundedStates)).not.toThrow();
    expect(continuitySource).not.toMatch(
      /AudioContext|AudioNode|WebGLRenderingContext|THREE\.|GLTF|HTMLCanvasElement/,
    );
  });
});

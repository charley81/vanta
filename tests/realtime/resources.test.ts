import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  cappedRealtimeDpr,
  GOVERNED_REALTIME_RESOURCES,
  realtimeResourceViolations,
  REALTIME_BUDGETS,
} from "@/src/realtime/budgets";
import { GOVERNED_REALTIME_MODEL_URL } from "@/src/realtime/scene-options";

const derivatives = JSON.parse(
  readFileSync("media/manifests/derivatives.json", "utf8"),
) as {
  budgets: {
    decodedTextureBytes: number;
    estimatedGpuBytes: number;
  };
  outputs: Array<{ id: string; bytes: number }>;
  resourceEstimate: {
    decodedTextureBytes: number;
    estimatedGpuBytes: number;
  };
};
const media = JSON.parse(
  readFileSync("media/manifests/media.json", "utf8"),
) as { routeUsage: { home: { runtimeModel: string } } };

describe("Realtime resource accounting", () => {
  it("binds the runtime contract to the governed derivative report", () => {
    const model = derivatives.outputs.find((output) => output.id === "runtime-meshopt");

    expect(GOVERNED_REALTIME_RESOURCES).toEqual({
      modelBytes: model?.bytes,
      decodedTextureBytes: derivatives.resourceEstimate.decodedTextureBytes,
      estimatedGpuBytes: derivatives.resourceEstimate.estimatedGpuBytes,
    });
    expect(GOVERNED_REALTIME_MODEL_URL).toBe(media.routeUsage.home.runtimeModel);
    expect(realtimeResourceViolations(GOVERNED_REALTIME_RESOURCES)).toEqual([]);
    expect(REALTIME_BUDGETS.maxDecodedTextureBytes).toBe(
      derivatives.budgets.decodedTextureBytes,
    );
    expect(REALTIME_BUDGETS.maxEstimatedGpuBytes).toBe(
      derivatives.budgets.estimatedGpuBytes,
    );
  });

  it("caps DPR by viewport without device-name heuristics", () => {
    expect(cappedRealtimeDpr(3, "mobile")).toBe(1.5);
    expect(cappedRealtimeDpr(3, "desktop")).toBe(2);
    expect(cappedRealtimeDpr(1.25, "desktop")).toBe(1.25);
  });
});

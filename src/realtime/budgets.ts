export const REALTIME_BUDGETS = {
  maxDecodedTextureBytes: 32 * 1024 * 1024,
  maxEstimatedGpuBytes: 96 * 1024 * 1024,
  maxModelBytes: 2_700_000,
  maxDpr: { desktop: 2, mobile: 1.5 },
  startupTargetMs: 4_000,
  startupTimeoutMs: 8_000,
  frameWindowMs: 2_000,
  frameFloorFps: 30,
  maxStartupTaskMs: 100,
  maxInteractionTaskMs: 50,
} as const;

export type RealtimeViewport = keyof typeof REALTIME_BUDGETS.maxDpr;

export type RealtimeResourceReport = {
  modelBytes: number;
  decodedTextureBytes: number;
  estimatedGpuBytes: number;
};

export type RealtimeBudgetViolation =
  | "model-bytes"
  | "decoded-textures"
  | "gpu-resources";

export function cappedRealtimeDpr(
  requested: number,
  viewport: RealtimeViewport,
): number {
  const finite = Number.isFinite(requested) ? requested : 1;
  return Math.max(1, Math.min(finite, REALTIME_BUDGETS.maxDpr[viewport]));
}

export function realtimeResourceViolations(
  report: RealtimeResourceReport,
): RealtimeBudgetViolation[] {
  const violations: RealtimeBudgetViolation[] = [];
  if (report.modelBytes > REALTIME_BUDGETS.maxModelBytes) {
    violations.push("model-bytes");
  }
  if (report.decodedTextureBytes > REALTIME_BUDGETS.maxDecodedTextureBytes) {
    violations.push("decoded-textures");
  }
  if (report.estimatedGpuBytes > REALTIME_BUDGETS.maxEstimatedGpuBytes) {
    violations.push("gpu-resources");
  }
  return violations;
}

export const GOVERNED_REALTIME_RESOURCES: RealtimeResourceReport = {
  modelBytes: 2_568_220,
  decodedTextureBytes: 20_621_997,
  estimatedGpuBytes: 84_300_329,
};

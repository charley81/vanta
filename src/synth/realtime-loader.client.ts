"use client";

import "client-only";

import { GOVERNED_REALTIME_RESOURCES } from "@/src/realtime/budgets";
import type { RealtimeSceneLoader } from "@/src/realtime/runtime";
import { GOVERNED_REALTIME_MODEL_URL } from "@/src/realtime/scene-options";

export function createLazySynthSceneLoader({
  canvas,
  requestRender,
}: {
  canvas: HTMLCanvasElement;
  requestRender(): void;
}): RealtimeSceneLoader {
  return async (context) => {
    const { createSynthRealtimeScene } = await import(
      "./synth-three-scene.client"
    );
    return createSynthRealtimeScene({
      ...context,
      canvas,
      modelUrl: GOVERNED_REALTIME_MODEL_URL,
      requestRender,
      resources: GOVERNED_REALTIME_RESOURCES,
    });
  };
}

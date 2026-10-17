"use client";

import "client-only";

import { GOVERNED_REALTIME_RESOURCES } from "@/src/realtime/budgets";
import type { RealtimeSceneLoader } from "@/src/realtime/runtime";
import { GOVERNED_REALTIME_MODEL_URL } from "@/src/realtime/scene-options";

/** Keeps the Home-specific Three.js orchestrator behind qualification. */
export function createLazyHomeSceneLoader(options: {
  canvas: HTMLCanvasElement;
  getProgress(): number;
  onFirstFrame(): void;
  requestRender(): void;
}): RealtimeSceneLoader {
  return async (context) => {
    const { createHomeRealtimeScene } = await import(
      "./realtime-scene.client"
    );
    return createHomeRealtimeScene({
      ...context,
      ...options,
      modelUrl: GOVERNED_REALTIME_MODEL_URL,
      resources: GOVERNED_REALTIME_RESOURCES,
    });
  };
}

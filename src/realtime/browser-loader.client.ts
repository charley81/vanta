"use client";

import "client-only";

import { GOVERNED_REALTIME_RESOURCES } from "./budgets";
import type { RealtimeSceneLoader } from "./runtime";
import {
  GOVERNED_REALTIME_MODEL_URL,
  type ThreeRealtimeSceneOptions,
} from "./scene-options";

/**
 * Keeps Three.js, Meshopt, and the GLB request behind Runtime.start(). An
 * ineligible Presentation never invokes this loader, so neither dependency nor
 * model is requested.
 */
export function createLazyThreeSceneLoader(
  options: ThreeRealtimeSceneOptions,
): RealtimeSceneLoader {
  return async (context) => {
    const { createThreeRealtimeScene } = await import("./three-scene.client");
    return createThreeRealtimeScene({
      ...options,
      ...context,
      modelUrl: GOVERNED_REALTIME_MODEL_URL,
      resources: GOVERNED_REALTIME_RESOURCES,
    });
  };
}

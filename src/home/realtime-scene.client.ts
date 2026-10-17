"use client";

import "client-only";

import {
  AmbientLight,
  DirectionalLight,
  MathUtils,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
} from "three";

import type { RealtimeResourceReport } from "@/src/realtime/budgets";
import type {
  RealtimeEffects,
  RealtimeRuntimeScene,
} from "@/src/realtime/runtime";
import {
  DEFAULT_REALTIME_LIGHTING,
  type ThreeRealtimeSceneExtension,
} from "@/src/realtime/scene-options";

import { homeRealtimePose } from "./realtime-orchestration";

const REVEAL_DURATION_MS = 1_300;
const PROGRESS_EPSILON = 0.0005;

function createHomeSceneExtension({
  camera,
  getProgress,
  model,
  onFirstFrame,
  requestRender,
  scene,
}: {
  camera: PerspectiveCamera;
  getProgress(): number;
  model: Object3D;
  onFirstFrame(): void;
  requestRender(): void;
  scene: Scene;
}): ThreeRealtimeSceneExtension {
  const ambient = scene.children.find(
    (child): child is AmbientLight => child instanceof AmbientLight,
  );
  const directional = scene.children.filter(
    (child): child is DirectionalLight => child instanceof DirectionalLight,
  );
  const cameraTarget = new Vector3();
  const baseModelY = model.position.y;
  const baseModelRotationY = model.rotation.y;
  let currentProgress = Math.min(1, Math.max(0, getProgress()));
  let revealStartedAt: number | null = null;
  let firstFramePublished = false;
  let effects: RealtimeEffects = "full";

  return {
    beforeRender(timestampMs) {
      revealStartedAt ??= timestampMs;
      const targetProgress = Math.min(1, Math.max(0, getProgress()));
      const responsiveness = effects === "reduced" ? 1 : 0.16;
      currentProgress = MathUtils.lerp(
        currentProgress,
        targetProgress,
        responsiveness,
      );
      if (Math.abs(currentProgress - targetProgress) <= PROGRESS_EPSILON) {
        currentProgress = targetProgress;
      }

      const revealProgress =
        effects === "reduced"
          ? 1
          : Math.min(1, (timestampMs - revealStartedAt) / REVEAL_DURATION_MS);
      const pose = homeRealtimePose(currentProgress);
      const revealOffset = 1 - revealProgress;
      camera.position.set(
        pose.cameraPosition[0] + revealOffset * 0.12,
        pose.cameraPosition[1] + revealOffset * 0.1,
        pose.cameraPosition[2] + revealOffset * 0.16,
      );
      cameraTarget.fromArray(pose.cameraTarget);
      camera.lookAt(cameraTarget);
      camera.fov = pose.verticalFovDegrees;
      camera.updateProjectionMatrix();

      model.position.y = baseModelY - revealOffset * 0.018;
      model.rotation.y =
        baseModelRotationY + pose.modelRotationY - revealOffset * 0.12;
      if (ambient) ambient.intensity = pose.ambientIntensity;
      if (directional[0]) directional[0].intensity = pose.keyIntensity;
      if (directional[1]) directional[1].intensity = pose.fillIntensity;

      if (
        revealProgress < 1 ||
        Math.abs(currentProgress - targetProgress) > PROGRESS_EPSILON
      ) {
        requestRender();
      }
    },
    afterRender() {
      if (firstFramePublished) return;
      firstFramePublished = true;
      onFirstFrame();
    },
    setEffects(nextEffects) {
      effects = nextEffects;
    },
    dispose() {
      // Shared scene disposal owns model, lights, renderer, and canvas context.
    },
  };
}

export async function createHomeRealtimeScene(options: {
  canvas: HTMLCanvasElement;
  getProgress(): number;
  modelUrl: string;
  onFirstFrame(): void;
  requestRender(): void;
  resources: RealtimeResourceReport;
  signal: AbortSignal;
  onContextLost(): void;
  recordStartupTask(durationMs: number): void;
}): Promise<RealtimeRuntimeScene> {
  const { createThreeRealtimeScene } = await import(
    "@/src/realtime/three-scene.client"
  );
  return createThreeRealtimeScene({
    ...options,
    background: null,
    camera: {
      position: [0.46, 0.34, 0.48],
      target: [0, 0.035, -0.1],
      verticalFovDegrees: 31,
    },
    createExtension: ({ camera, model, scene }) =>
      createHomeSceneExtension({
        camera,
        getProgress: options.getProgress,
        model,
        onFirstFrame: options.onFirstFrame,
        requestRender: options.requestRender,
        scene,
      }),
    exposure: 1,
    lighting: DEFAULT_REALTIME_LIGHTING,
  });
}

export const GOVERNED_REALTIME_MODEL_URL =
  "/media/models/VANTA_MONOLITH_runtime_meshopt.glb";

export type Vector3Tuple = readonly [number, number, number];

export type RealtimeCamera = {
  position: Vector3Tuple;
  target: Vector3Tuple;
  verticalFovDegrees: number;
  near?: number;
  far?: number;
};

export type RealtimeDirectionalLight = {
  color: number;
  intensity: number;
  position: Vector3Tuple;
};

export type RealtimeSceneLighting = {
  ambient: { color: number; intensity: number };
  directional: readonly RealtimeDirectionalLight[];
};

export const DEFAULT_REALTIME_LIGHTING: RealtimeSceneLighting = {
  ambient: { color: 0xc5c8ca, intensity: 0.48 },
  directional: [
    { color: 0xe8e5df, intensity: 3.2, position: [-0.38, 0.58, 0.32] },
    { color: 0xffe2bc, intensity: 1.4, position: [0.38, 0.22, -0.28] },
  ],
};

export type ThreeRealtimeSceneExtension = {
  beforeRender?(timestampMs: number): void;
  afterRender?(timestampMs: number): void;
  setEffects?(effects: import("./runtime").RealtimeEffects): void;
  dispose(): void;
};

export type ThreeRealtimeSceneExtensionContext = {
  canvas: HTMLCanvasElement;
  camera: import("three").PerspectiveCamera;
  model: import("three").Object3D;
  renderer: import("three").WebGLRenderer;
  scene: import("three").Scene;
};

export type ThreeRealtimeSceneOptions = {
  canvas: HTMLCanvasElement;
  camera: RealtimeCamera;
  lighting: RealtimeSceneLighting;
  background: number | null;
  exposure?: number;
  createExtension?(
    context: ThreeRealtimeSceneExtensionContext,
  ): ThreeRealtimeSceneExtension;
};

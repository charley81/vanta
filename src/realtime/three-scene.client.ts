"use client";

import "client-only";

import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

import type { RealtimeResourceReport } from "./budgets";
import type { RealtimeRuntimeScene } from "./runtime";
import type { ThreeRealtimeSceneOptions } from "./scene-options";

function modelBaseUrl(modelUrl: string): string {
  const absolute = new URL(modelUrl, window.location.href);
  return new URL(".", absolute).href;
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof Texture) value.dispose();
  }
  material.dispose();
}

function disposeModel(model: Object3D): void {
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach(disposeMaterial);
  });
}

export async function createThreeRealtimeScene(
  options: ThreeRealtimeSceneOptions & {
    modelUrl: string;
    resources: RealtimeResourceReport;
    signal: AbortSignal;
    onContextLost(): void;
    recordStartupTask(durationMs: number): void;
  },
): Promise<RealtimeRuntimeScene> {
  if (options.signal.aborted) throw new DOMException("Aborted", "AbortError");

  const setupStartedAt = performance.now();
  const renderer = new WebGLRenderer({
    alpha: false,
    antialias: true,
    canvas: options.canvas,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.exposure ?? 1;

  const scene = new Scene();
  scene.background = new Color(options.background);
  const camera = new PerspectiveCamera(
    options.camera.verticalFovDegrees,
    1,
    options.camera.near ?? 0.01,
    options.camera.far ?? 5,
  );
  camera.position.fromArray(options.camera.position);
  camera.lookAt(new Vector3().fromArray(options.camera.target));

  scene.add(
    new AmbientLight(
      options.lighting.ambient.color,
      options.lighting.ambient.intensity,
    ),
  );
  options.lighting.directional.forEach((light) => {
    const directional = new DirectionalLight(light.color, light.intensity);
    directional.position.fromArray(light.position);
    scene.add(directional);
  });

  let disposed = false;
  let model: Object3D | null = null;
  let extension: ReturnType<
    NonNullable<ThreeRealtimeSceneOptions["createExtension"]>
  > | null = null;
  const handleContextLost = (event: Event) => {
    event.preventDefault();
    options.onContextLost();
  };
  options.canvas.addEventListener("webglcontextlost", handleContextLost);
  options.recordStartupTask(performance.now() - setupStartedAt);
  const startupTaskObserver =
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes.includes("longtask")
      ? new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            options.recordStartupTask(entry.duration);
          }
        })
      : null;
  startupTaskObserver?.observe({ type: "longtask" });

  try {
    const response = await fetch(options.modelUrl, {
      cache: "force-cache",
      signal: options.signal,
    });
    if (!response.ok) {
      throw new Error(`Realtime model request failed with ${response.status}`);
    }
    const data = await response.arrayBuffer();
    if (options.signal.aborted) throw new DOMException("Aborted", "AbortError");

    await MeshoptDecoder.ready;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.parseAsync(data, modelBaseUrl(options.modelUrl));
    model = gltf.scene;
    startupTaskObserver?.disconnect();
    if (options.signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    scene.add(model);
    extension =
      options.createExtension?.({
        canvas: options.canvas,
        camera,
        model,
        renderer,
      }) ?? null;

    return {
      resources: options.resources,
      resize({ dpr }) {
        if (disposed) return;
        const width = Math.max(1, options.canvas.clientWidth || options.canvas.width);
        const height = Math.max(
          1,
          options.canvas.clientHeight || options.canvas.height,
        );
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      },
      setEffects() {
        // This primitive has no optional post-processing effects. Preserve the
        // qualified sRGB/ACES color pipeline while the controller still lowers
        // DPR and route-owned scenes may disable their own optional effects.
      },
      render(timestampMs) {
        if (disposed) return;
        extension?.beforeRender?.(timestampMs);
        renderer.render(scene, camera);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        options.canvas.removeEventListener(
          "webglcontextlost",
          handleContextLost,
        );
        extension?.dispose();
        extension = null;
        if (model) {
          scene.remove(model);
          disposeModel(model);
          model = null;
        }
        renderer.renderLists.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
      },
    };
  } catch (error) {
    startupTaskObserver?.disconnect();
    options.canvas.removeEventListener("webglcontextlost", handleContextLost);
    extension?.dispose();
    if (model) disposeModel(model);
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
}

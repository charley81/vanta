"use client";

import "client-only";

import {
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
  type Object3D,
} from "three";

import type { RealtimeResourceReport } from "@/src/realtime/budgets";
import type { RealtimeRuntimeScene } from "@/src/realtime/runtime";
import {
  DEFAULT_REALTIME_LIGHTING,
  type ThreeRealtimeSceneExtensionContext,
} from "@/src/realtime/scene-options";
import {
  controlForHierarchyNode,
  createDirectManipulationGesture,
  normalizedControlRotation,
  SYNTH_CONTROL_NODE_NAMES,
} from "./direct-manipulation";
import { type MorphControl, type MorphValues } from "./controls";
import {
  morphControlSurface,
  morphSessionStore,
} from "./session.client";

const CONTROL_AXIS = new Vector3(0, 1, 0);

function createSynthSceneExtension(
  { camera, canvas, model }: ThreeRealtimeSceneExtensionContext,
  requestRender: () => void,
) {
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const controls = new Map<
    MorphControl,
    { node: Object3D; baseQuaternion: Quaternion }
  >();

  for (const [nodeName, control] of Object.entries(
    SYNTH_CONTROL_NODE_NAMES,
  ) as [keyof typeof SYNTH_CONTROL_NODE_NAMES, MorphControl][]) {
    const node = model.getObjectByName(nodeName);
    if (!node) throw new Error(`Governed Synth control node missing: ${nodeName}`);
    controls.set(control, {
      node,
      baseQuaternion: node.quaternion.clone(),
    });
  }

  function applyValues(values: Readonly<MorphValues>) {
    for (const [control, { baseQuaternion, node }] of controls) {
      const rotation = new Quaternion().setFromAxisAngle(
        CONTROL_AXIS,
        normalizedControlRotation(values[control]),
      );
      node.quaternion.copy(baseQuaternion).multiply(rotation);
    }
    requestRender();
  }

  function hitControl(event: PointerEvent): MorphControl | null {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    for (const intersection of raycaster.intersectObject(model, true)) {
      const control = controlForHierarchyNode(intersection.object);
      if (control) return control;
    }
    return null;
  }

  const initialTouchAction = canvas.style.touchAction;
  const gesture = createDirectManipulationGesture({
    getValue: (control) => morphSessionStore.getSnapshot().values[control],
    onSelect: (control) => morphControlSurface.select(control, "physical"),
    onValue: (control, value) => {
      morphControlSurface.setNormalizedValue(control, value, "physical");
    },
  });

  const handlePointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    const control = hitControl(event);
    if (!control) return;
    gesture.begin(event.pointerId, control, {
      x: event.clientX,
      y: event.clientY,
    });
  };
  const handlePointerMove = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    const dragging = gesture.move(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (dragging) {
      canvas.style.touchAction = "none";
      if (!canvas.hasPointerCapture(event.pointerId)) {
        canvas.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      return;
    }
    if (event.pointerType !== "touch") {
      canvas.style.cursor = hitControl(event) ? "grab" : "default";
    }
  };
  const finishPointer = (event: PointerEvent) => {
    const result = gesture.end(event.pointerId);
    if (!result) return;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    canvas.style.touchAction = initialTouchAction;
    canvas.style.cursor = result === "drag" ? "grab" : canvas.style.cursor;
  };
  const cancelPointer = (event: PointerEvent) => {
    gesture.cancel(event.pointerId);
    canvas.style.touchAction = initialTouchAction;
  };
  const clearHover = () => {
    canvas.style.cursor = "default";
  };

  canvas.dataset.directManipulation = "ready";
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", cancelPointer);
  canvas.addEventListener("pointerleave", clearHover);
  const unsubscribe = morphSessionStore.subscribe(() => {
    applyValues(morphSessionStore.getSnapshot().values);
  });
  applyValues(morphSessionStore.getSnapshot().values);

  return {
    dispose() {
      unsubscribe();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", cancelPointer);
      canvas.removeEventListener("pointerleave", clearHover);
      delete canvas.dataset.directManipulation;
      canvas.style.cursor = "";
      canvas.style.touchAction = initialTouchAction;
    },
  };
}

export async function createSynthRealtimeScene(options: {
  canvas: HTMLCanvasElement;
  modelUrl: string;
  resources: RealtimeResourceReport;
  requestRender(): void;
  signal: AbortSignal;
  onContextLost(): void;
  recordStartupTask(durationMs: number): void;
}): Promise<RealtimeRuntimeScene> {
  const { createThreeRealtimeScene } = await import(
    "@/src/realtime/three-scene.client"
  );
  return createThreeRealtimeScene({
    ...options,
    background: 0x0f0905,
    camera: {
      position: [0.02, 0.56, 0.22],
      target: [0, 0.025, -0.105],
      verticalFovDegrees: 29,
    },
    createExtension: (context) =>
      createSynthSceneExtension(context, options.requestRender),
    exposure: 1,
    lighting: DEFAULT_REALTIME_LIGHTING,
  });
}

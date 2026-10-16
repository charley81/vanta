"use client";

import "client-only";

import { createMorphSessionStore } from "@/src/continuity";

import {
  createMorphControlSurfaceAdapter,
  type ControlSurfaceSource,
  type MorphControl,
} from "./controls";

// A module-scoped store has the required lifetime: it survives App Router
// navigation in this tab, while a reload, duplicated tab, or new tab creates a
// fresh JavaScript realm and canonical defaults. It is deliberately not stored
// in history, Web Storage, a URL, or a cookie.
export const morphSessionStore = createMorphSessionStore();

export type MorphControlInput = {
  atMs: number;
  control: MorphControl;
  source: ControlSurfaceSource;
};

const controlInputListeners = new Set<(input: MorphControlInput) => void>();
const controlSelectionListeners = new Set<
  (selection: { control: MorphControl; source: ControlSurfaceSource }) => void
>();
const sessionSurface = createMorphControlSurfaceAdapter(morphSessionStore);

export const morphControlSurface = {
  select(control: MorphControl, source: ControlSurfaceSource) {
    sessionSurface.select(control, source);
    const selection = { control, source };
    controlSelectionListeners.forEach((listener) => listener(selection));
  },
  setNormalizedValue(
    control: MorphControl,
    value: number,
    source: ControlSurfaceSource,
  ) {
    const atMs = performance.now();
    const accepted = sessionSurface.setNormalizedValue(control, value, source);
    if (accepted) {
      const input = { atMs, control, source };
      controlInputListeners.forEach((listener) => listener(input));
    }
    return accepted;
  },
};

export function subscribeMorphControlInput(
  listener: (input: MorphControlInput) => void,
): () => void {
  controlInputListeners.add(listener);
  return () => controlInputListeners.delete(listener);
}

export function subscribeMorphControlSelection(
  listener: (selection: {
    control: MorphControl;
    source: ControlSurfaceSource;
  }) => void,
): () => void {
  controlSelectionListeners.add(listener);
  return () => controlSelectionListeners.delete(listener);
}

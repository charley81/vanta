import {
  DEFAULT_MORPH_VALUES,
  MORPH_CONTROLS,
  type MorphControl,
  type MorphValues,
} from "@/src/synth/controls";

import { createBoundedStore, type BoundedStore } from "./store";
import {
  hasExactKeys,
  invalid,
  isIntegerInRange,
  isRecord,
  valid,
  type ParseResult,
} from "./value";

export { MORPH_CONTROLS, type MorphControl, type MorphValues };

export type MorphSession = {
  selectedControl: MorphControl;
  values: MorphValues;
};

export const DEFAULT_MORPH_SESSION: Readonly<MorphSession> = Object.freeze({
  selectedControl: "morph",
  values: DEFAULT_MORPH_VALUES,
});

function isMorphControl(value: unknown): value is MorphControl {
  return MORPH_CONTROLS.some((control) => control === value);
}

export function parseMorphSession(value: unknown): ParseResult<MorphSession> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["selectedControl", "values"]) ||
    !isMorphControl(value.selectedControl) ||
    !isRecord(value.values) ||
    !hasExactKeys(value.values, MORPH_CONTROLS)
  ) {
    return invalid("MORPH session has an unknown shape");
  }

  const candidateValues = value.values as Record<string, unknown>;
  const values = Object.fromEntries(
    MORPH_CONTROLS.map((control) => [control, candidateValues[control]]),
  ) as Record<MorphControl, unknown>;
  if (
    MORPH_CONTROLS.some(
      (control) => !isIntegerInRange(values[control], 0, 100),
    )
  ) {
    return invalid("MORPH values must be normalized integers");
  }

  return valid({
    selectedControl: value.selectedControl,
    values: values as MorphValues,
  });
}

export type MorphSessionStore = BoundedStore<MorphSession> & {
  select(control: MorphControl): void;
  setValue(control: MorphControl, value: number): boolean;
};

export function createMorphSessionStore(): MorphSessionStore {
  const createDefault = (): MorphSession => ({
    selectedControl: DEFAULT_MORPH_SESSION.selectedControl,
    values: { ...DEFAULT_MORPH_SESSION.values },
  });
  const store = createBoundedStore(createDefault);

  return {
    ...store,
    select(control) {
      store.replace({ ...store.getSnapshot(), selectedControl: control });
    },
    setValue(control, value) {
      if (!isIntegerInRange(value, 0, 100)) return false;
      const current = store.getSnapshot();
      store.replace({
        ...current,
        values: { ...current.values, [control]: value },
      });
      return true;
    },
  };
}

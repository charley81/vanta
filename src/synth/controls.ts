export const MORPH_CONTROLS = [
  "morph",
  "cutoff",
  "resonance",
  "drive",
  "attack",
  "release",
] as const;

export type MorphControl = (typeof MORPH_CONTROLS)[number];
export type MorphValues = Record<MorphControl, number>;

export type SynthControlDefinition = {
  id: MorphControl;
  name: string;
  defaultValue: number;
  valueLabel: string;
  purpose: string;
  endpoints: readonly [string, string];
};

export const SYNTH_CONTROL_DEFINITIONS = [
  {
    id: "morph",
    name: "MORPH",
    defaultValue: 50,
    valueLabel: "Position",
    purpose: "Move continuously from SUB weight to FRACTURE texture.",
    endpoints: ["SUB", "FRACTURE"],
  },
  {
    id: "cutoff",
    name: "CUTOFF",
    defaultValue: 54,
    valueLabel: "Filter offset",
    purpose: "Offset the voice toward darker or brighter filtering.",
    endpoints: ["DARK", "BRIGHT"],
  },
  {
    id: "resonance",
    name: "RESONANCE",
    defaultValue: 32,
    valueLabel: "Emphasis",
    purpose: "Emphasize the filter edge without changing the phrase.",
    endpoints: ["SOFT", "FOCUSED"],
  },
  {
    id: "drive",
    name: "DRIVE",
    defaultValue: 24,
    valueLabel: "Saturation",
    purpose: "Add bounded post-filter saturation.",
    endpoints: ["CLEAN", "SATURATED"],
  },
  {
    id: "attack",
    name: "ATTACK",
    defaultValue: 18,
    valueLabel: "Onset",
    purpose: "Shape the onset from immediate to swelling.",
    endpoints: ["IMMEDIATE", "SWELLING"],
  },
  {
    id: "release",
    name: "RELEASE",
    defaultValue: 42,
    valueLabel: "Tail",
    purpose: "Shape the tail from clipped to overlapping.",
    endpoints: ["CLIPPED", "OVERLAPPING"],
  },
] as const satisfies readonly SynthControlDefinition[];

export const DEFAULT_MORPH_VALUES: Readonly<MorphValues> = Object.freeze(
  Object.fromEntries(
    SYNTH_CONTROL_DEFINITIONS.map(({ id, defaultValue }) => [id, defaultValue]),
  ) as MorphValues,
);

export type ControlSurfaceSource = "physical" | "semantic";

export type MorphControlSurfaceAdapter = {
  select(control: MorphControl, source: ControlSurfaceSource): void;
  setNormalizedValue(
    control: MorphControl,
    value: number,
    source: ControlSurfaceSource,
  ): boolean;
};

/**
 * Both a future physical instrument surface and the semantic Control deck use
 * this adapter. The source is intentionally accepted but never changes the
 * state transition: one normalized MORPH session remains authoritative.
 */
export function createMorphControlSurfaceAdapter(
  store: {
    select(control: MorphControl): void;
    setValue(control: MorphControl, value: number): boolean;
  },
): MorphControlSurfaceAdapter {
  return {
    select(control) {
      store.select(control);
    },
    setNormalizedValue(control, value) {
      return store.setValue(control, value);
    },
  };
}

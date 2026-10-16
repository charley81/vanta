import type { MorphValues } from "@/src/synth/controls";

export const AUTHORED_PHRASE = [55, 65.406, 73.416, 82.407, 73.416, 65.406] as const;
export const PHRASE_PULSE_SECONDS = 0.54;

export type AudioCalibration = {
  attackSeconds: number;
  detuneCents: number;
  driveMix: number;
  estimatedCompensatedLevel: number;
  filterHz: number;
  fundamentalWeight: number;
  harmonicDensity: number;
  instabilityDepthCents: number;
  instabilityRateHz: number;
  outputCompensation: number;
  partialWeights: readonly [number, number, number, number, number, number];
  releaseSeconds: number;
  resonanceQ: number;
  subWeight: number;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const interpolate = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;
const exponentialMap = (amount: number, from: number, to: number) =>
  from * Math.pow(to / from, amount);
const normalized = (value: number) => clamp(value / 100, 0, 1);

function smoothstep(value: number): number {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

/**
 * The calibrated, code-owned mapping from the six normalized controls to the
 * native-node synthesis graph. Secondary controls remain bounded offsets around
 * the MORPH trajectory; none replaces MORPH's multi-dimensional movement.
 */
export function deriveAudioCalibration(
  values: Readonly<MorphValues>,
): AudioCalibration {
  const morph = normalized(values.morph);
  const shapedMorph = smoothstep(morph);
  const cutoffOffset = Math.pow(2, (values.cutoff - 54) / 42);
  const resonanceOffset = ((values.resonance - 32) / 100) * 8.5;
  const driveOffset = ((values.drive - 24) / 100) * 0.62;

  const subWeight = interpolate(0.34, 0.025, shapedMorph);
  const fundamentalWeight = interpolate(0.72, 0.56, shapedMorph);
  const partialWeights = [
    subWeight,
    fundamentalWeight,
    interpolate(0.08, 0.3, shapedMorph),
    interpolate(0.025, 0.23, shapedMorph),
    interpolate(0.002, 0.16, shapedMorph),
    interpolate(0.001, 0.105, shapedMorph),
  ] as const;
  const harmonicEnergy = Math.sqrt(
    partialWeights.reduce((total, weight) => total + weight * weight, 0),
  );
  const resonanceQ = clamp(0.8 + shapedMorph * 3.8 + resonanceOffset, 0.55, 13);
  const driveMix = clamp(0.08 + shapedMorph * 0.46 + driveOffset, 0, 0.82);
  const spectralEnergy =
    harmonicEnergy *
    (1 + driveMix * 0.34) *
    (1 + Math.max(0, resonanceQ - 1) * 0.012);
  const outputCompensation = clamp(0.18 / spectralEnergy, 0.14, 0.3);

  return {
    attackSeconds: exponentialMap(normalized(values.attack), 0.008, 0.78),
    detuneCents: interpolate(0, 7.8, shapedMorph),
    driveMix,
    estimatedCompensatedLevel: spectralEnergy * outputCompensation,
    filterHz: clamp(
      exponentialMap(shapedMorph, 340, 4_200) * cutoffOffset,
      120,
      9_800,
    ),
    fundamentalWeight,
    harmonicDensity: interpolate(0.12, 1, shapedMorph),
    instabilityDepthCents: 10 * Math.pow(morph, 1.3),
    instabilityRateHz: interpolate(2.2, 9.7, shapedMorph),
    outputCompensation,
    partialWeights,
    releaseSeconds: exponentialMap(normalized(values.release), 0.045, 1.8),
    resonanceQ,
    subWeight,
  };
}

export type CalibrationFingerprint = Pick<
  AudioCalibration,
  | "driveMix"
  | "filterHz"
  | "harmonicDensity"
  | "instabilityDepthCents"
  | "resonanceQ"
  | "subWeight"
>;

export function calibrationFingerprint(
  values: Readonly<MorphValues>,
): CalibrationFingerprint {
  const calibration = deriveAudioCalibration(values);
  return {
    driveMix: calibration.driveMix,
    filterHz: calibration.filterHz,
    harmonicDensity: calibration.harmonicDensity,
    instabilityDepthCents: calibration.instabilityDepthCents,
    resonanceQ: calibration.resonanceQ,
    subWeight: calibration.subWeight,
  };
}

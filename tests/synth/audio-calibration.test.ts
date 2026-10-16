import { describe, expect, it } from "vitest";

import {
  AUTHORED_PHRASE,
  calibrationFingerprint,
  deriveAudioCalibration,
} from "@/src/audio/calibration";
import { DEFAULT_MORPH_VALUES, type MorphValues } from "@/src/synth/controls";

function values(patch: Partial<MorphValues>): MorphValues {
  return { ...DEFAULT_MORPH_VALUES, ...patch };
}

describe("MORPH audio calibration", () => {
  it("preserves the accepted monophonic A-C-D-E-D-C phrase", () => {
    expect(AUTHORED_PHRASE).toHaveLength(6);
    expect(AUTHORED_PHRASE.map((frequency) => Math.round(frequency))).toEqual([
      55, 65, 73, 82, 73, 65,
    ]);
  });

  it("moves every defining MORPH dimension continuously at the five calibration points", () => {
    const points = [0, 25, 50, 75, 100].map((morph) =>
      deriveAudioCalibration(values({ morph })),
    );

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      expect(current.subWeight).toBeLessThan(previous.subWeight);
      expect(current.harmonicDensity).toBeGreaterThan(previous.harmonicDensity);
      expect(current.filterHz).toBeGreaterThan(previous.filterHz);
      expect(current.resonanceQ).toBeGreaterThan(previous.resonanceQ);
      expect(current.driveMix).toBeGreaterThan(previous.driveMix);
      expect(current.detuneCents).toBeGreaterThan(previous.detuneCents);
      expect(current.instabilityDepthCents).toBeGreaterThan(
        previous.instabilityDepthCents,
      );
    }

    const dense = Array.from({ length: 101 }, (_, morph) =>
      deriveAudioCalibration(values({ morph })),
    );
    dense.forEach((point) => {
      expect(Number.isFinite(point.filterHz)).toBe(true);
      expect(point.outputCompensation).toBeGreaterThanOrEqual(0.14);
      expect(point.outputCompensation).toBeLessThanOrEqual(0.3);
      expect(point.driveMix).toBeGreaterThanOrEqual(0);
      expect(point.driveMix).toBeLessThanOrEqual(0.82);
    });
    for (let index = 1; index < dense.length; index += 1) {
      expect(
        Math.abs(dense[index].harmonicDensity - dense[index - 1].harmonicDensity),
      ).toBeLessThan(0.02);
      expect(
        Math.abs(
          dense[index].instabilityDepthCents -
            dense[index - 1].instabilityDepthCents,
        ),
      ).toBeLessThan(0.2);
    }
  });

  it("keeps bright SUB and dark FRACTURE recognizably different", () => {
    const brightSub = calibrationFingerprint(
      values({ morph: 0, cutoff: 100 }),
    );
    const darkFracture = calibrationFingerprint(
      values({ morph: 100, cutoff: 0 }),
    );

    expect(darkFracture.harmonicDensity - brightSub.harmonicDensity).toBeGreaterThan(
      0.8,
    );
    expect(
      darkFracture.instabilityDepthCents - brightSub.instabilityDepthCents,
    ).toBeGreaterThan(9);
    expect(darkFracture.subWeight).toBeLessThan(brightSub.subWeight / 5);
    expect(darkFracture.driveMix).toBeGreaterThan(brightSub.driveMix + 0.4);
    expect(darkFracture.resonanceQ).toBeGreaterThan(brightSub.resonanceQ + 3);
  });

  it("gives every secondary control meaningful bounded agency at fixed MORPH", () => {
    const base = values({ morph: 50 });
    const dark = deriveAudioCalibration({ ...base, cutoff: 0 });
    const bright = deriveAudioCalibration({ ...base, cutoff: 100 });
    expect(bright.filterHz / dark.filterHz).toBeGreaterThan(4);

    const soft = deriveAudioCalibration({ ...base, resonance: 0 });
    const focused = deriveAudioCalibration({ ...base, resonance: 100 });
    expect(focused.resonanceQ - soft.resonanceQ).toBeGreaterThan(7.5);

    const clean = deriveAudioCalibration({ ...base, drive: 0 });
    const saturated = deriveAudioCalibration({ ...base, drive: 100 });
    expect(saturated.driveMix - clean.driveMix).toBeGreaterThan(0.5);

    const immediate = deriveAudioCalibration({ ...base, attack: 0 });
    const swelling = deriveAudioCalibration({ ...base, attack: 100 });
    expect(swelling.attackSeconds / immediate.attackSeconds).toBeGreaterThan(90);

    const clipped = deriveAudioCalibration({ ...base, release: 0 });
    const overlapping = deriveAudioCalibration({ ...base, release: 100 });
    expect(overlapping.releaseSeconds / clipped.releaseSeconds).toBe(40);
  });

  it("compensates predicted level across MORPH and drive extremes", () => {
    const levels = [0, 25, 50, 75, 100].flatMap((morph) =>
      [0, 50, 100].map((drive) =>
        deriveAudioCalibration(values({ morph, drive }))
          .estimatedCompensatedLevel,
      ),
    );
    const levelDb = levels.map((level) => 20 * Math.log10(level));
    expect(Math.max(...levelDb) - Math.min(...levelDb)).toBeLessThan(3);
  });
});

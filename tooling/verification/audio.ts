import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

import {
  AUTHORED_PHRASE,
  PHRASE_PULSE_SECONDS,
  calibrationFingerprint,
  deriveAudioCalibration,
} from "../../src/audio/calibration";
import {
  createPhraseScheduler,
  type IntervalClock,
  type ScheduledPhraseNote,
} from "../../src/audio/phrase-scheduler";
import {
  DEFAULT_MORPH_VALUES,
  type MorphValues,
} from "../../src/synth/controls";
import type { ValidationIssue } from "./requirements";

type Evaluation = {
  status: "pass" | "fail";
  summary: Record<string, unknown>;
  issues: ValidationIssue[];
};

const values = (patch: Partial<MorphValues>): MorphValues => ({
  ...DEFAULT_MORPH_VALUES,
  ...patch,
});

function issue(
  issues: ValidationIssue[],
  condition: boolean,
  code: string,
  message: string,
  path: string,
): void {
  if (!condition) issues.push({ code, message, path });
}

export function evaluateAudioCalibration(): Evaluation {
  const issues: ValidationIssue[] = [];
  const continuum = [0, 25, 50, 75, 100].map((morph) => ({
    morph,
    ...deriveAudioCalibration(values({ morph })),
  }));
  const dense = Array.from({ length: 101 }, (_, morph) =>
    deriveAudioCalibration(values({ morph })),
  );
  for (let index = 1; index < dense.length; index += 1) {
    issue(
      issues,
      dense[index].harmonicDensity > dense[index - 1].harmonicDensity,
      "audio_continuum_discontinuity",
      `Harmonic density did not increase at MORPH ${index}.`,
      "src/audio/calibration.ts",
    );
    issue(
      issues,
      Math.abs(
        dense[index].instabilityDepthCents -
          dense[index - 1].instabilityDepthCents,
      ) < 0.2,
      "audio_continuum_discontinuity",
      `Instability jumped at MORPH ${index}.`,
      "src/audio/calibration.ts",
    );
  }

  const brightSub = calibrationFingerprint(values({ morph: 0, cutoff: 100 }));
  const darkFracture = calibrationFingerprint(values({ morph: 100, cutoff: 0 }));
  issue(
    issues,
    darkFracture.harmonicDensity - brightSub.harmonicDensity > 0.8 &&
      darkFracture.instabilityDepthCents - brightSub.instabilityDepthCents > 9 &&
      darkFracture.subWeight < brightSub.subWeight / 5,
    "audio_endpoint_identity",
    "Bright SUB and dark FRACTURE fingerprints are not sufficiently distinct.",
    "src/audio/calibration.ts",
  );

  const compensatedLevels = [0, 25, 50, 75, 100].flatMap((morph) =>
    [0, 50, 100].map(
      (drive) =>
        deriveAudioCalibration(values({ morph, drive }))
          .estimatedCompensatedLevel,
    ),
  );
  const compensatedDb = compensatedLevels.map((level) => 20 * Math.log10(level));
  const compensationSpreadDb = Math.max(...compensatedDb) - Math.min(...compensatedDb);
  issue(
    issues,
    compensationSpreadDb < 3,
    "audio_compensation_out_of_bounds",
    `Predicted compensated-level spread is ${compensationSpreadDb.toFixed(2)} dB.`,
    "src/audio/calibration.ts",
  );

  const midpoint = values({ morph: 50 });
  const secondaryDeltas = {
    cutoffRatio:
      deriveAudioCalibration({ ...midpoint, cutoff: 100 }).filterHz /
      deriveAudioCalibration({ ...midpoint, cutoff: 0 }).filterHz,
    resonanceQ:
      deriveAudioCalibration({ ...midpoint, resonance: 100 }).resonanceQ -
      deriveAudioCalibration({ ...midpoint, resonance: 0 }).resonanceQ,
    driveMix:
      deriveAudioCalibration({ ...midpoint, drive: 100 }).driveMix -
      deriveAudioCalibration({ ...midpoint, drive: 0 }).driveMix,
    attackRatio:
      deriveAudioCalibration({ ...midpoint, attack: 100 }).attackSeconds /
      deriveAudioCalibration({ ...midpoint, attack: 0 }).attackSeconds,
    releaseRatio:
      deriveAudioCalibration({ ...midpoint, release: 100 }).releaseSeconds /
      deriveAudioCalibration({ ...midpoint, release: 0 }).releaseSeconds,
  };
  issue(
    issues,
    secondaryDeltas.cutoffRatio > 4 &&
      secondaryDeltas.resonanceQ > 7.5 &&
      secondaryDeltas.driveMix > 0.5 &&
      secondaryDeltas.attackRatio > 90 &&
      secondaryDeltas.releaseRatio >= 40,
    "audio_secondary_control_weak",
    "One or more secondary controls do not create the calibrated minimum change.",
    "src/audio/calibration.ts",
  );

  return {
    status: issues.length === 0 ? "pass" : "fail",
    summary: {
      method: "deterministic code-owned calibration",
      phraseFrequenciesHz: AUTHORED_PHRASE,
      continuum,
      brightSub,
      darkFracture,
      secondaryDeltas,
      compensationSpreadDb,
    },
    issues,
  };
}

export function evaluateAudioStress(): Evaluation {
  const issues: ValidationIssue[] = [];
  const notes: ScheduledPhraseNote[] = [];
  let now = 0;
  let timer: () => void = () => undefined;
  let intervalsCreated = 0;
  let intervalsCleared = 0;
  const clock: IntervalClock = {
    clear() {
      intervalsCleared += 1;
      timer = () => undefined;
    },
    set(callback) {
      intervalsCreated += 1;
      timer = callback;
      return intervalsCreated;
    },
  };
  const scheduler = createPhraseScheduler({
    clock,
    currentTime: () => now,
    schedule: (note) => notes.push(note),
  });
  scheduler.play();
  scheduler.play();

  let maximumOutputCompensation = 0;
  let maximumDriveMix = 0;
  for (let elapsedMs = 25; elapsedMs <= 600_000; elapsedMs += 25) {
    now = elapsedMs / 1_000;
    timer();
    if (elapsedMs % 1_000 === 0) {
      const calibration = deriveAudioCalibration(
        values({
          morph: (elapsedMs / 1_000) % 101,
          cutoff: (elapsedMs / 125) % 101,
          resonance: (elapsedMs / 200) % 101,
          drive: (elapsedMs / 250) % 101,
          attack: (elapsedMs / 500) % 101,
          release: (elapsedMs / 400) % 101,
        }),
      );
      maximumOutputCompensation = Math.max(
        maximumOutputCompensation,
        calibration.outputCompensation,
      );
      maximumDriveMix = Math.max(maximumDriveMix, calibration.driveMix);
    }
  }
  scheduler.pause();

  issue(
    issues,
    intervalsCreated === 1 && intervalsCleared === 1,
    "audio_transport_overlap",
    "The scripted transport created or retained overlapping scheduler intervals.",
    "src/audio/phrase-scheduler.ts",
  );
  notes.forEach((note, index) => {
    issue(
      issues,
      note.frequencyHz === AUTHORED_PHRASE[index % AUTHORED_PHRASE.length] &&
        Math.abs(note.startTime - (0.01 + index * PHRASE_PULSE_SECONDS)) < 1e-7,
      "audio_phrase_drift",
      `Phrase order or timing drifted at note ${index}.`,
      "src/audio/phrase-scheduler.ts",
    );
  });
  issue(
    issues,
    maximumOutputCompensation <= 0.3 && maximumDriveMix <= 0.82,
    "audio_gain_unbounded",
    "A scripted control trajectory exceeded calibrated gain bounds.",
    "src/audio/calibration.ts",
  );

  return {
    status: issues.length === 0 ? "pass" : "fail",
    summary: {
      method: "deterministic ten-minute scheduler and calibration simulation",
      simulatedDurationMs: 600_000,
      notesScheduled: notes.length,
      intervalsCreated,
      intervalsCleared,
      maximumOutputCompensation,
      maximumDriveMix,
      clickMitigation: {
        audioParamSmoothingMs: 15,
        transportFadeMs: 25,
      },
    },
    issues,
  };
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : [".ts", ".tsx"].includes(extname(path))
        ? [path]
        : [];
  });
}

export function evaluateAudioIsolation(root: string): Evaluation {
  const issues: ValidationIssue[] = [];
  const files = sourceFiles(join(root, "src"));
  const audioFiles = files.filter((path) => /[/\\]audio[/\\]/.test(path));
  const renderFiles = files.filter((path) =>
    /[/\\](3d|render(?:er|ing)?)[/\\]/i.test(path),
  );

  audioFiles.forEach((path) => {
    issue(
      issues,
      !/from\s+["'][^"']*(three|renderer|\.glb)/i.test(
        readFileSync(path, "utf8"),
      ),
      "audio_imports_rendering",
      "Audio implementation imports rendering code.",
      relative(root, path),
    );
  });
  renderFiles.forEach((path) => {
    issue(
      issues,
      !/from\s+["'][^"']*[/\\]audio[/\\]/i.test(
        readFileSync(path, "utf8"),
      ),
      "rendering_imports_audio",
      "Rendering implementation imports audio code.",
      relative(root, path),
    );
  });

  const engine = readFileSync(join(root, "src/audio/engine.client.ts"), "utf8");
  issue(
    issues,
    !/AudioWorklet|audioWorklet/.test(engine),
    "unmeasured_audio_worklet",
    "The native-node baseline unexpectedly includes an AudioWorklet.",
    "src/audio/engine.client.ts",
  );
  const transport = readFileSync(
    join(root, "src/synth/transport.client.ts"),
    "utf8",
  );
  issue(
    issues,
    transport.includes('import("@/src/audio/engine.client")'),
    "audio_engine_not_lazy",
    "The browser transport does not dynamically import the audio engine.",
    "src/synth/transport.client.ts",
  );

  return {
    status: issues.length === 0 ? "pass" : "fail",
    summary: {
      audioFiles: audioFiles.map((path) => relative(root, path)),
      renderingFiles: renderFiles.map((path) => relative(root, path)),
      implementation: "native AudioNodes",
      lazyTrustedGestureBoundary: true,
    },
    issues,
  };
}

import type { MorphValues } from "@/src/synth/controls";

export type AudioStartMeasurement = {
  firstSoundScheduledAtMs: number;
};

export type AudioControlMeasurement = {
  scheduledAtMs: number;
  latencyMs: number;
};

export type AudioEngineEvent = { type: "interrupted" };

export type MorphAudioEngine = {
  dispose(): Promise<void>;
  pause(): void;
  play(values: Readonly<MorphValues>): Promise<AudioStartMeasurement>;
  update(
    values: Readonly<MorphValues>,
    inputAtMs: number,
  ): AudioControlMeasurement | null;
};

export type MorphAudioEngineFactory = (options: {
  onEvent(event: AudioEngineEvent): void;
}) => MorphAudioEngine;

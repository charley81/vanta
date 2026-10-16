import "client-only";

import {
  deriveAudioCalibration,
  PHRASE_PULSE_SECONDS,
  type AudioCalibration,
} from "./calibration";
import type {
  AudioControlMeasurement,
  AudioEngineEvent,
  AudioStartMeasurement,
  MorphAudioEngine,
} from "./contracts";
import { createPhraseScheduler, type ScheduledPhraseNote } from "./phrase-scheduler";
import type { MorphValues } from "@/src/synth/controls";

const PARAMETER_SMOOTHING_SECONDS = 0.015;
const TRANSPORT_FADE_SECONDS = 0.025;
const PARTIAL_RATIOS = [0.5, 1, 2, 3, 5, 7] as const;

function driveCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(512 * Float32Array.BYTES_PER_ELEMENT));
  for (let index = 0; index < curve.length; index += 1) {
    const value = (index * 2) / (curve.length - 1) - 1;
    curve[index] = Math.tanh(value * 4) / Math.tanh(4);
  }
  return curve;
}

function scheduleSmoothly(
  parameter: AudioParam,
  value: number,
  atTime: number,
): void {
  parameter.cancelScheduledValues(atTime);
  parameter.setValueAtTime(parameter.value, atTime);
  parameter.setTargetAtTime(value, atTime, PARAMETER_SMOOTHING_SECONDS);
}

type ActiveVoice = {
  dry: GainNode;
  filter: BiquadFilterNode;
  instabilityDepth: GainNode;
  instabilityRate: AudioParam;
  oscillators: OscillatorNode[];
  partials: GainNode[];
  sources: OscillatorNode[];
  wet: GainNode;
};

class NativeMorphAudioEngine implements MorphAudioEngine {
  readonly #context: AudioContext;
  readonly #master: GainNode;
  readonly #onEvent: (event: AudioEngineEvent) => void;
  readonly #scheduler;
  readonly #voices = new Set<ActiveVoice>();
  #calibration: AudioCalibration | null = null;
  #disposed = false;
  #transportPlaying = false;

  constructor(onEvent: (event: AudioEngineEvent) => void) {
    this.#onEvent = onEvent;
    this.#context = new AudioContext({ latencyHint: "interactive" });
    this.#master = this.#context.createGain();
    this.#master.gain.value = 0;
    this.#master.connect(this.#context.destination);
    this.#scheduler = createPhraseScheduler({
      currentTime: () => this.#context.currentTime,
      schedule: (note) => this.#scheduleNote(note),
    });
    this.#context.onstatechange = () => {
      if (
        this.#disposed ||
        !this.#transportPlaying ||
        this.#context.state === "running"
      ) {
        return;
      }
      this.#transportPlaying = false;
      this.#scheduler.pause();
      this.#stopVoices(false);
      this.#onEvent({ type: "interrupted" });
    };
  }

  async play(values: Readonly<MorphValues>): Promise<AudioStartMeasurement> {
    if (this.#disposed) throw new Error("Audio engine has been disposed");
    if (this.#context.state !== "running") await this.#context.resume();
    if (this.#context.state !== "running") {
      throw new Error("Audio context did not enter the running state");
    }

    this.#calibration = deriveAudioCalibration(values);
    this.#transportPlaying = true;
    const note = this.#scheduler.play();
    scheduleSmoothly(
      this.#master.gain,
      this.#calibration.outputCompensation,
      this.#context.currentTime,
    );
    return {
      firstSoundScheduledAtMs:
        performance.now() +
        Math.max(0, note.startTime - this.#context.currentTime) * 1_000,
    };
  }

  update(
    values: Readonly<MorphValues>,
    inputAtMs: number,
  ): AudioControlMeasurement | null {
    if (this.#disposed) return null;
    this.#calibration = deriveAudioCalibration(values);
    if (!this.#transportPlaying || this.#context.state !== "running") return null;

    const now = this.#context.currentTime;
    scheduleSmoothly(
      this.#master.gain,
      this.#calibration.outputCompensation,
      now,
    );
    for (const voice of this.#voices) this.#applyCalibration(voice, now);
    const scheduledAtMs = performance.now();
    return {
      latencyMs: Math.max(0, scheduledAtMs - inputAtMs),
      scheduledAtMs,
    };
  }

  pause(): void {
    if (this.#disposed || !this.#transportPlaying) return;
    this.#transportPlaying = false;
    this.#scheduler.pause();
    const now = this.#context.currentTime;
    this.#master.gain.cancelScheduledValues(now);
    this.#master.gain.setValueAtTime(this.#master.gain.value, now);
    this.#master.gain.linearRampToValueAtTime(0, now + TRANSPORT_FADE_SECONDS);
    this.#stopVoices(true);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.pause();
    this.#disposed = true;
    this.#context.onstatechange = null;
    this.#stopVoices(false);
    if (this.#context.state !== "closed") await this.#context.close();
  }

  #applyCalibration(voice: ActiveVoice, atTime: number): void {
    const calibration = this.#calibration;
    if (!calibration) return;
    scheduleSmoothly(voice.filter.frequency, calibration.filterHz, atTime);
    scheduleSmoothly(voice.filter.Q, calibration.resonanceQ, atTime);
    scheduleSmoothly(voice.dry.gain, 1 - calibration.driveMix, atTime);
    scheduleSmoothly(voice.wet.gain, calibration.driveMix, atTime);
    scheduleSmoothly(
      voice.instabilityDepth.gain,
      calibration.instabilityDepthCents,
      atTime,
    );
    scheduleSmoothly(
      voice.instabilityRate,
      calibration.instabilityRateHz,
      atTime,
    );
    voice.partials.forEach((partial, index) => {
      scheduleSmoothly(
        partial.gain,
        calibration.partialWeights[index] ?? 0,
        atTime,
      );
    });
    voice.oscillators.forEach((oscillator, index) => {
      const spread = index < 2 ? 0 : index - 1;
      scheduleSmoothly(
        oscillator.detune,
        spread * calibration.detuneCents,
        atTime,
      );
    });
  }

  #scheduleNote(note: ScheduledPhraseNote): void {
    const calibration = this.#calibration;
    if (!calibration || !this.#transportPlaying) return;

    const input = this.#context.createGain();
    const filter = this.#context.createBiquadFilter();
    const shaper = this.#context.createWaveShaper();
    const dry = this.#context.createGain();
    const wet = this.#context.createGain();
    const envelope = this.#context.createGain();
    const instability = this.#context.createOscillator();
    const instabilityDepth = this.#context.createGain();
    const oscillators: OscillatorNode[] = [];
    const partials: GainNode[] = [];

    filter.type = "lowpass";
    shaper.curve = driveCurve();
    shaper.oversample = "2x";
    input.connect(filter);
    filter.connect(dry).connect(envelope);
    filter.connect(shaper).connect(wet).connect(envelope);
    envelope.connect(this.#master);
    instability.type = "sine";
    instability.connect(instabilityDepth);

    PARTIAL_RATIOS.forEach((ratio) => {
      const oscillator = this.#context.createOscillator();
      const gain = this.#context.createGain();
      oscillator.type = ratio <= 1 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(note.frequencyHz * ratio, note.startTime);
      gain.gain.value = 0;
      oscillator.connect(gain).connect(input);
      instabilityDepth.connect(oscillator.detune);
      oscillators.push(oscillator);
      partials.push(gain);
    });

    const voice = {
      dry,
      filter,
      instabilityDepth,
      instabilityRate: instability.frequency,
      oscillators,
      partials,
      sources: [...oscillators, instability],
      wet,
    } satisfies ActiveVoice;
    this.#voices.add(voice);
    this.#applyCalibration(voice, note.startTime);

    const attackEnd = note.startTime + calibration.attackSeconds;
    const gateOff =
      note.startTime +
      Math.max(PHRASE_PULSE_SECONDS * 0.65, calibration.attackSeconds + 0.04);
    const stopAt = gateOff + calibration.releaseSeconds + 0.08;
    envelope.gain.setValueAtTime(0.0001, note.startTime);
    envelope.gain.exponentialRampToValueAtTime(0.82, attackEnd);
    envelope.gain.setValueAtTime(0.82, gateOff);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      gateOff + calibration.releaseSeconds,
    );

    instability.start(note.startTime);
    instability.stop(stopAt);
    oscillators.forEach((oscillator) => {
      oscillator.start(note.startTime);
      oscillator.stop(stopAt);
    });
    const cleanupSource = oscillators.at(0);
    if (cleanupSource) cleanupSource.onended = () => this.#voices.delete(voice);
  }

  #stopVoices(withFade: boolean): void {
    const now = this.#context.currentTime;
    const stopAt = withFade ? now + TRANSPORT_FADE_SECONDS + 0.01 : now;
    for (const voice of this.#voices) {
      voice.sources.forEach((oscillator) => {
        try {
          oscillator.stop(stopAt);
        } catch {
          // A source that reached its authored stop time is already harmless.
        }
      });
    }
    this.#voices.clear();
  }
}

export function createMorphAudioEngine({
  onEvent,
}: {
  onEvent(event: AudioEngineEvent): void;
}): MorphAudioEngine {
  return new NativeMorphAudioEngine(onEvent);
}

import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AudioEngineEvent,
  MorphAudioEngine,
} from "@/src/audio/contracts";
import { DEFAULT_MORPH_VALUES } from "@/src/synth/controls";
import { createAudioTransportController } from "@/src/synth/transport";

function engineHarness(now: () => number) {
  let eventListener: ((event: AudioEngineEvent) => void) | null = null;
  let playCount = 0;
  let pauseCount = 0;
  let disposeCount = 0;
  let updateCount = 0;
  const engine: MorphAudioEngine = {
    async dispose() {
      disposeCount += 1;
    },
    pause() {
      pauseCount += 1;
    },
    async play() {
      playCount += 1;
      return { firstSoundScheduledAtMs: now() + 10 };
    },
    update(_values, inputAtMs) {
      updateCount += 1;
      return { scheduledAtMs: now(), latencyMs: now() - inputAtMs };
    },
  };
  return {
    counts: () => ({ disposeCount, pauseCount, playCount, updateCount }),
    emit(event: AudioEngineEvent) {
      eventListener?.(event);
    },
    module: {
      createMorphAudioEngine(options: {
        onEvent(event: AudioEngineEvent): void;
      }) {
        eventListener = options.onEvent;
        return engine;
      },
    },
  };
}

afterEach(() => vi.useRealTimers());

describe("audio transport controller", () => {
  it("does not load audio until activation and coalesces repeated preparation", async () => {
    let now = 100;
    let loadCount = 0;
    const harness = engineHarness(() => now);
    const controller = createAudioTransportController({
      loadEngine: async () => {
        loadCount += 1;
        return harness.module;
      },
      now: () => now,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    expect(controller.getSnapshot()).toBe("off");
    expect(loadCount).toBe(0);
    const first = controller.enableFromTrustedGesture();
    const repeated = controller.enableFromTrustedGesture();
    expect(controller.getSnapshot()).toBe("preparing");
    now = 104;

    await expect(first).resolves.toEqual({
      ok: true,
      firstSoundLatencyMs: 14,
      warm: false,
    });
    await expect(repeated).resolves.toEqual({
      ok: true,
      firstSoundLatencyMs: 14,
      warm: false,
    });
    expect(controller.getSnapshot()).toBe("playing");
    expect(loadCount).toBe(1);
    expect(harness.counts().playCount).toBe(1);
  });

  it("pauses without resetting the engine and resumes explicitly as warm", async () => {
    let now = 0;
    const harness = engineHarness(() => now);
    const controller = createAudioTransportController({
      loadEngine: async () => harness.module,
      now: () => now,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    await controller.enableFromTrustedGesture();
    controller.pause();
    expect(controller.getSnapshot()).toBe("paused");
    expect(harness.counts().pauseCount).toBe(1);

    now = 50;
    await expect(controller.enableFromTrustedGesture()).resolves.toEqual({
      ok: true,
      firstSoundLatencyMs: 10,
      warm: true,
    });
    expect(controller.getSnapshot()).toBe("playing");
    expect(harness.counts().playCount).toBe(2);
  });

  it("reports platform interruption and never resumes automatically", async () => {
    const harness = engineHarness(() => 0);
    const controller = createAudioTransportController({
      loadEngine: async () => harness.module,
      now: () => 0,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    await controller.enableFromTrustedGesture();
    harness.emit({ type: "interrupted" });
    expect(controller.getSnapshot()).toBe("interrupted");
    expect(harness.counts().playCount).toBe(1);

    await controller.enableFromTrustedGesture();
    expect(controller.getSnapshot()).toBe("playing");
    expect(harness.counts().playCount).toBe(2);
  });

  it("schedules accepted control changes synchronously only while playing", async () => {
    let now = 40;
    const harness = engineHarness(() => now);
    const controller = createAudioTransportController({
      loadEngine: async () => harness.module,
      now: () => now,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    expect(controller.update(DEFAULT_MORPH_VALUES, 35)).toBeNull();
    await controller.enableFromTrustedGesture();
    now = 47;
    expect(controller.update(DEFAULT_MORPH_VALUES, 42)).toEqual({
      scheduledAtMs: 47,
      latencyMs: 5,
    });
    expect(harness.counts().updateCount).toBe(1);
    controller.pause();
    expect(controller.update(DEFAULT_MORPH_VALUES, 47)).toBeNull();
  });

  it("fails locally when preparation times out and ignores the stale loader", async () => {
    vi.useFakeTimers();
    const never = new Promise<never>(() => undefined);
    const controller = createAudioTransportController({
      loadEngine: () => never,
      now: () => 0,
      preparationTimeoutMs: 100,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    const result = controller.enableFromTrustedGesture();
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toEqual({
      ok: false,
      reason: "preparation-timeout",
    });
    expect(controller.getSnapshot()).toBe("unavailable");
  });

  it("keeps engine failure local and allows an explicit retry", async () => {
    const harness = engineHarness(() => 0);
    let fail = true;
    const controller = createAudioTransportController({
      loadEngine: async () => ({
        createMorphAudioEngine: fail
          ? () => {
              throw new Error("AudioContext unavailable");
            }
          : harness.module.createMorphAudioEngine,
      }),
      now: () => 0,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    await expect(controller.enableFromTrustedGesture()).resolves.toEqual({
      ok: false,
      reason: "audio-engine-unavailable",
    });
    expect(controller.getSnapshot()).toBe("unavailable");

    fail = false;
    await expect(controller.enableFromTrustedGesture()).resolves.toEqual({
      ok: true,
      firstSoundLatencyMs: 10,
      warm: false,
    });
    expect(controller.getSnapshot()).toBe("playing");
  });

  it("disposes route-owned runtime idempotently and reconstructs only on a new gesture", async () => {
    const harness = engineHarness(() => 0);
    const controller = createAudioTransportController({
      loadEngine: async () => harness.module,
      now: () => 0,
      readValues: () => DEFAULT_MORPH_VALUES,
    });
    await controller.enableFromTrustedGesture();
    await controller.dispose();
    await controller.dispose();
    expect(harness.counts().disposeCount).toBe(1);
    expect(controller.getSnapshot()).toBe("interrupted");
    await expect(controller.enableFromTrustedGesture()).resolves.toEqual({
      ok: true,
      firstSoundLatencyMs: 10,
      warm: false,
    });
    expect(harness.counts().playCount).toBe(2);
  });
});

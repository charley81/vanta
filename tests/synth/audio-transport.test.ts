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

  it("reports duplicate platform interruptions once and never resumes automatically", async () => {
    const harness = engineHarness(() => 0);
    const controller = createAudioTransportController({
      loadEngine: async () => harness.module,
      now: () => 0,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    await controller.enableFromTrustedGesture();
    harness.emit({ type: "interrupted" });
    harness.emit({ type: "interrupted" });
    expect(controller.getSnapshot()).toBe("interrupted");
    expect(harness.counts()).toMatchObject({ pauseCount: 1, playCount: 1 });

    await controller.enableFromTrustedGesture();
    expect(controller.getSnapshot()).toBe("playing");
    expect(harness.counts().playCount).toBe(2);
  });

  it("keeps a newer resume isolated from a superseded preparation", async () => {
    let finishFirstPlay: (value: { firstSoundScheduledAtMs: number }) => void =
      () => undefined;
    const firstPlay = new Promise<{ firstSoundScheduledAtMs: number }>(
      (resolve) => {
        finishFirstPlay = resolve;
      },
    );
    const first = engineHarness(() => 0);
    const second = engineHarness(() => 0);
    let engineNumber = 0;
    const controller = createAudioTransportController({
      loadEngine: async () => ({
        createMorphAudioEngine(options) {
          engineNumber += 1;
          const selected = engineNumber === 1 ? first : second;
          const created = selected.module.createMorphAudioEngine(options);
          return engineNumber === 1
            ? { ...created, play: () => firstPlay }
            : created;
        },
      }),
      now: () => 0,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    const superseded = controller.enableFromTrustedGesture();
    await Promise.resolve();
    await Promise.resolve();
    controller.pause("interruption");
    await expect(superseded).resolves.toEqual({
      ok: false,
      reason: "interrupted",
    });

    await expect(controller.enableFromTrustedGesture()).resolves.toEqual({
      ok: true,
      firstSoundLatencyMs: 10,
      warm: false,
    });
    finishFirstPlay({ firstSoundScheduledAtMs: 10 });
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.getSnapshot()).toBe("playing");
    expect(first.counts().disposeCount).toBe(1);
    expect(second.counts()).toMatchObject({ disposeCount: 0, playCount: 1 });
  });

  it("publishes playing only after preparation ownership is released", async () => {
    const harness = engineHarness(() => 0);
    const controller = createAudioTransportController({
      loadEngine: async () => harness.module,
      now: () => 0,
      readValues: () => DEFAULT_MORPH_VALUES,
    });
    controller.subscribe(() => {
      if (controller.getSnapshot() === "playing") controller.pause();
    });

    await controller.enableFromTrustedGesture();

    expect(controller.getSnapshot()).toBe("paused");
    expect(harness.counts()).toMatchObject({ disposeCount: 0, pauseCount: 1 });
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

  it("settles canceled preparation immediately even when the loader never does", async () => {
    const never = new Promise<never>(() => undefined);
    const controller = createAudioTransportController({
      loadEngine: () => never,
      now: () => 0,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    const result = controller.enableFromTrustedGesture();
    controller.pause("interruption");

    await expect(result).resolves.toEqual({
      ok: false,
      reason: "interrupted",
    });
    expect(controller.getSnapshot()).toBe("interrupted");
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

  it("disposes a timed-out engine and recovers only after explicit Retry", async () => {
    vi.useFakeTimers();
    const stalled = engineHarness(() => 0);
    const recovered = engineHarness(() => 0);
    let engineNumber = 0;
    const controller = createAudioTransportController({
      loadEngine: async () => ({
        createMorphAudioEngine(options) {
          engineNumber += 1;
          const selected = engineNumber === 1 ? stalled : recovered;
          const created = selected.module.createMorphAudioEngine(options);
          return engineNumber === 1
            ? {
                ...created,
                play: () => new Promise<never>(() => undefined),
              }
            : created;
        },
      }),
      now: () => 0,
      preparationTimeoutMs: 100,
      readValues: () => DEFAULT_MORPH_VALUES,
    });

    const timedOut = controller.enableFromTrustedGesture();
    await vi.advanceTimersByTimeAsync(100);
    await expect(timedOut).resolves.toEqual({
      ok: false,
      reason: "preparation-timeout",
    });
    expect(controller.getSnapshot()).toBe("unavailable");

    await expect(controller.enableFromTrustedGesture()).resolves.toEqual({
      ok: true,
      firstSoundLatencyMs: 10,
      warm: false,
    });
    expect(stalled.counts().disposeCount).toBe(1);
    expect(recovered.counts().playCount).toBe(1);
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

import { describe, expect, it, vi } from "vitest";

import { qualifyPresentation } from "@/src/presentation/qualification";
import {
  REALTIME_BUDGETS,
  type RealtimeResourceReport,
} from "@/src/realtime/budgets";
import {
  createRealtimeRuntime,
  type RealtimeRuntimeScene,
} from "@/src/realtime/runtime";

const referenceResources: RealtimeResourceReport = {
  decodedTextureBytes: 20_621_997,
  estimatedGpuBytes: 84_300_329,
  modelBytes: 2_568_220,
};

function presentation(realtime = true) {
  return qualifyPresentation({
    coarsePointer: false,
    effectiveConnectionType: "4g",
    finePointer: true,
    logicalProcessors: 8,
    realtimePurpose: "decorative",
    reducedMotion: false,
    saveData: false,
    webgl2: realtime,
  });
}

function scene(resources = referenceResources) {
  return {
    dispose: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    resources,
    setEffects: vi.fn(),
  } satisfies RealtimeRuntimeScene;
}

function frameScheduler() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  return {
    callbacks,
    cancelFrame: vi.fn((id: number) => void callbacks.delete(id)),
    requestFrame: vi.fn((callback: FrameRequestCallback) => {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    }),
    run(timestamp: number) {
      const pending = [...callbacks.entries()];
      callbacks.clear();
      pending.forEach(([, callback]) => callback(timestamp));
    },
  };
}

describe("route-neutral Realtime runtime", () => {
  it("never requests a renderer or model for an ineligible Presentation", async () => {
    const loadScene = vi.fn(async () => scene());
    const runtime = createRealtimeRuntime({
      loadScene,
      presentation: presentation(false),
    });

    await runtime.start();

    expect(loadScene).not.toHaveBeenCalled();
    expect(runtime.getSnapshot()).toMatchObject({
      fallbackReason: "capability",
      phase: "fallback",
    });
  });

  it("caps DPR and accepts the governed reference asset within every resource ceiling", async () => {
    const loadedScene = scene();
    const runtime = createRealtimeRuntime({
      devicePixelRatio: 3,
      loadScene: async () => loadedScene,
      presentation: presentation(),
      viewport: "desktop",
    });

    await runtime.start();

    expect(loadedScene.resize).toHaveBeenCalledWith({ dpr: 2 });
    expect(runtime.getSnapshot()).toMatchObject({
      fallbackReason: null,
      phase: "ready",
      quality: { dpr: 2, effects: "full" },
      resources: referenceResources,
    });
  });

  it("re-caps DPR after responsive viewport changes without undoing a quality reduction", async () => {
    const scheduler = frameScheduler();
    const loadedScene = scene();
    const runtime = createRealtimeRuntime({
      cancelFrame: scheduler.cancelFrame,
      devicePixelRatio: 3,
      loadScene: async () => loadedScene,
      presentation: presentation(),
      requestFrame: scheduler.requestFrame,
      viewport: "desktop",
    });
    await runtime.start();

    runtime.resize({ devicePixelRatio: 3, viewport: "mobile" });
    expect(runtime.getSnapshot()).toMatchObject({
      phase: "ready",
      quality: { dpr: 1.5, effects: "full" },
    });
    expect(loadedScene.resize).toHaveBeenLastCalledWith({ dpr: 1.5 });

    runtime.recordFrameWindow({ durationMs: 2_000, frames: 58 });
    expect(runtime.getSnapshot().quality).toEqual({
      dpr: 1.125,
      effects: "reduced",
    });
    runtime.resize({ devicePixelRatio: 3, viewport: "desktop" });
    expect(runtime.getSnapshot().quality.dpr).toBe(1.125);
    expect(loadedScene.resize).toHaveBeenLastCalledWith({ dpr: 1.125 });
  });

  it("selects authored fallback and disposes when resource or task budgets fail", async () => {
    const oversized = scene({
      ...referenceResources,
      decodedTextureBytes: REALTIME_BUDGETS.maxDecodedTextureBytes + 1,
    });
    const downgrade = vi.fn();
    const runtime = createRealtimeRuntime({
      loadScene: async () => oversized,
      onDowngrade: downgrade,
      presentation: presentation(),
    });

    await runtime.start();

    expect(runtime.getSnapshot()).toMatchObject({
      fallbackReason: "resource-budget",
      phase: "fallback",
    });
    expect(oversized.dispose).toHaveBeenCalledOnce();
    expect(downgrade).toHaveBeenCalledWith("resource-budget");

    const taskScene = scene();
    const taskRuntime = createRealtimeRuntime({
      loadScene: async ({ recordStartupTask }) => {
        recordStartupTask(101);
        return taskScene;
      },
      presentation: presentation(),
    });
    await taskRuntime.start();
    expect(taskRuntime.getSnapshot()).toMatchObject({
      fallbackReason: "performance",
      phase: "fallback",
    });
    expect(taskScene.dispose).toHaveBeenCalledOnce();

    const interactionScene = scene();
    const interactionRuntime = createRealtimeRuntime({
      loadScene: async () => interactionScene,
      presentation: presentation(),
    });
    await interactionRuntime.start();
    interactionRuntime.recordTask("interaction", 51);
    expect(interactionRuntime.getSnapshot()).toMatchObject({
      fallbackReason: "performance",
      phase: "fallback",
    });
    expect(interactionScene.dispose).toHaveBeenCalledOnce();
  });

  it("reduces effects and DPR before sustained-frame fallback", async () => {
    const loadedScene = scene();
    const downgrade = vi.fn();
    const runtime = createRealtimeRuntime({
      devicePixelRatio: 2,
      loadScene: async () => loadedScene,
      onDowngrade: downgrade,
      presentation: presentation(),
      viewport: "desktop",
    });
    await runtime.start();

    runtime.recordFrameWindow({ durationMs: 2_000, frames: 58 });
    expect(runtime.getSnapshot()).toMatchObject({
      phase: "ready",
      quality: { dpr: 1.5, effects: "reduced" },
    });
    expect(loadedScene.setEffects).toHaveBeenCalledWith("reduced");
    expect(loadedScene.resize).toHaveBeenLastCalledWith({ dpr: 1.5 });

    runtime.recordFrameWindow({ durationMs: 2_000, frames: 59 });
    expect(runtime.getSnapshot()).toMatchObject({
      fallbackReason: "performance",
      phase: "fallback",
    });
    expect(downgrade).toHaveBeenCalledWith("performance");
    expect(loadedScene.dispose).toHaveBeenCalledOnce();
  });

  it("measures sustained frame windows from the owned loop", async () => {
    const scheduler = frameScheduler();
    const loadedScene = scene();
    const runtime = createRealtimeRuntime({
      cancelFrame: scheduler.cancelFrame,
      initialActivity: { requiresFrames: true },
      loadScene: async () => loadedScene,
      presentation: presentation(),
      requestFrame: scheduler.requestFrame,
    });
    await runtime.start();

    for (let timestamp = 0; timestamp <= 4_080; timestamp += 40) {
      scheduler.run(timestamp);
    }

    expect(runtime.getSnapshot()).toMatchObject({
      fallbackReason: "performance",
      phase: "fallback",
    });
    expect(loadedScene.setEffects).toHaveBeenCalledWith("reduced");
    expect(loadedScene.dispose).toHaveBeenCalledOnce();
  });

  it("renders once on readiness and invalidation without retaining an idle loop", async () => {
    const scheduler = frameScheduler();
    const loadedScene = scene();
    const runtime = createRealtimeRuntime({
      cancelFrame: scheduler.cancelFrame,
      loadScene: async () => loadedScene,
      presentation: presentation(),
      requestFrame: scheduler.requestFrame,
    });
    await runtime.start();

    expect(scheduler.callbacks).toHaveLength(1);
    scheduler.run(16);
    expect(loadedScene.render).toHaveBeenCalledOnce();
    expect(scheduler.callbacks).toHaveLength(0);

    runtime.invalidate();
    runtime.invalidate();
    expect(scheduler.callbacks).toHaveLength(1);
    scheduler.run(32);
    expect(loadedScene.render).toHaveBeenCalledTimes(2);
    expect(scheduler.callbacks).toHaveLength(0);

    runtime.resize();
    expect(loadedScene.resize).toHaveBeenCalledTimes(2);
    expect(scheduler.callbacks).toHaveLength(1);
    scheduler.run(48);
    expect(loadedScene.render).toHaveBeenCalledTimes(3);

    runtime.setActivity({ hidden: true });
    runtime.invalidate();
    expect(scheduler.callbacks).toHaveLength(0);
    runtime.setActivity({ hidden: false });
    expect(scheduler.callbacks).toHaveLength(1);
  });

  it("suspends one frame loop for every inactive reason and disposes idempotently", async () => {
    const scheduler = frameScheduler();
    const loadedScene = scene();
    const runtime = createRealtimeRuntime({
      cancelFrame: scheduler.cancelFrame,
      initialActivity: { requiresFrames: true },
      loadScene: async () => loadedScene,
      presentation: presentation(),
      requestFrame: scheduler.requestFrame,
    });
    await runtime.start();

    expect(scheduler.callbacks).toHaveLength(1);
    runtime.setActivity({ hidden: true });
    runtime.setActivity({ covered: true, hidden: true, offscreen: true });
    expect(runtime.getSnapshot().phase).toBe("suspended");
    expect(scheduler.callbacks).toHaveLength(0);

    runtime.setActivity({ hidden: false });
    expect(scheduler.callbacks).toHaveLength(0);
    runtime.setActivity({ covered: false, offscreen: false });
    expect(runtime.getSnapshot().phase).toBe("ready");
    expect(scheduler.callbacks).toHaveLength(1);

    scheduler.run(16);
    expect(loadedScene.render).toHaveBeenCalledOnce();
    expect(scheduler.callbacks).toHaveLength(1);

    runtime.setActivity({ complete: true });
    expect(scheduler.callbacks).toHaveLength(0);
    runtime.dispose();
    runtime.dispose();
    expect(loadedScene.dispose).toHaveBeenCalledOnce();
    expect(runtime.getSnapshot().phase).toBe("disposed");
  });

  it("selects fallback when a completed startup misses the four-second target", async () => {
    let elapsed = 0;
    const lateScene = scene();
    const runtime = createRealtimeRuntime({
      loadScene: async () => {
        elapsed = REALTIME_BUDGETS.startupTargetMs + 1;
        return lateScene;
      },
      now: () => elapsed,
      presentation: presentation(),
    });

    await runtime.start();

    expect(runtime.getSnapshot()).toMatchObject({
      fallbackReason: "startup-timeout",
      phase: "fallback",
    });
    expect(lateScene.dispose).toHaveBeenCalledOnce();
  });

  it("keeps context loss and startup timeout local and ignores stale completion", async () => {
    vi.useFakeTimers();
    try {
      let contextLost: (() => void) | undefined;
      const loadedScene = scene();
      const runtime = createRealtimeRuntime({
        loadScene: async ({ onContextLost }) => {
          contextLost = onContextLost;
          return loadedScene;
        },
        presentation: presentation(),
      });
      await runtime.start();
      contextLost?.();
      expect(runtime.getSnapshot()).toMatchObject({
        fallbackReason: "runtime-failure",
        phase: "fallback",
      });
      expect(loadedScene.dispose).toHaveBeenCalledOnce();

      let resolveLoad: ((value: RealtimeRuntimeScene) => void) | undefined;
      const staleScene = scene();
      const timeoutRuntime = createRealtimeRuntime({
        loadScene: () =>
          new Promise((resolve) => {
            resolveLoad = resolve;
          }),
        presentation: presentation(),
      });
      const starting = timeoutRuntime.start();
      await vi.advanceTimersByTimeAsync(REALTIME_BUDGETS.startupTimeoutMs);
      expect(timeoutRuntime.getSnapshot()).toMatchObject({
        fallbackReason: "startup-timeout",
        phase: "fallback",
      });
      resolveLoad?.(staleScene);
      await starting;
      expect(staleScene.dispose).toHaveBeenCalledOnce();
      expect(timeoutRuntime.getSnapshot().phase).toBe("fallback");
    } finally {
      vi.useRealTimers();
    }
  });
});

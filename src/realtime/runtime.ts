import type {
  PresentationFallbackReason,
  PresentationSession,
} from "@/src/continuity/presentation";

import {
  cappedRealtimeDpr,
  realtimeResourceViolations,
  REALTIME_BUDGETS,
  type RealtimeResourceReport,
  type RealtimeViewport,
} from "./budgets";

export type RealtimeEffects = "full" | "reduced";
export type RealtimeRuntimePhase =
  | "idle"
  | "loading"
  | "ready"
  | "suspended"
  | "fallback"
  | "disposed";
export type RealtimeDowngradeReason = Extract<
  PresentationFallbackReason,
  "resource-budget" | "startup-timeout" | "runtime-failure" | "performance"
>;

export type RealtimeRuntimeScene = {
  readonly resources: RealtimeResourceReport;
  resize(quality: { dpr: number }): void;
  setEffects(effects: RealtimeEffects): void;
  render(timestampMs: number): void;
  dispose(): void;
};

export type RealtimeSceneLoader = (context: {
  signal: AbortSignal;
  onContextLost(): void;
  recordStartupTask(durationMs: number): void;
}) => Promise<RealtimeRuntimeScene>;

export type RealtimeActivity = {
  hidden: boolean;
  offscreen: boolean;
  complete: boolean;
  covered: boolean;
  requiresFrames: boolean;
};

export type RealtimeRuntimeSnapshot = {
  phase: RealtimeRuntimePhase;
  fallbackReason: PresentationFallbackReason | null;
  quality: { dpr: number; effects: RealtimeEffects };
  resources: RealtimeResourceReport | null;
  consecutivePoorWindows: number;
};

export type RealtimeRuntime = {
  dispose(): void;
  getSnapshot(): RealtimeRuntimeSnapshot;
  invalidate(): void;
  recordFrameWindow(window: { durationMs: number; frames: number }): void;
  recordTask(kind: "startup" | "interaction", durationMs: number): void;
  resize(update?: {
    viewport?: RealtimeViewport;
    devicePixelRatio?: number;
  }): void;
  setActivity(activity: Partial<RealtimeActivity>): void;
  start(): Promise<void>;
  subscribe(listener: () => void): () => void;
};

type RuntimeOptions = {
  presentation: PresentationSession;
  loadScene: RealtimeSceneLoader;
  viewport?: RealtimeViewport;
  devicePixelRatio?: number;
  initialActivity?: Partial<RealtimeActivity>;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (id: number) => void;
  setTimeout?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimeout?: (timer: ReturnType<typeof setTimeout>) => void;
  onDowngrade?: (reason: RealtimeDowngradeReason) => void;
};

const defaultActivity: RealtimeActivity = {
  hidden: false,
  offscreen: false,
  complete: false,
  covered: false,
  requiresFrames: false,
};

function browserRequestFrame(callback: FrameRequestCallback): number {
  return requestAnimationFrame(callback);
}

function browserCancelFrame(id: number): void {
  cancelAnimationFrame(id);
}

function isExternallySuspended(activity: RealtimeActivity): boolean {
  return (
    activity.hidden ||
    activity.offscreen ||
    activity.complete ||
    activity.covered
  );
}

export function createRealtimeRuntime(options: RuntimeOptions): RealtimeRuntime {
  let viewport = options.viewport ?? "desktop";
  let devicePixelRatio = options.devicePixelRatio ?? 1;
  const listeners = new Set<() => void>();
  const now = options.now ?? (() => performance.now());
  const requestFrame = options.requestFrame ?? browserRequestFrame;
  const cancelFrame = options.cancelFrame ?? browserCancelFrame;
  const scheduleTimeout = options.setTimeout ?? setTimeout;
  const cancelTimeout = options.clearTimeout ?? clearTimeout;
  const activity = { ...defaultActivity, ...options.initialActivity };
  let snapshot: RealtimeRuntimeSnapshot = {
    phase: "idle",
    fallbackReason: null,
    quality: {
      dpr: cappedRealtimeDpr(devicePixelRatio, viewport),
      effects: "full",
    },
    resources: null,
    consecutivePoorWindows: 0,
  };
  let scene: RealtimeRuntimeScene | null = null;
  let frameId: number | null = null;
  let startupTimer: ReturnType<typeof setTimeout> | null = null;
  let startupAbort: AbortController | null = null;
  let startPromise: Promise<void> | null = null;
  let generation = 0;
  let frameWindowStartedAt: number | null = null;
  let framesInWindow = 0;
  let pendingFrame = false;
  let hasRenderedFrame = false;

  function publish(patch: Partial<RealtimeRuntimeSnapshot>): void {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }

  function clearStartupTimer(): void {
    if (startupTimer === null) return;
    cancelTimeout(startupTimer);
    startupTimer = null;
  }

  function cancelLoop(): void {
    frameWindowStartedAt = null;
    framesInWindow = 0;
    if (frameId === null) return;
    cancelFrame(frameId);
    frameId = null;
  }

  function disposeScene(): void {
    if (!scene) return;
    const owned = scene;
    scene = null;
    owned.dispose();
  }

  function fallback(reason: RealtimeDowngradeReason): void {
    if (snapshot.phase === "fallback" || snapshot.phase === "disposed") return;
    generation += 1;
    clearStartupTimer();
    startupAbort?.abort();
    startupAbort = null;
    pendingFrame = false;
    cancelLoop();
    disposeScene();
    publish({ phase: "fallback", fallbackReason: reason });
    options.onDowngrade?.(reason);
  }

  function evaluateTask(
    kind: "startup" | "interaction",
    durationMs: number,
  ): void {
    if (snapshot.phase === "fallback" || snapshot.phase === "disposed") return;
    const ceiling =
      kind === "startup"
        ? REALTIME_BUDGETS.maxStartupTaskMs
        : REALTIME_BUDGETS.maxInteractionTaskMs;
    if (durationMs > ceiling) fallback("performance");
  }

  function evaluateFrameWindow(window: {
    durationMs: number;
    frames: number;
  }): void {
    if (snapshot.phase !== "ready" || window.durationMs <= 0) return;
    const fps = (window.frames * 1_000) / window.durationMs;
    if (fps >= REALTIME_BUDGETS.frameFloorFps) {
      if (snapshot.consecutivePoorWindows !== 0) {
        publish({ consecutivePoorWindows: 0 });
      }
      return;
    }

    const consecutivePoorWindows = snapshot.consecutivePoorWindows + 1;
    if (consecutivePoorWindows === 1 && scene) {
      const dpr = Math.max(1, snapshot.quality.dpr * 0.75);
      try {
        scene.setEffects("reduced");
        scene.resize({ dpr });
      } catch {
        fallback("runtime-failure");
        return;
      }
      publish({
        consecutivePoorWindows,
        quality: { dpr, effects: "reduced" },
      });
      return;
    }
    if (consecutivePoorWindows >= 2) fallback("performance");
  }

  function observeRenderedFrame(timestamp: number): void {
    if (frameWindowStartedAt === null) {
      frameWindowStartedAt = timestamp;
      framesInWindow = 1;
      return;
    }
    framesInWindow += 1;
    const durationMs = timestamp - frameWindowStartedAt;
    if (durationMs < REALTIME_BUDGETS.frameWindowMs) return;
    evaluateFrameWindow({ durationMs, frames: framesInWindow });
    frameWindowStartedAt = timestamp;
    framesInWindow = 0;
  }

  function renderFrame(timestamp: number): void {
    frameId = null;
    if (
      snapshot.phase !== "ready" ||
      !scene ||
      isExternallySuspended(activity) ||
      (!activity.requiresFrames && !pendingFrame)
    ) {
      return;
    }
    pendingFrame = false;
    const startedAt = now();
    try {
      scene.render(timestamp);
    } catch {
      fallback("runtime-failure");
      return;
    }
    const duration = Math.max(0, now() - startedAt);
    const frameTaskCeiling = hasRenderedFrame
      ? REALTIME_BUDGETS.maxInteractionTaskMs
      : REALTIME_BUDGETS.maxStartupTaskMs;
    hasRenderedFrame = true;
    if (duration > frameTaskCeiling) {
      fallback("performance");
      return;
    }
    observeRenderedFrame(timestamp);
    scheduleLoop();
  }

  function scheduleLoop(): void {
    if (
      frameId !== null ||
      snapshot.phase !== "ready" ||
      !scene ||
      isExternallySuspended(activity) ||
      (!activity.requiresFrames && !pendingFrame)
    ) {
      return;
    }
    frameId = requestFrame(renderFrame);
  }

  function synchronizeActivity(): void {
    if (snapshot.phase !== "ready" && snapshot.phase !== "suspended") return;
    if (isExternallySuspended(activity)) {
      cancelLoop();
      if (snapshot.phase !== "suspended") publish({ phase: "suspended" });
      return;
    }
    if (snapshot.phase !== "ready") publish({ phase: "ready" });
    if (activity.requiresFrames || pendingFrame) scheduleLoop();
    else cancelLoop();
  }

  async function start(): Promise<void> {
    if (startPromise) return startPromise;
    if (snapshot.phase !== "idle") return;
    if (
      options.presentation.selectedTier !== "realtime" ||
      !options.presentation.eligibility.realtime ||
      options.presentation.realtimeDeclined
    ) {
      publish({
        phase: "fallback",
        fallbackReason: options.presentation.fallbackReason ?? "capability",
      });
      return;
    }

    const currentGeneration = generation + 1;
    generation = currentGeneration;
    const controller = new AbortController();
    startupAbort = controller;
    const startedAt = now();
    publish({ phase: "loading" });
    startupTimer = scheduleTimeout(
      () => fallback("startup-timeout"),
      REALTIME_BUDGETS.startupTimeoutMs,
    );

    startPromise = options
      .loadScene({
        signal: controller.signal,
        onContextLost: () => fallback("runtime-failure"),
        recordStartupTask: (durationMs) => evaluateTask("startup", durationMs),
      })
      .then((loadedScene) => {
        if (
          generation !== currentGeneration ||
          snapshot.phase !== "loading" ||
          controller.signal.aborted
        ) {
          loadedScene.dispose();
          return;
        }
        clearStartupTimer();
        startupAbort = null;
        if (now() - startedAt > REALTIME_BUDGETS.startupTargetMs) {
          loadedScene.dispose();
          fallback("startup-timeout");
          return;
        }
        if (realtimeResourceViolations(loadedScene.resources).length > 0) {
          loadedScene.dispose();
          fallback("resource-budget");
          return;
        }

        scene = loadedScene;
        try {
          scene.setEffects(snapshot.quality.effects);
          scene.resize({ dpr: snapshot.quality.dpr });
        } catch {
          fallback("runtime-failure");
          return;
        }
        publish({
          phase: isExternallySuspended(activity) ? "suspended" : "ready",
          fallbackReason: null,
          resources: loadedScene.resources,
        });
        pendingFrame = true;
        scheduleLoop();
      })
      .catch(() => {
        if (generation === currentGeneration && snapshot.phase === "loading") {
          fallback("runtime-failure");
        }
      })
      .finally(() => {
        if (generation === currentGeneration) startPromise = null;
      });
    return startPromise;
  }

  return {
    start,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    invalidate() {
      if (snapshot.phase !== "ready" && snapshot.phase !== "suspended") return;
      pendingFrame = true;
      synchronizeActivity();
    },
    resize(update) {
      viewport = update?.viewport ?? viewport;
      devicePixelRatio = update?.devicePixelRatio ?? devicePixelRatio;
      const cappedDpr = cappedRealtimeDpr(devicePixelRatio, viewport);
      const dpr =
        snapshot.quality.effects === "reduced"
          ? Math.min(cappedDpr, snapshot.quality.dpr)
          : cappedDpr;
      if (dpr !== snapshot.quality.dpr) {
        publish({ quality: { ...snapshot.quality, dpr } });
      }
      if (!scene || (snapshot.phase !== "ready" && snapshot.phase !== "suspended")) {
        return;
      }
      try {
        scene.resize({ dpr });
        pendingFrame = true;
        synchronizeActivity();
      } catch {
        fallback("runtime-failure");
      }
    },
    setActivity(patch) {
      Object.assign(activity, patch);
      synchronizeActivity();
    },
    recordFrameWindow: evaluateFrameWindow,
    recordTask: evaluateTask,
    dispose() {
      if (snapshot.phase === "disposed") return;
      generation += 1;
      clearStartupTimer();
      startupAbort?.abort();
      startupAbort = null;
      pendingFrame = false;
      cancelLoop();
      disposeScene();
      publish({ phase: "disposed" });
      listeners.clear();
    },
  };
}

import type {
  AudioControlMeasurement,
  MorphAudioEngine,
  MorphAudioEngineFactory,
} from "@/src/audio/contracts";
import type { MorphValues } from "./controls";

export type AudioTransportState =
  | "off"
  | "preparing"
  | "playing"
  | "paused"
  | "interrupted"
  | "unavailable";

export type AudioTransportAction =
  | { type: "prepare" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "interrupt" }
  | { type: "fail" };

export function reduceAudioTransport(
  state: AudioTransportState,
  action: AudioTransportAction,
): AudioTransportState {
  switch (action.type) {
    case "prepare":
      return state === "playing" ? state : "preparing";
    case "play":
      return "playing";
    case "pause":
      return state === "off" || state === "unavailable" ? state : "paused";
    case "interrupt":
      return state === "off" || state === "unavailable"
        ? state
        : "interrupted";
    case "fail":
      return "unavailable";
  }
}

export type EnableSoundResult =
  | {
      ok: true;
      firstSoundLatencyMs: number;
      warm: boolean;
    }
  | {
      ok: false;
      reason:
        | "audio-engine-unavailable"
        | "interrupted"
        | "preparation-timeout";
    };

export type AudioEngineModule = {
  createMorphAudioEngine: MorphAudioEngineFactory;
};

export type AudioTransportController = {
  dispose(): Promise<void>;
  enableFromTrustedGesture(): Promise<EnableSoundResult>;
  getSnapshot(): AudioTransportState;
  pause(reason?: "interruption" | "user"): void;
  subscribe(listener: () => void): () => void;
  update(
    values: Readonly<MorphValues>,
    inputAtMs: number,
  ): AudioControlMeasurement | null;
};

export function createAudioTransportController({
  loadEngine,
  readValues,
  now = () => performance.now(),
  preparationTimeoutMs = 2_000,
}: {
  loadEngine(): Promise<AudioEngineModule>;
  readValues(): Readonly<MorphValues>;
  now?: () => number;
  preparationTimeoutMs?: number;
}): AudioTransportController {
  type PreparationAttempt = {
    cancellation: Promise<EnableSoundResult>;
    cancel(result: EnableSoundResult): void;
    engine: MorphAudioEngine | null;
  };

  let state: AudioTransportState = "off";
  let engine: MorphAudioEngine | null = null;
  let disposed = false;
  let activeAttempt: PreparationAttempt | null = null;
  let pending: Promise<EnableSoundResult> | null = null;
  const disposalOperations = new WeakMap<MorphAudioEngine, Promise<void>>();
  const listeners = new Set<() => void>();

  function publish(action: AudioTransportAction): void {
    const next = reduceAudioTransport(state, action);
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  }

  function disposeEngine(target: MorphAudioEngine): Promise<void> {
    const existing = disposalOperations.get(target);
    if (existing) return existing;
    target.pause();
    const operation = Promise.resolve()
      .then(() => target.dispose())
      // Teardown failure belongs to the already unavailable optional audio
      // subsystem. It must not escape and replace otherwise useful route UI.
      .catch(() => undefined);
    disposalOperations.set(target, operation);
    return operation;
  }

  function detachEngine(target: MorphAudioEngine): Promise<void> {
    if (engine === target) engine = null;
    return disposeEngine(target);
  }

  function cancelAttempt(
    attempt: PreparationAttempt,
    result: EnableSoundResult,
  ): Promise<void> {
    if (activeAttempt === attempt) {
      activeAttempt = null;
      pending = null;
    }
    attempt.cancel(result);
    return attempt.engine ? detachEngine(attempt.engine) : Promise.resolve();
  }

  function isCurrent(attempt: PreparationAttempt): boolean {
    return !disposed && activeAttempt === attempt;
  }

  async function prepareEngine(
    attempt: PreparationAttempt,
  ): Promise<MorphAudioEngine> {
    if (engine) {
      attempt.engine = engine;
      return engine;
    }
    const loadedModule = await loadEngine();
    if (!isCurrent(attempt)) {
      throw new Error("Audio preparation was superseded");
    }
    const ownership: { current: MorphAudioEngine | null } = { current: null };
    const prepared = loadedModule.createMorphAudioEngine({
      onEvent(event) {
        if (event.type === "interrupted" && engine === ownership.current) {
          interrupt("interruption");
        }
      },
    });
    ownership.current = prepared;
    attempt.engine = prepared;
    engine = prepared;
    return prepared;
  }

  async function runAttempt(
    attempt: PreparationAttempt,
    startedAt: number,
    warm: boolean,
  ): Promise<EnableSoundResult> {
    try {
      const prepared = await prepareEngine(attempt);
      const measurement = await prepared.play(readValues());
      if (!isCurrent(attempt)) {
        await detachEngine(prepared);
        return { ok: false, reason: "interrupted" };
      }
      activeAttempt = null;
      pending = null;
      publish({ type: "play" });
      return {
        ok: true,
        firstSoundLatencyMs: Math.max(
          0,
          measurement.firstSoundScheduledAtMs - startedAt,
        ),
        warm,
      };
    } catch {
      if (!isCurrent(attempt)) {
        return { ok: false, reason: "interrupted" };
      }
      if (attempt.engine) await detachEngine(attempt.engine);
      if (!isCurrent(attempt)) {
        return { ok: false, reason: "interrupted" };
      }
      activeAttempt = null;
      pending = null;
      publish({ type: "fail" });
      return { ok: false, reason: "audio-engine-unavailable" };
    }
  }

  function interrupt(reason: "interruption" | "user"): void {
    if (state !== "playing" && state !== "preparing") return;
    const attempt = activeAttempt;
    if (attempt) {
      void cancelAttempt(attempt, { ok: false, reason: "interrupted" });
    } else {
      engine?.pause();
    }
    publish({ type: reason === "interruption" ? "interrupt" : "pause" });
  }

  async function enable(): Promise<EnableSoundResult> {
    // App Router/BFCache restoration can reactivate the same controller object
    // after its route-owned engine was disposed. Rebuild only after a new
    // trusted gesture; never resume as part of restoration itself.
    if (disposed) disposed = false;
    if (state === "playing") {
      interrupt("user");
      return { ok: true, firstSoundLatencyMs: 0, warm: true };
    }
    if (pending && activeAttempt) return pending;

    let resolveCancellation!: (result: EnableSoundResult) => void;
    const attempt: PreparationAttempt = {
      cancellation: new Promise((resolve) => {
        resolveCancellation = resolve;
      }),
      cancel: resolveCancellation,
      engine: null,
    };
    const startedAt = now();
    const warm = engine !== null;
    activeAttempt = attempt;
    publish({ type: "prepare" });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<EnableSoundResult>((resolve) => {
      timeoutHandle = setTimeout(() => {
        if (!isCurrent(attempt)) {
          resolve({ ok: false, reason: "interrupted" });
          return;
        }
        void cancelAttempt(attempt, {
          ok: false,
          reason: "preparation-timeout",
        });
        publish({ type: "fail" });
        resolve({ ok: false, reason: "preparation-timeout" });
      }, preparationTimeoutMs);
    });
    const operation = Promise.race([
      runAttempt(attempt, startedAt, warm),
      attempt.cancellation,
      timeout,
    ]);
    pending = operation;
    return operation.finally(() => {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      if (activeAttempt === attempt) activeAttempt = null;
      if (pending === operation) pending = null;
    });
  }

  return {
    async dispose() {
      if (disposed) return;
      disposed = true;
      const attempt = activeAttempt;
      const activeEngine = engine;
      if (attempt) {
        await cancelAttempt(attempt, { ok: false, reason: "interrupted" });
      }
      engine = null;
      publish({ type: "interrupt" });
      if (activeEngine) await disposeEngine(activeEngine);
    },
    enableFromTrustedGesture: enable,
    getSnapshot: () => state,
    pause(reason = "user") {
      interrupt(reason);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(values, inputAtMs) {
      if (state !== "playing") return null;
      return engine?.update(values, inputAtMs) ?? null;
    },
  };
}

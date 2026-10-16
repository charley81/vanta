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
      reason: "audio-engine-unavailable" | "preparation-timeout";
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
  let state: AudioTransportState = "off";
  let engine: MorphAudioEngine | null = null;
  let disposed = false;
  let attempt = 0;
  let pending: Promise<EnableSoundResult> | null = null;
  const listeners = new Set<() => void>();

  function publish(action: AudioTransportAction): void {
    const next = reduceAudioTransport(state, action);
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  }

  async function prepareEngine(
    currentAttempt: number,
  ): Promise<MorphAudioEngine> {
    if (engine) return engine;
    const loadedModule = await loadEngine();
    if (disposed || currentAttempt !== attempt) {
      throw new Error("Audio preparation was superseded");
    }
    const prepared = loadedModule.createMorphAudioEngine({
      onEvent(event) {
        if (event.type === "interrupted" && engine === prepared) {
          publish({ type: "interrupt" });
        }
      },
    });
    engine = prepared;
    return prepared;
  }

  async function enable(): Promise<EnableSoundResult> {
    // App Router/BFCache restoration can reactivate the same controller object
    // after its route-owned engine was disposed. Rebuild only after a new
    // trusted gesture; never resume as part of restoration itself.
    if (disposed) disposed = false;
    if (state === "playing") {
      engine?.pause();
      publish({ type: "pause" });
      return { ok: true, firstSoundLatencyMs: 0, warm: true };
    }
    if (pending) return pending;

    const currentAttempt = ++attempt;
    const startedAt = now();
    const warm = engine !== null;
    publish({ type: "prepare" });
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const operation = Promise.race([
      prepareEngine(currentAttempt).then(async (prepared) => {
        const measurement = await prepared.play(readValues());
        if (disposed || currentAttempt !== attempt) {
          if (engine === prepared) engine = null;
          await prepared.dispose();
          throw new Error("Audio preparation was superseded");
        }
        publish({ type: "play" });
        return {
          ok: true,
          firstSoundLatencyMs: Math.max(
            0,
            measurement.firstSoundScheduledAtMs - startedAt,
          ),
          warm,
        } satisfies EnableSoundResult;
      }),
      new Promise<EnableSoundResult>((resolve) => {
        timeoutHandle = setTimeout(() => {
          if (currentAttempt !== attempt) return;
          attempt += 1;
          const timedOutEngine = engine;
          engine = null;
          void timedOutEngine?.dispose();
          publish({ type: "fail" });
          resolve({ ok: false, reason: "preparation-timeout" });
        }, preparationTimeoutMs);
      }),
    ]).catch(async () => {
      if (!disposed && currentAttempt === attempt) {
        const failedEngine = engine;
        engine = null;
        await failedEngine?.dispose();
        publish({ type: "fail" });
      }
      return {
        ok: false,
        reason: "audio-engine-unavailable",
      } satisfies EnableSoundResult;
    });
    pending = operation;
    return operation.finally(() => {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      if (pending === operation) pending = null;
    });
  }

  return {
    async dispose() {
      if (disposed) return;
      disposed = true;
      attempt += 1;
      pending = null;
      const activeEngine = engine;
      engine = null;
      publish({ type: "interrupt" });
      await activeEngine?.dispose();
    },
    enableFromTrustedGesture: enable,
    getSnapshot: () => state,
    pause(reason = "user") {
      if (state !== "playing" && state !== "preparing") return;
      attempt += 1;
      pending = null;
      engine?.pause();
      publish({ type: reason === "interruption" ? "interrupt" : "pause" });
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

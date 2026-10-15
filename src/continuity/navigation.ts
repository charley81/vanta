import { CANONICAL_ROUTES, type CanonicalRoute } from "./history";
import type { Unsubscribe } from "./store";

export type RouteIntentState =
  | { status: "idle" }
  | {
      status: "pending";
      id: number;
      destination: CanonicalRoute;
      progressVisible: boolean;
    }
  | { status: "committed"; id: number; destination: CanonicalRoute }
  | {
      status: "failed";
      id: number;
      destination: CanonicalRoute;
      error: "navigation-failed";
    };

export type RouteAttempt = (signal: AbortSignal) => Promise<void>;
export type RouteIntent = { id: number; settled: Promise<void> };
export type TimerScheduler = {
  set(delayMs: number, callback: () => void): unknown;
  clear(handle: unknown): void;
};

const browserTimerScheduler: TimerScheduler = {
  set: (delayMs, callback) => globalThis.setTimeout(callback, delayMs),
  clear: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type RouteIntentController = {
  cancel(): void;
  getSnapshot(): RouteIntentState;
  retry(): RouteIntent | null;
  start(destination: CanonicalRoute, attempt: RouteAttempt): RouteIntent;
  subscribe(listener: () => void): Unsubscribe;
};

export function createRouteIntentController({
  progressDelayMs = 100,
  scheduler = browserTimerScheduler,
}: {
  progressDelayMs?: number;
  scheduler?: TimerScheduler;
} = {}): RouteIntentController {
  let state: RouteIntentState = { status: "idle" };
  let nextId = 1;
  let activeAbort: AbortController | null = null;
  let progressTimer: unknown;
  let retryAttempt: { destination: CanonicalRoute; attempt: RouteAttempt } | null = null;
  const listeners = new Set<() => void>();

  function publish(next: RouteIntentState) {
    state = next;
    listeners.forEach((listener) => listener());
  }

  function clearProgressTimer() {
    if (progressTimer !== undefined) scheduler.clear(progressTimer);
    progressTimer = undefined;
  }

  function cancel() {
    clearProgressTimer();
    activeAbort?.abort();
    activeAbort = null;
    if (state.status === "pending") publish({ status: "idle" });
  }

  function start(destination: CanonicalRoute, attempt: RouteAttempt): RouteIntent {
    if (!CANONICAL_ROUTES.includes(destination)) {
      throw new Error("Route intents accept canonical VANTA routes only");
    }
    cancel();
    const id = nextId++;
    const abort = new AbortController();
    activeAbort = abort;
    retryAttempt = { destination, attempt };
    publish({ status: "pending", id, destination, progressVisible: false });
    progressTimer = scheduler.set(progressDelayMs, () => {
      if (state.status === "pending" && state.id === id) {
        publish({ ...state, progressVisible: true });
      }
    });

    const settled = Promise.resolve()
      .then(() => {
        if (abort.signal.aborted) return;
        return attempt(abort.signal);
      })
      .then(() => {
        if (abort.signal.aborted || activeAbort !== abort) return;
        clearProgressTimer();
        activeAbort = null;
        retryAttempt = null;
        publish({ status: "committed", id, destination });
      })
      .catch(() => {
        if (abort.signal.aborted || activeAbort !== abort) return;
        clearProgressTimer();
        activeAbort = null;
        publish({ status: "failed", id, destination, error: "navigation-failed" });
      });

    return { id, settled };
  }

  return {
    cancel,
    getSnapshot: () => state,
    retry() {
      if (state.status !== "failed" || !retryAttempt) return null;
      return start(retryAttempt.destination, retryAttempt.attempt);
    },
    start,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type ActiveSurface = "bag" | "menu" | "preview" | "route" | null;
export type SurfaceState = { active: ActiveSurface };
export type SurfaceEvent =
  | { type: "bag-open" }
  | { type: "menu-open" }
  | { type: "preview-transition" }
  | { type: "route-start" }
  | { type: "transition-end" }
  | { type: "prefetch" };

export type SurfaceDecision = {
  state: SurfaceState;
  cancelPendingRoute: boolean;
};

export function arbitrateSurface(
  state: SurfaceState,
  event: SurfaceEvent,
): SurfaceDecision {
  if (event.type === "prefetch") {
    return { state, cancelPendingRoute: false };
  }
  if (event.type === "transition-end") {
    return { state: { active: null }, cancelPendingRoute: false };
  }

  const next = event.type.replace(/-(open|start|transition)$/, "") as Exclude<
    ActiveSurface,
    null
  >;
  return {
    state: { active: next },
    cancelPendingRoute: state.active === "route" && event.type === "bag-open",
  };
}

export type NavigationSignal = "intent" | "commit" | "prefetch";

export function countsAsRouteEntry(signal: NavigationSignal): boolean {
  return signal === "commit";
}

import "client-only";

import type {
  BagCoordinator,
  BagCoordinatorState,
} from "./coordinator";

const INITIAL_STATE: BagCoordinatorState = {
  confirmed: null,
  error: null,
  open: false,
  pending: null,
  stale: false,
};

type BagGlobal = typeof globalThis & {
  __vantaDeferredBagCoordinator?: BagCoordinator;
};

export function createDeferredBagCoordinator(): BagCoordinator {
  const scope = globalThis as BagGlobal;
  scope.__vantaDeferredBagCoordinator ??= initializeDeferredBagCoordinator();
  return scope.__vantaDeferredBagCoordinator;
}

function initializeDeferredBagCoordinator(): BagCoordinator {
  let coordinator: BagCoordinator | null = null;
  let loading: Promise<BagCoordinator> | null = null;
  let state = INITIAL_STATE;
  const listeners = new Set<() => void>();

  function publish() {
    if (coordinator) state = coordinator.getSnapshot();
    listeners.forEach((listener) => listener());
  }

  function load(): Promise<BagCoordinator> {
    loading ??= Promise.all([import("./client"), import("./coordinator")]).then(
      ([clientModule, coordinatorModule]) => {
        coordinator = coordinatorModule.createBagCoordinator(
          clientModule.createBagClient(),
        );
        coordinator.subscribe(publish);
        if (state.stale) coordinator.invalidate();
        publish();
        return coordinator;
      },
    );
    return loading;
  }

  return {
    add: async () => (await load()).add(),
    cancelPendingOpen: () => coordinator?.cancelPendingOpen(),
    close: () => coordinator?.close(),
    confirm: async () => (await load()).confirm(),
    getSnapshot: () => state,
    invalidate() {
      if (coordinator) {
        coordinator.invalidate();
      } else if (!state.stale) {
        state = { ...state, stale: true };
        publish();
      }
    },
    open: async () => (await load()).open(),
    refreshIfStale: async () =>
      coordinator ? coordinator.refreshIfStale() : true,
    remove: async () => (await load()).remove(),
    retry: async () => (await load()).retry(),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

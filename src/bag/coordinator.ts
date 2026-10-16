import "client-only";

import {
  BagClientError,
  type BagClient,
  type BagSnapshot,
} from "./client";

export type BagOperation = "read" | "add" | "remove";

export type BagCoordinatorError = {
  operation: BagOperation;
  message: string;
};

export type BagCoordinatorState = {
  confirmed: BagSnapshot | null;
  error: BagCoordinatorError | null;
  open: boolean;
  pending: BagOperation | null;
  stale: boolean;
};

export type BagCoordinator = {
  add(): Promise<boolean>;
  cancelPendingOpen(): void;
  close(): void;
  confirm(): Promise<boolean>;
  getSnapshot(): BagCoordinatorState;
  invalidate(): void;
  open(): Promise<boolean>;
  refreshIfStale(): Promise<boolean>;
  remove(): Promise<boolean>;
  retry(): Promise<boolean>;
  subscribe(listener: () => void): () => void;
};

function errorMessage(error: unknown): string {
  return error instanceof BagClientError
    ? error.message
    : "Bag is temporarily unavailable.";
}

export function createBagCoordinator(client: BagClient): BagCoordinator {
  let state: BagCoordinatorState = {
    confirmed: client.getConfirmed(),
    error: null,
    open: false,
    pending: null,
    stale: false,
  };
  const listeners = new Set<() => void>();
  let openIntentVersion = 0;

  function publish(next: BagCoordinatorState) {
    state = next;
    listeners.forEach((listener) => listener());
  }

  async function run(operation: BagOperation): Promise<boolean> {
    if (state.pending !== null) return false;
    const requestedOpenVersion =
      operation === "add" ? openIntentVersion : null;
    publish({ ...state, error: null, pending: operation });
    try {
      const confirmed = await client[operation]();
      publish({
        ...state,
        confirmed,
        error: null,
        open:
          operation === "add" && requestedOpenVersion === openIntentVersion
            ? true
            : state.open,
        pending: null,
        stale: false,
      });
      return true;
    } catch (error) {
      publish({
        ...state,
        error: { operation, message: errorMessage(error) },
        pending: null,
      });
      return false;
    }
  }

  return {
    add: () => run("add"),
    cancelPendingOpen() {
      openIntentVersion += 1;
    },
    close() {
      openIntentVersion += 1;
      if (state.open) publish({ ...state, open: false });
    },
    confirm: () => run("read"),
    getSnapshot: () => state,
    invalidate() {
      if (!state.stale) publish({ ...state, stale: true });
    },
    async open() {
      if (!state.open) publish({ ...state, open: true });
      return run("read");
    },
    refreshIfStale() {
      return state.stale ? run("read") : Promise.resolve(true);
    },
    remove: () => run("remove"),
    retry() {
      return state.error ? run(state.error.operation) : Promise.resolve(false);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

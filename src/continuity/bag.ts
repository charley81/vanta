import { createBoundedStore, type BoundedStore } from "./store";
import { isBoundedIdentifier } from "./value";

export type BagMutation = "read" | "add" | "remove";
export type BagError = "unavailable" | "timeout" | "invalid" | "network";
export type PendingBagMutation = { id: number; kind: BagMutation };

export type BagDisclosureState = {
  open: boolean;
  invokerId: string | null;
  pendingMutation: PendingBagMutation | null;
  error: BagError | null;
};

export type BagDisclosureStore = BoundedStore<BagDisclosureState> & {
  close(): void;
  fail(mutationId: number, error: BagError): void;
  open(invokerId: string): boolean;
  settle(mutationId: number): void;
  start(mutation: BagMutation): number | null;
};

export function createDefaultBagDisclosureState(): BagDisclosureState {
  return {
    open: false,
    invokerId: null,
    pendingMutation: null,
    error: null,
  };
}

export function createBagDisclosureStore(): BagDisclosureStore {
  const store = createBoundedStore(createDefaultBagDisclosureState);
  let nextMutationId = 1;

  return {
    ...store,
    close() {
      const current = store.getSnapshot();
      store.replace({ ...current, open: false });
    },
    fail(mutationId, error) {
      const current = store.getSnapshot();
      if (current.pendingMutation?.id !== mutationId) return;
      store.replace({ ...current, pendingMutation: null, error });
    },
    open(invokerId) {
      if (!isBoundedIdentifier(invokerId)) return false;
      store.replace({
        ...store.getSnapshot(),
        open: true,
        invokerId,
        error: null,
      });
      return true;
    },
    settle(mutationId) {
      const current = store.getSnapshot();
      if (current.pendingMutation?.id !== mutationId) return;
      store.replace({ ...current, pendingMutation: null, error: null });
    },
    start(mutation) {
      const current = store.getSnapshot();
      if (current.pendingMutation !== null) return null;
      const id = nextMutationId++;
      store.replace({
        ...current,
        pendingMutation: { id, kind: mutation },
        error: null,
      });
      return id;
    },
  };
}

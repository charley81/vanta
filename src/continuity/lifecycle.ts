export type LifecycleState =
  | "active"
  | "suspending"
  | "suspended"
  | "restoring"
  | "degraded"
  | "disposed";

export type LifecycleHooks = {
  suspend(): void | Promise<void>;
  revalidate(): void | Promise<void>;
  resumeEnhancements(): void | Promise<void>;
  fallback(error: unknown): void | Promise<void>;
  dispose(): void | Promise<void>;
};

export type LifecycleEvent =
  | "hidden"
  | "freeze"
  | "pagehide"
  | "pageshow";

export type LifecycleController = {
  dispose(): Promise<void>;
  getState(): LifecycleState;
  handle(event: LifecycleEvent): Promise<void>;
  restore(): Promise<void>;
  suspend(): Promise<void>;
};

export function createLifecycleController(
  hooks: LifecycleHooks,
): LifecycleController {
  let state: LifecycleState = "active";
  let operation: Promise<void> | null = null;
  let disposeOperation: Promise<void> | null = null;

  function suspend(): Promise<void> {
    if (state === "disposed" || state === "suspended" || state === "degraded") {
      return Promise.resolve();
    }
    if (state === "suspending") return operation ?? Promise.resolve();
    if (state === "restoring") {
      return (operation ?? Promise.resolve()).then(suspend);
    }

    state = "suspending";
    operation = Promise.resolve()
      .then(() => hooks.suspend())
      .then(() => {
        if (state !== "disposed") state = "suspended";
      })
      .finally(() => {
        operation = null;
      });
    return operation;
  }

  function restore(): Promise<void> {
    if (state === "disposed" || state === "active") return Promise.resolve();
    if (state === "restoring") return operation ?? Promise.resolve();
    if (state === "suspending") {
      return (operation ?? Promise.resolve()).then(restore);
    }

    state = "restoring";
    operation = Promise.resolve()
      .then(() => hooks.revalidate())
      .then(() => hooks.resumeEnhancements())
      .then(() => {
        if (state !== "disposed") state = "active";
      })
      .catch(async (error: unknown) => {
        if (state !== "disposed") state = "degraded";
        await hooks.fallback(error);
      })
      .finally(() => {
        operation = null;
      });
    return operation;
  }

  function dispose(): Promise<void> {
    if (state === "disposed") return disposeOperation ?? Promise.resolve();
    if (disposeOperation) return disposeOperation;
    const previousOperation = operation;
    state = "disposed";
    disposeOperation = Promise.resolve(previousOperation)
      .catch(() => undefined)
      .then(() => hooks.dispose());
    return disposeOperation;
  }

  return {
    dispose,
    getState: () => state,
    handle(event) {
      return event === "pageshow" ? restore() : suspend();
    },
    restore,
    suspend,
  };
}

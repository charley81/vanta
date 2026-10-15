import { afterEach, describe, expect, it, vi } from "vitest";

import {
  arbitrateSurface,
  countsAsRouteEntry,
  createBagDisclosureStore,
  createRouteIntentController,
} from "@/src/continuity";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

afterEach(() => vi.useRealTimers());

describe("route-intent arbitration", () => {
  it("shows link-local progress only after the grace period", async () => {
    vi.useFakeTimers();
    const pending = deferred();
    const controller = createRouteIntentController();
    const intent = controller.start("/synth", () => pending.promise);

    expect(controller.getSnapshot()).toMatchObject({
      status: "pending",
      progressVisible: false,
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(controller.getSnapshot()).toMatchObject({ progressVisible: false });
    await vi.advanceTimersByTimeAsync(1);
    expect(controller.getSnapshot()).toMatchObject({ progressVisible: true });

    pending.resolve();
    await intent.settled;
    expect(controller.getSnapshot()).toMatchObject({
      status: "committed",
      destination: "/synth",
    });
  });

  it("lets a newer intent supersede an older uncommitted attempt", async () => {
    const first = deferred();
    const second = deferred();
    const signals: AbortSignal[] = [];
    const controller = createRouteIntentController();
    const firstIntent = controller.start("/monolith", (signal) => {
      signals.push(signal);
      return first.promise;
    });
    await Promise.resolve();
    const secondIntent = controller.start("/synth", (signal) => {
      signals.push(signal);
      return second.promise;
    });
    await Promise.resolve();

    expect(signals[0].aborted).toBe(true);
    first.resolve();
    await firstIntent.settled;
    expect(controller.getSnapshot()).toMatchObject({
      status: "pending",
      destination: "/synth",
    });

    second.resolve();
    await secondIntent.settled;
    expect(controller.getSnapshot()).toMatchObject({
      status: "committed",
      destination: "/synth",
    });
  });

  it("keeps failure local and retries the same destination", async () => {
    let attempts = 0;
    const controller = createRouteIntentController();
    const attempt = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("network unavailable");
    };

    await controller.start("/monolith", attempt).settled;
    expect(controller.getSnapshot()).toEqual({
      status: "failed",
      id: 1,
      destination: "/monolith",
      error: "navigation-failed",
    });

    const retry = controller.retry();
    expect(retry).not.toBeNull();
    await retry?.settled;
    expect(controller.getSnapshot()).toMatchObject({
      status: "committed",
      destination: "/monolith",
    });
  });

  it("arbitrates surfaces and excludes prefetch from entry semantics", () => {
    const pendingRoute = { active: "route" as const };
    const prefetch = arbitrateSurface(pendingRoute, { type: "prefetch" });
    expect(prefetch).toEqual({
      state: pendingRoute,
      cancelPendingRoute: false,
    });
    expect(countsAsRouteEntry("prefetch")).toBe(false);
    expect(countsAsRouteEntry("intent")).toBe(false);
    expect(countsAsRouteEntry("commit")).toBe(true);

    expect(arbitrateSurface(pendingRoute, { type: "bag-open" })).toEqual({
      state: { active: "bag" },
      cancelPendingRoute: true,
    });
    expect(
      arbitrateSurface({ active: "bag" }, { type: "menu-open" }).state,
    ).toEqual({ active: "menu" });
  });
});

describe("local Bag disclosure state", () => {
  it("deduplicates mutations and ignores late results", () => {
    const store = createBagDisclosureStore();
    expect(store.open("product-add")).toBe(true);
    const first = store.start("add");
    expect(first).toBe(1);
    expect(store.start("add")).toBeNull();

    store.fail(first!, "timeout");
    const retry = store.start("add");
    expect(retry).toBe(2);
    store.settle(first!);
    expect(store.getSnapshot().pendingMutation?.id).toBe(retry);
    store.settle(retry!);
    expect(store.getSnapshot()).toMatchObject({
      open: true,
      pendingMutation: null,
      error: null,
    });
  });
});

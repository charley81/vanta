"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { createDeferredBagCoordinator } from "@/src/bag/deferred-coordinator.client";

const BAG_HISTORY_KEY = "__vantaBagDisclosure";
const BAG_CHANNEL_NAME = "vanta:bag-invalidation:v1";
const BAG_OPENED_EVENT = "vanta:bag-opened";
const INVALIDATION_MESSAGE = { type: "invalidate", version: 1 } as const;

type BagRuntime = {
  activeInvokerId: string | null;
  channel: BroadcastChannel | null;
  coordinator: ReturnType<typeof createDeferredBagCoordinator>;
  disposeLifecycle: (() => void) | null;
  invoker: HTMLButtonElement | null;
  invokerListeners: Set<() => void>;
  lifecycleUsers: number;
  restoreFocus: boolean;
};

type BagRuntimeGlobal = typeof globalThis & {
  __vantaBagRuntime?: BagRuntime;
};

const scope = globalThis as BagRuntimeGlobal;
const runtime = (scope.__vantaBagRuntime ??= {
  activeInvokerId: null,
  channel: null,
  coordinator: createDeferredBagCoordinator(),
  disposeLifecycle: null,
  invoker: null,
  invokerListeners: new Set(),
  lifecycleUsers: 0,
  restoreFocus: true,
});
const { coordinator } = runtime;

function hasBagHistoryState(): boolean {
  const state: unknown = window.history.state;
  if (!state || typeof state !== "object" || !(BAG_HISTORY_KEY in state)) {
    return false;
  }
  const marker = (state as Record<string, unknown>)[BAG_HISTORY_KEY];
  if (
    marker &&
    typeof marker === "object" &&
    !Array.isArray(marker) &&
    Object.keys(marker).length === 1 &&
    (marker as Record<string, unknown>).version === 1
  ) {
    return true;
  }
  clearBagHistoryState();
  return false;
}

function pushBagHistoryState() {
  if (hasBagHistoryState()) return;
  const current: unknown = window.history.state;
  const next = current && typeof current === "object" ? { ...current } : {};
  window.history.pushState(
    { ...next, [BAG_HISTORY_KEY]: { version: 1 } },
    "",
    window.location.href,
  );
}

function clearBagHistoryState() {
  const current: unknown = window.history.state;
  if (!current || typeof current !== "object") return;
  const next = { ...current } as Record<string, unknown>;
  delete next[BAG_HISTORY_KEY];
  window.history.replaceState(next, "", window.location.href);
}

function restoreInvokerFocus() {
  if (runtime.restoreFocus) {
    requestAnimationFrame(() => runtime.invoker?.focus());
  }
}

function publishInvalidation() {
  runtime.channel?.postMessage(INVALIDATION_MESSAGE);
}

function enterBagHistory() {
  runtime.restoreFocus = true;
  pushBagHistoryState();
  document.dispatchEvent(new CustomEvent(BAG_OPENED_EVENT));
}

function selectInvoker(nextInvoker: HTMLButtonElement, id: string) {
  runtime.invoker = nextInvoker;
  runtime.activeInvokerId = id;
  runtime.invokerListeners.forEach((listener) => listener());
}

async function addToBag(nextInvoker: HTMLButtonElement, id: string) {
  selectInvoker(nextInvoker, id);
  const confirmed = await coordinator.add();
  if (!confirmed) return;
  publishInvalidation();
  if (coordinator.getSnapshot().open) enterBagHistory();
}

function openBag(nextInvoker: HTMLButtonElement, id: string) {
  selectInvoker(nextInvoker, id);
  void coordinator.open();
  enterBagHistory();
}

export function activateDeferredBag(
  operation: "add" | "open",
  nextInvoker: HTMLButtonElement,
) {
  if (operation === "add") {
    void addToBag(nextInvoker, "deferred");
  } else {
    openBag(nextInvoker, "deferred");
  }
}

export function registerDeferredBagInvoker(invoker: HTMLButtonElement | null) {
  if (invoker && runtime.activeInvokerId === "deferred") {
    runtime.invoker = invoker;
  }
}

function closeBag() {
  if (hasBagHistoryState()) {
    window.history.back();
    return;
  }
  coordinator.close();
  restoreInvokerFocus();
}

function consumeBagHistory() {
  runtime.restoreFocus = false;
  clearBagHistoryState();
  coordinator.close();
}

async function removeFromBag() {
  if (await coordinator.remove()) publishInvalidation();
}

async function retry() {
  const operation = coordinator.getSnapshot().error?.operation;
  if (!(await coordinator.retry())) return;
  if (operation === "add" || operation === "remove") publishInvalidation();
  if (operation === "add" && coordinator.getSnapshot().open) enterBagHistory();
}

function installLifecycle(): () => void {
  function handlePopState() {
    if (hasBagHistoryState()) {
      void coordinator.open();
      document.dispatchEvent(new CustomEvent(BAG_OPENED_EVENT));
    } else if (coordinator.getSnapshot().open) {
      coordinator.close();
      restoreInvokerFocus();
    }
  }

  window.addEventListener("popstate", handlePopState);

  if ("BroadcastChannel" in window) {
    runtime.channel = new BroadcastChannel(BAG_CHANNEL_NAME);
    runtime.channel.addEventListener("message", (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (
        message &&
        typeof message === "object" &&
        (message as Record<string, unknown>).type === "invalidate" &&
        (message as Record<string, unknown>).version === 1
      ) {
        coordinator.invalidate();
      }
    });
  }

  const refresh = () => void coordinator.refreshIfStale();
  const refreshAfterInteraction = (event: Event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("[data-bag-action]")) return;
    refresh();
  };
  const refreshWhenVisible = () => {
    if (document.visibilityState === "visible") refresh();
  };

  window.addEventListener("focus", refresh);
  document.addEventListener("pointerdown", refreshAfterInteraction, true);
  document.addEventListener("keydown", refreshAfterInteraction, true);
  document.addEventListener("visibilitychange", refreshWhenVisible);

  return () => {
    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("pointerdown", refreshAfterInteraction, true);
    document.removeEventListener("keydown", refreshAfterInteraction, true);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
    runtime.channel?.close();
    runtime.channel = null;
  };
}

function retainLifecycle(): () => void {
  runtime.lifecycleUsers += 1;
  runtime.disposeLifecycle ??= installLifecycle();
  return () => {
    runtime.lifecycleUsers -= 1;
    if (runtime.lifecycleUsers === 0) {
      runtime.disposeLifecycle?.();
      runtime.disposeLifecycle = null;
    }
  };
}

function subscribeToInvoker(listener: () => void): () => void {
  runtime.invokerListeners.add(listener);
  return () => runtime.invokerListeners.delete(listener);
}

function getActiveInvokerId() {
  return runtime.activeInvokerId;
}

if (typeof window !== "undefined") {
  runtime.disposeLifecycle ??= installLifecycle();
}

export function useBag() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const state = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot,
  );
  const selectedInvokerId = useSyncExternalStore(
    subscribeToInvoker,
    getActiveInvokerId,
    () => null,
  );

  useEffect(retainLifecycle, []);
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    runtime.restoreFocus = false;
    clearBagHistoryState();
    coordinator.close();
  }, [pathname]);

  return {
    activeInvokerId: selectedInvokerId,
    addToBag,
    closeBag,
    confirmBag: () => coordinator.confirm(),
    consumeBagHistory,
    openBag,
    removeFromBag,
    retry,
    state,
  };
}

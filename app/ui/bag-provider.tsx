"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { createBagClient } from "@/src/bag/client";
import {
  createBagCoordinator,
  type BagCoordinator,
  type BagCoordinatorState,
} from "@/src/bag/coordinator";

const BAG_HISTORY_KEY = "__vantaBagDisclosure";
const BAG_CHANNEL_NAME = "vanta:bag-invalidation:v1";
const BAG_OPENED_EVENT = "vanta:bag-opened";
const INVALIDATION_MESSAGE = { type: "invalidate", version: 1 } as const;

type BagContextValue = {
  activeInvokerId: string | null;
  addToBag(invoker: HTMLButtonElement, invokerId: string): Promise<void>;
  closeBag(): void;
  consumeBagHistory(): void;
  openBag(invoker: HTMLButtonElement, invokerId: string): void;
  removeFromBag(): Promise<void>;
  retry(): Promise<void>;
  state: BagCoordinatorState;
};

const BagContext = createContext<BagContextValue | null>(null);

function hasBagHistoryState(): boolean {
  const state: unknown = window.history.state;
  return Boolean(
    state &&
      typeof state === "object" &&
      BAG_HISTORY_KEY in state &&
      (state as Record<string, unknown>)[BAG_HISTORY_KEY] !== null,
  );
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

function announceBagOpened() {
  document.dispatchEvent(new CustomEvent(BAG_OPENED_EVENT));
}

export function BagProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [coordinator] = useState<BagCoordinator>(() =>
    createBagCoordinator(createBagClient()),
  );
  const state = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot,
  );
  const [activeInvokerId, setActiveInvokerId] = useState<string | null>(null);
  const invokerRef = useRef<HTMLButtonElement | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const restoreFocusRef = useRef(true);
  const pathnameRef = useRef(pathname);

  const restoreInvokerFocus = useCallback(() => {
    if (!restoreFocusRef.current) return;
    requestAnimationFrame(() => invokerRef.current?.focus());
  }, []);

  const publishInvalidation = useCallback(() => {
    channelRef.current?.postMessage(INVALIDATION_MESSAGE);
  }, []);

  const enterBagHistory = useCallback(() => {
    restoreFocusRef.current = true;
    pushBagHistoryState();
    announceBagOpened();
  }, []);

  const openBag = useCallback(
    (invoker: HTMLButtonElement, invokerId: string) => {
      invokerRef.current = invoker;
      setActiveInvokerId(invokerId);
      void coordinator.open();
      enterBagHistory();
    },
    [coordinator, enterBagHistory],
  );

  const addToBag = useCallback(
    async (invoker: HTMLButtonElement, invokerId: string) => {
      invokerRef.current = invoker;
      setActiveInvokerId(invokerId);
      const confirmed = await coordinator.add();
      if (!confirmed) return;
      publishInvalidation();
      if (coordinator.getSnapshot().open) enterBagHistory();
    },
    [coordinator, enterBagHistory, publishInvalidation],
  );

  const removeFromBag = useCallback(async () => {
    if (await coordinator.remove()) publishInvalidation();
  }, [coordinator, publishInvalidation]);

  const retry = useCallback(async () => {
    const operation = coordinator.getSnapshot().error?.operation;
    if (!(await coordinator.retry())) return;
    if (operation === "add" || operation === "remove") publishInvalidation();
    if (operation === "add") enterBagHistory();
  }, [coordinator, enterBagHistory, publishInvalidation]);

  const closeBag = useCallback(() => {
    if (hasBagHistoryState()) {
      window.history.back();
      return;
    }
    coordinator.close();
    restoreInvokerFocus();
  }, [coordinator, restoreInvokerFocus]);

  const consumeBagHistory = useCallback(() => {
    restoreFocusRef.current = false;
    clearBagHistoryState();
    coordinator.close();
  }, [coordinator]);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    restoreFocusRef.current = false;
    clearBagHistoryState();
    coordinator.close();
  }, [coordinator, pathname]);

  useEffect(() => {
    function handlePopState() {
      if (hasBagHistoryState()) {
        void coordinator.open();
        announceBagOpened();
      } else if (coordinator.getSnapshot().open) {
        coordinator.close();
        restoreInvokerFocus();
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [coordinator, restoreInvokerFocus]);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(BAG_CHANNEL_NAME);
    channelRef.current = channel;
    channel.addEventListener("message", (event: MessageEvent<unknown>) => {
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
    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [coordinator]);

  useEffect(() => {
    const refresh = () => void coordinator.refreshIfStale();
    const refreshAfterInteraction = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-bag-action]")
      ) {
        return;
      }
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
      window.removeEventListener("focus", refresh);
      document.removeEventListener("pointerdown", refreshAfterInteraction, true);
      document.removeEventListener("keydown", refreshAfterInteraction, true);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [coordinator]);

  const value = useMemo<BagContextValue>(
    () => ({
      activeInvokerId,
      addToBag,
      closeBag,
      consumeBagHistory,
      openBag,
      removeFromBag,
      retry,
      state,
    }),
    [
      activeInvokerId,
      addToBag,
      closeBag,
      consumeBagHistory,
      openBag,
      removeFromBag,
      retry,
      state,
    ],
  );

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

export function useBag(): BagContextValue {
  const context = useContext(BagContext);
  if (!context) throw new Error("useBag must be rendered inside BagProvider");
  return context;
}

/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import {
  createBrowserPresentationController,
  type BrowserPresentationEnvironment,
} from "@/src/presentation/browser.client";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => void values.delete(key),
    setItem: (key: string, value: string) => void values.set(key, value),
    values,
  };
}

function environment() {
  const queries = new Map<string, { matches: boolean; listeners: Set<() => void> }>();
  const connectionListeners = new Set<() => void>();
  const getQuery = (query: string) => {
    let result = queries.get(query);
    if (!result) {
      result = { matches: false, listeners: new Set() };
      queries.set(query, result);
    }
    return result;
  };
  getQuery("(any-pointer: fine)").matches = true;

  const browser = {
    effectiveConnectionType: "4g",
    logicalProcessors: 8,
    saveData: false as boolean,
    testWebgl2: vi.fn(() => true),
    matchMedia(query: string) {
      const state = getQuery(query);
      return {
        get matches() {
          return state.matches;
        },
        addEventListener: (_type: "change", listener: () => void) =>
          state.listeners.add(listener),
        removeEventListener: (_type: "change", listener: () => void) =>
          state.listeners.delete(listener),
      };
    },
    subscribeConnection(listener: () => void) {
      connectionListeners.add(listener);
      return () => connectionListeners.delete(listener);
    },
  } satisfies BrowserPresentationEnvironment;

  return {
    browser,
    connectionListeners,
    setMedia(query: string, matches: boolean) {
      const state = getQuery(query);
      state.matches = matches;
      state.listeners.forEach((listener) => listener());
    },
  };
}

describe("browser Presentation controller", () => {
  it("reacts to live independent signals and cleans up every listener", () => {
    const transientStorage = storage();
    const { browser, connectionListeners, setMedia } = environment();
    const controller = createBrowserPresentationController({
      environment: browser,
      realtimePurpose: "decorative",
      storage: transientStorage,
    });
    const listener = vi.fn();
    controller.subscribe(listener);

    expect(controller.getSnapshot().selectedTier).toBe("realtime");
    expect(browser.testWebgl2).toHaveBeenCalledOnce();

    setMedia("(prefers-reduced-motion: reduce)", true);
    expect(controller.getSnapshot()).toMatchObject({
      eligibility: { motion: false, realtime: false },
      fallbackReason: "reduced-motion",
      selectedTier: "core",
    });

    browser.saveData = true;
    connectionListeners.forEach((notify) => notify());
    expect(controller.getSnapshot().adaptation.dataSaving).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(browser.testWebgl2).toHaveBeenCalledOnce();

    controller.dispose();
    setMedia("(prefers-reduced-motion: reduce)", false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("retains a one-way downgrade in this session and requalifies new storage", () => {
    const transientStorage = storage();
    const firstEnvironment = environment();
    const first = createBrowserPresentationController({
      environment: firstEnvironment.browser,
      realtimePurpose: "decorative",
      storage: transientStorage,
    });
    first.downgrade("performance");
    first.dispose();

    const restored = createBrowserPresentationController({
      environment: environment().browser,
      realtimePurpose: "decorative",
      storage: transientStorage,
    });
    expect(restored.getSnapshot()).toMatchObject({
      eligibility: { realtime: false },
      fallbackReason: "performance",
      realtimeDeclined: true,
      selectedTier: "motion",
    });

    const newTab = createBrowserPresentationController({
      environment: environment().browser,
      realtimePurpose: "decorative",
      storage: storage(),
    });
    expect(newTab.getSnapshot()).toMatchObject({
      eligibility: { realtime: true },
      realtimeDeclined: false,
      selectedTier: "realtime",
    });

    restored.dispose();
    newTab.dispose();
  });
});

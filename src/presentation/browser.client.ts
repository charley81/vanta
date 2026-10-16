"use client";

import "client-only";

import {
  createPresentationSessionRecord,
  type PresentationSession,
  type SessionStorageLike,
} from "@/src/continuity";

import {
  downgradePresentation,
  qualifyDataSavingOptIn,
  qualifyPresentation,
  type RealtimePurpose,
} from "./qualification";
import type { RealtimeDowngradeReason } from "@/src/realtime/runtime";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const FINE_POINTER_QUERY = "(any-pointer: fine)";
const COARSE_POINTER_QUERY = "(any-pointer: coarse)";

export type BrowserMediaQuery = {
  readonly matches: boolean;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
};

export type BrowserPresentationEnvironment = {
  effectiveConnectionType: string | null;
  logicalProcessors: number | null;
  saveData: boolean;
  matchMedia(query: string): BrowserMediaQuery;
  subscribeConnection(listener: () => void): () => void;
  testWebgl2(): boolean;
};

export type BrowserPresentationController = {
  dispose(): void;
  downgrade(reason: RealtimeDowngradeReason): void;
  getDataSavingOptInSnapshot(): PresentationSession;
  getSnapshot(): PresentationSession;
  subscribe(listener: () => void): () => void;
};

type NetworkInformationLike = EventTarget & {
  effectiveType?: string;
  saveData?: boolean;
};

export function createNativePresentationEnvironment(): BrowserPresentationEnvironment {
  const connection = (
    navigator as Navigator & { connection?: NetworkInformationLike }
  ).connection;
  return {
    get effectiveConnectionType() {
      return connection?.effectiveType ?? null;
    },
    get logicalProcessors() {
      const value = navigator.hardwareConcurrency;
      return Number.isFinite(value) && value > 0 ? value : null;
    },
    get saveData() {
      return connection?.saveData === true;
    },
    matchMedia: (query) => window.matchMedia(query),
    subscribeConnection(listener) {
      if (!connection) return () => undefined;
      connection.addEventListener("change", listener);
      return () => connection.removeEventListener("change", listener);
    },
    testWebgl2() {
      const canvas = document.createElement("canvas");
      try {
        const context = canvas.getContext("webgl2");
        if (!context) return false;
        context.getExtension("WEBGL_lose_context")?.loseContext();
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function createBrowserPresentationController({
  environment,
  realtimePurpose,
  storage,
}: {
  environment: BrowserPresentationEnvironment;
  realtimePurpose: RealtimePurpose;
  storage: SessionStorageLike;
}): BrowserPresentationController {
  const record = createPresentationSessionRecord(storage);
  const mediaQueries = [
    environment.matchMedia(REDUCED_MOTION_QUERY),
    environment.matchMedia(FINE_POINTER_QUERY),
    environment.matchMedia(COARSE_POINTER_QUERY),
  ] as const;
  const webgl2 = environment.testWebgl2();
  const listeners = new Set<() => void>();
  let disposed = false;

  function readSignals() {
    return {
      reducedMotion: mediaQueries[0].matches,
      finePointer: mediaQueries[1].matches,
      coarsePointer: mediaQueries[2].matches,
      effectiveConnectionType: environment.effectiveConnectionType,
      logicalProcessors: environment.logicalProcessors,
      saveData: environment.saveData,
      webgl2,
      realtimePurpose,
    };
  }

  let snapshot = qualifyPresentation(readSignals(), record.read());
  record.write(snapshot);

  function publish(next: PresentationSession): void {
    if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
    snapshot = next;
    record.write(snapshot);
    listeners.forEach((listener) => listener());
  }

  function requalify(): void {
    if (disposed) return;
    publish(qualifyPresentation(readSignals(), snapshot));
  }

  mediaQueries.forEach((query) => query.addEventListener("change", requalify));
  const unsubscribeConnection = environment.subscribeConnection(requalify);

  return {
    getSnapshot: () => snapshot,
    getDataSavingOptInSnapshot: () =>
      qualifyDataSavingOptIn(readSignals(), snapshot),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    downgrade(reason) {
      if (disposed) return;
      publish(downgradePresentation(snapshot, reason));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mediaQueries.forEach((query) =>
        query.removeEventListener("change", requalify),
      );
      unsubscribeConnection();
      listeners.clear();
    },
  };
}

export function createNativeBrowserPresentationController(
  realtimePurpose: RealtimePurpose,
): BrowserPresentationController {
  return createBrowserPresentationController({
    environment: createNativePresentationEnvironment(),
    realtimePurpose,
    storage: window.sessionStorage,
  });
}

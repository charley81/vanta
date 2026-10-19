"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";

import { CONTINUITY_READY_EVENT } from "@/src/continuity/composition";

import { ShellNavigation } from "./shell-navigation";

const continuityBoundary = import("./continuity-boundary");
const ContinuityBoundary = lazy(() =>
  continuityBoundary.then((module) => ({
    default: module.ContinuityBoundary,
  })),
);

export function ShellRuntime() {
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [continuityReady, setContinuityReady] = useState(false);
  const markContinuityReady = useCallback(() => {
    document.documentElement.dataset.continuityReady = "true";
    document.dispatchEvent(new Event(CONTINUITY_READY_EVENT));
    setContinuityReady(true);
  }, []);
  if (!hydrated) return null;

  return (
    <>
      {continuityReady ? <ShellNavigation /> : null}
      <Suspense fallback={null}>
        <ContinuityBoundary onReady={markContinuityReady} />
      </Suspense>
    </>
  );
}

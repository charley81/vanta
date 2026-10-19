"use client";

import { lazy, Suspense } from "react";

const ShellRuntime = lazy(() =>
  import("./shell-runtime").then((module) => ({
    default: module.ShellRuntime,
  })),
);

export function DeferredShellNavigation() {
  return (
    <Suspense fallback={<i hidden id="navigation-dialog-title" />}>
      <ShellRuntime />
    </Suspense>
  );
}

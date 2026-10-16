"use client";

import "client-only";

import type { AudioTransportController } from "./transport";

const BAG_OPENED_EVENT = "vanta:bag-opened";

function routeIntentAnchor(event: MouseEvent): HTMLAnchorElement | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }
  const target = event.target;
  const anchor =
    target instanceof Element
      ? target.closest<HTMLAnchorElement>("a[href]")
      : null;
  if (
    !anchor ||
    (anchor.target !== "" && anchor.target !== "_self") ||
    anchor.download
  ) {
    return null;
  }
  return anchor;
}

export function bindSynthPageLifecycle(
  transport: Pick<AudioTransportController, "pause">,
): () => void {
  const interrupt = () => transport.pause("interruption");
  const pauseWhenHidden = () => {
    if (document.visibilityState === "hidden") interrupt();
  };
  const pauseForRouteIntent = (event: MouseEvent) => {
    const anchor = routeIntentAnchor(event);
    if (!anchor) return;
    const destination = new URL(anchor.href, window.location.href);
    if (
      destination.origin === window.location.origin &&
      destination.pathname !== window.location.pathname
    ) {
      interrupt();
    }
  };

  document.addEventListener("visibilitychange", pauseWhenHidden);
  document.addEventListener(BAG_OPENED_EVENT, interrupt);
  document.addEventListener("click", pauseForRouteIntent, true);
  document.addEventListener("freeze", interrupt);
  window.addEventListener("pagehide", interrupt);

  return () => {
    document.removeEventListener("visibilitychange", pauseWhenHidden);
    document.removeEventListener(BAG_OPENED_EVENT, interrupt);
    document.removeEventListener("click", pauseForRouteIntent, true);
    document.removeEventListener("freeze", interrupt);
    window.removeEventListener("pagehide", interrupt);
  };
}

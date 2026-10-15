"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  CANONICAL_ROUTES,
  createRestorationController,
  readReturnContext,
  replaceReturnContext,
  type CanonicalRoute,
  type ReturnContext,
  type SemanticSection,
} from "@/src/continuity";

function canonicalRoute(pathname: string): CanonicalRoute | null {
  return CANONICAL_ROUTES.find((route) => route === pathname) ?? null;
}

function sectionIdentifier(section: HTMLElement): string | null {
  return (
    section.dataset.chapter ??
    section.dataset.section ??
    section.getAttribute("aria-labelledby") ??
    section.id ??
    null
  );
}

function routeSections(): HTMLElement[] {
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>(
      "main [data-chapter], main [data-section], main > section",
    ),
  );
  return sections.length > 0
    ? sections
    : Array.from(document.querySelectorAll<HTMLElement>("main"));
}

function documentTop(element: HTMLElement): number {
  return element.getBoundingClientRect().top + window.scrollY;
}

function currentSemanticSection(): HTMLElement | null {
  const position = window.scrollY + window.innerHeight / 2;
  return (
    routeSections().findLast((section) => documentTop(section) <= position) ??
    routeSections().at(0) ??
    null
  );
}

function normalizedProgress(section: HTMLElement): number {
  const distance = Math.max(0, section.offsetHeight - window.innerHeight);
  if (distance === 0) return 0;
  return Math.min(
    1,
    Math.max(0, (window.scrollY - documentTop(section)) / distance),
  );
}

function routeFocusTarget(): string | null {
  const active = document.activeElement;
  return active instanceof HTMLElement && active.closest("main") && active.id
    ? active.id
    : null;
}

function captureRouteContext(route: CanonicalRoute): ReturnContext | null {
  const section = currentSemanticSection();
  const semanticSection = section ? sectionIdentifier(section) : null;
  if (!section || !semanticSection) return null;

  return {
    version: 1,
    originRoute: route,
    semanticSection,
    normalizedProgress: normalizedProgress(section),
    focusTarget: routeFocusTarget(),
    bagInvoker: null,
    scroll: { x: Math.max(0, window.scrollX), y: Math.max(0, window.scrollY) },
    visibleState: { kind: "route" },
  };
}

function findSection(id: string): HTMLElement | null {
  return (
    routeSections().find((section) => sectionIdentifier(section) === id) ?? null
  );
}

function focusElement(id: string): boolean {
  const element = document.getElementById(id);
  if (!element) return false;
  if (!element.matches("a, button, input, select, textarea, [tabindex]")) {
    element.tabIndex = -1;
  }
  element.focus({ preventScroll: true });
  return document.activeElement === element;
}

function routeHeading(): HTMLElement | null {
  return document.querySelector<HTMLElement>("main h1");
}

function restorationSection(id: string): SemanticSection | null {
  const section = findSection(id);
  if (!section) return null;
  const heading = section.querySelector<HTMLElement>("h1[id], h2[id], h3[id]");
  return {
    top: documentTop(section),
    height: section.offsetHeight,
    headingTarget: heading?.id ?? routeHeading()?.id ?? "main-content",
  };
}

function focusRouteHeading() {
  const heading = routeHeading();
  if (heading?.id) focusElement(heading.id);
}

function restoreRouteContext(context: ReturnContext) {
  const controller = createRestorationController({
    recompose: () => undefined,
    resolveSection: restorationSection,
    viewportHeight: () => window.innerHeight,
    applyScroll: (y) =>
      window.scrollTo({ top: y, left: 0, behavior: "instant" }),
    focus: focusElement,
    focusRouteHeading,
    activateEnhancements: () => undefined,
    listenForInteraction(listener) {
      const options = { capture: true, once: true } as const;
      for (const event of ["pointerdown", "keydown", "wheel", "touchstart"]) {
        window.addEventListener(event, listener, options);
      }
      return () => {
        for (const event of ["pointerdown", "keydown", "wheel", "touchstart"]) {
          window.removeEventListener(event, listener, options);
        }
      };
    },
    scheduleCorrection(correction) {
      const frame = requestAnimationFrame(correction);
      return () => cancelAnimationFrame(frame);
    },
  });
  void controller.restore(context);
}

export function ContinuityBoundary() {
  const pathname = usePathname();
  const router = useRouter();
  const navigationIntent = useRef<"explicit" | null>(null);
  const routeEntries = useRef(new Map<CanonicalRoute, string>());

  useEffect(() => {
    const route = canonicalRoute(pathname);
    if (!route) return;

    const previousEntry = routeEntries.current.get(route);
    if (navigationIntent.current === "explicit") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      focusRouteHeading();
    } else if (previousEntry === router.bfcacheId) {
      const context = readReturnContext(window.history);
      if (context?.originRoute === route) restoreRouteContext(context);
    }
    routeEntries.current.set(route, router.bfcacheId);
    navigationIntent.current = null;
  }, [pathname, router.bfcacheId]);

  useEffect(() => {
    const route = canonicalRoute(pathname);
    if (!route) return;
    const currentRoute: CanonicalRoute = route;
    const previousScrollRestoration = window.history.scrollRestoration;
    let pointerContext: ReturnContext | null = null;
    window.history.scrollRestoration = "manual";

    function saveCurrentEntry(context = captureRouteContext(currentRoute)) {
      if (context) replaceReturnContext(window.history, context);
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      const anchor = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
      if (anchor) pointerContext = captureRouteContext(currentRoute);
    }

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      const anchor = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target || anchor.download) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const destinationRoute = canonicalRoute(destination.pathname);
      if (!destinationRoute || destination.hash) return;

      saveCurrentEntry(pointerContext ?? undefined);
      pointerContext = null;
      navigationIntent.current = "explicit";
      if (destinationRoute === currentRoute) {
        event.preventDefault();
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        focusRouteHeading();
        const canonical = captureRouteContext(currentRoute);
        if (canonical) replaceReturnContext(window.history, canonical);
        navigationIntent.current = null;
      }
    }

    const handlePageHide = () => saveCurrentEntry();
    document.addEventListener("click", handleClick, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pagehide", handlePageHide);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [pathname]);

  return null;
}

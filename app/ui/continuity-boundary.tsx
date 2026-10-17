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
import {
  ROUTE_ACTIVATE_ENHANCEMENTS_EVENT,
  ROUTE_RECOMPOSE_EVENT,
} from "@/src/continuity/composition";

function canonicalRoute(pathname: string): CanonicalRoute | null {
  return CANONICAL_ROUTES.find((route) => route === pathname) ?? null;
}

function sectionIdentifier(section: HTMLElement): string | null {
  return (
    section.dataset.chapter ??
    section.dataset.section ??
    section.dataset.homeBeat ??
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
  const continuityTop = Number(element.dataset.continuityTop);
  return Number.isFinite(continuityTop)
    ? continuityTop
    : element.getBoundingClientRect().top + window.scrollY;
}

function semanticHeight(element: HTMLElement): number {
  const continuityHeight = Number(element.dataset.continuityHeight);
  return Number.isFinite(continuityHeight)
    ? continuityHeight
    : element.offsetHeight;
}

function currentSemanticSection(): HTMLElement | null {
  const active = document.querySelector<HTMLElement>(
    "main [data-continuity-active='true']",
  );
  if (active) return active;
  const position = window.scrollY + window.innerHeight / 2;
  return (
    routeSections().findLast((section) => documentTop(section) <= position) ??
    routeSections().at(0) ??
    null
  );
}

function normalizedProgress(section: HTMLElement): number {
  const distance = Math.max(0, semanticHeight(section) - window.innerHeight);
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
    height: semanticHeight(section),
    headingTarget: heading?.id ?? routeHeading()?.id ?? "main-content",
  };
}

function focusRouteHeading() {
  const heading = routeHeading();
  if (heading?.id) focusElement(heading.id);
}

function restoreRouteContext(context: ReturnContext) {
  const controller = createRestorationController({
    recompose: () => {
      document.dispatchEvent(new Event(ROUTE_RECOMPOSE_EVENT));
    },
    resolveSection: restorationSection,
    viewportHeight: () => window.innerHeight,
    applyScroll: (y) =>
      window.scrollTo({ top: y, left: 0, behavior: "instant" }),
    focus: focusElement,
    focusRouteHeading,
    activateEnhancements: () => {
      document.dispatchEvent(
        new CustomEvent(ROUTE_ACTIVATE_ENHANCEMENTS_EVENT, {
          detail: {
            semanticSection: context.semanticSection,
            normalizedProgress: context.normalizedProgress,
          },
        }),
      );
    },
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
      let correctionFrame = 0;
      const settleFrame = requestAnimationFrame(() => {
        correctionFrame = requestAnimationFrame(correction);
      });
      return () => {
        cancelAnimationFrame(settleFrame);
        if (correctionFrame) cancelAnimationFrame(correctionFrame);
      };
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

    let restorationFrame = 0;
    const previousEntry = routeEntries.current.get(route);
    if (navigationIntent.current === "explicit") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      focusRouteHeading();
    } else {
      const navigation = performance.getEntriesByType("navigation").at(-1) as
        | PerformanceNavigationTiming
        | undefined;
      const initialDocumentRestoration =
        previousEntry === undefined &&
        (navigation?.type === "reload" || navigation?.type === "back_forward");
      if (previousEntry === router.bfcacheId || initialDocumentRestoration) {
        const context = readReturnContext(window.history);
        if (context?.originRoute === route) {
          restorationFrame = window.requestAnimationFrame(() =>
            restoreRouteContext(context),
          );
        }
      }
    }
    routeEntries.current.set(route, router.bfcacheId);
    navigationIntent.current = null;
    return () => {
      if (restorationFrame) window.cancelAnimationFrame(restorationFrame);
    };
  }, [pathname, router.bfcacheId]);

  useEffect(() => {
    const route = canonicalRoute(pathname);
    if (!route) return;
    const currentRoute: CanonicalRoute = route;
    const previousScrollRestoration = window.history.scrollRestoration;
    let pointerContext: ReturnContext | null = null;
    let saveFrame = 0;
    window.history.scrollRestoration = "manual";

    function saveCurrentEntry(context = captureRouteContext(currentRoute)) {
      if (!context) return;
      const previous = readReturnContext(window.history);
      const retainedFocus =
        context.focusTarget === null && previous?.originRoute === currentRoute
          ? previous.focusTarget
          : context.focusTarget;
      replaceReturnContext(window.history, {
        ...context,
        focusTarget: retainedFocus,
      });
    }

    function scheduleCurrentEntrySave() {
      if (saveFrame) return;
      saveFrame = window.requestAnimationFrame(() => {
        saveFrame = 0;
        saveCurrentEntry();
      });
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

    const handlePageExit = () => saveCurrentEntry();
    document.addEventListener("click", handleClick, true);
    document.addEventListener("focusin", scheduleCurrentEntrySave, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("beforeunload", handlePageExit);
    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("scroll", scheduleCurrentEntrySave, {
      passive: true,
    });
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("focusin", scheduleCurrentEntrySave, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("beforeunload", handlePageExit);
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("scroll", scheduleCurrentEntrySave);
      if (saveFrame) window.cancelAnimationFrame(saveFrame);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [pathname]);

  return null;
}

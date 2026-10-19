"use client";

import { useEffect, useRef, useState } from "react";

import {
  HOME_REALTIME_BEATS,
  homeRealtimeTimeline,
  type HomeRealtimeBeatGeometry,
} from "@/src/home/realtime-orchestration";
import {
  createNativeBrowserPresentationController,
  type BrowserPresentationController,
} from "@/src/presentation/browser.client";
import { createLazyHomeSceneLoader } from "@/src/home/realtime-loader.client";
import {
  createRealtimeRuntime,
  type RealtimeRuntime,
} from "@/src/realtime/runtime";

import styles from "./home.module.css";

function documentTop(element: HTMLElement): number {
  return element.getBoundingClientRect().top + window.scrollY;
}

function beatGeometry(main: HTMLElement): HomeRealtimeBeatGeometry[] {
  const elements = HOME_REALTIME_BEATS.map((beat) =>
    main.querySelector<HTMLElement>(`[data-home-beat="${beat}"]`),
  );

  const geometry = elements.flatMap((element, index) => {
    if (!element) return [];
    const continuityTop = Number(element.dataset.continuityTop);
    const virtual = Number.isFinite(continuityTop);
    const start = virtual ? continuityTop : documentTop(element);
    const nextElement = elements[index + 1];
    const nextContinuityTop = Number(nextElement?.dataset.continuityTop);
    const nextStart = nextElement
      ? Number.isFinite(nextContinuityTop)
        ? nextContinuityTop
        : documentTop(nextElement)
      : null;
    const continuityHeight = Number(element.dataset.continuityHeight);
    const ownEnd = virtual && Number.isFinite(continuityHeight)
      ? start + Math.max(1, continuityHeight - window.innerHeight)
      : start + Math.max(1, element.offsetHeight);

    return [{ beat: HOME_REALTIME_BEATS[index], start, end: nextStart ?? ownEnd }];
  });
  const invitation = main.querySelector<HTMLElement>(
    '[data-home-beat="lab-invitation"]',
  );
  const last = geometry.at(-1);
  if (invitation && last) last.end = Math.min(last.end, documentTop(invitation));
  return geometry;
}

function isModifiedNavigation(event: MouseEvent): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export function HomeRealtimeReveal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<BrowserPresentationController | null>(null);
  const runtimeRef = useRef<RealtimeRuntime | null>(null);
  const progressRef = useRef(0);
  const [presentation, setPresentation] = useState<
    ReturnType<BrowserPresentationController["getSnapshot"]> | null
  >(null);

  useEffect(() => {
    const controller = createNativeBrowserPresentationController("decorative");
    controllerRef.current = controller;
    const publish = () => {
      const next = controller.getSnapshot();
      setPresentation((current) =>
        current &&
        current.selectedTier === next.selectedTier &&
        current.eligibility.realtime === next.eligibility.realtime &&
        current.realtimeDeclined === next.realtimeDeclined &&
        current.fallbackReason === next.fallbackReason
          ? current
          : next,
      );
    };
    publish();
    const unsubscribe = controller.subscribe(publish);
    return () => {
      unsubscribe();
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const currentPresentation = presentation;
    const main = document.querySelector<HTMLElement>("main[data-home-presentation]");
    if (!main || !currentPresentation) return;

    main.dataset.homePresentationTier = currentPresentation.selectedTier;
    if (currentPresentation.fallbackReason) {
      main.dataset.homeRealtimeFallback = currentPresentation.fallbackReason;
    } else {
      delete main.dataset.homeRealtimeFallback;
    }

    if (
      currentPresentation.selectedTier !== "realtime" ||
      !currentPresentation.eligibility.realtime ||
      currentPresentation.realtimeDeclined
    ) {
      main.dataset.homeRealtimePhase = currentPresentation.realtimeDeclined
        ? "fallback"
        : "poster";
      main.dataset.homeRealtimeVisible = "false";
      return;
    }

    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const poster = main.querySelector<HTMLImageElement>(
      '[data-authored-media="home-poster"] img',
    );
    if (!canvas || !stage || !poster) return;

    let disposed = false;
    let firstFrame = false;
    let activationFrame = 0;
    let secondActivationFrame = 0;
    let scrollFrame = 0;
    let runtime: RealtimeRuntime | null = null;
    let unsubscribeRuntime: () => void = () => undefined;

    const setVisible = (active: boolean) => {
      const visible = firstFrame && active;
      stage.dataset.visible = String(visible);
      main.dataset.homeRealtimeVisible = String(visible);
    };

    const readTimeline = () => {
      const timeline = homeRealtimeTimeline({
        anchor: window.scrollY + Math.min(window.innerHeight * 0.35, 240),
        beats: beatGeometry(main),
      });
      progressRef.current = timeline.progress;
      stage.dataset.homeRealtimeBeat = timeline.beat;
      stage.dataset.homeRealtimeProgress = timeline.progress.toFixed(4);
      const widePassage = window.matchMedia("(min-width: 64rem)").matches;
      const active = timeline.active && (widePassage || timeline.beat === "opening");
      setVisible(active);
      runtime?.setActivity({ offscreen: !active });
      runtime?.invalidate();
      return active;
    };

    const synchronizeTimeline = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        readTimeline();
      });
    };

    const synchronizeVisibility = () =>
      runtime?.setActivity({ hidden: document.visibilityState === "hidden" });
    const suspend = () => runtime?.setActivity({ hidden: true });
    const restore = () => {
      runtime?.setActivity({
        complete: false,
        hidden: document.visibilityState === "hidden",
      });
      readTimeline();
    };
    const cover = () => runtime?.setActivity({ covered: true });
    const stopForRouteIntent = (event: MouseEvent) => {
      if (isModifiedNavigation(event)) return;
      const target = event.target;
      const anchor =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!anchor || anchor.target || anchor.download) return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname !== window.location.pathname
      ) {
        runtime?.setActivity({ complete: true });
      }
    };

    const synchronizeBag = () => {
      const bagDialog = document.getElementById("bag-dialog");
      runtime?.setActivity({
        covered: bagDialog instanceof HTMLDialogElement && bagDialog.open,
      });
    };
    const bagObserver = new MutationObserver(synchronizeBag);
    const shell = document.querySelector("body > header");
    if (shell) {
      bagObserver.observe(shell, {
        attributeFilter: ["open"],
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    const resize = new ResizeObserver(() => {
      runtime?.resize({
        devicePixelRatio: window.devicePixelRatio,
        viewport: window.matchMedia("(max-width: 47.999rem)").matches
          ? "mobile"
          : "desktop",
      });
      synchronizeTimeline();
    });
    resize.observe(stage);

    const start = async () => {
      if (disposed || runtime) return;
      runtime = createRealtimeRuntime({
        devicePixelRatio: window.devicePixelRatio,
        initialActivity: {
          hidden: document.visibilityState === "hidden",
          offscreen: !readTimeline(),
        },
        loadScene: createLazyHomeSceneLoader({
          canvas,
          getProgress: () => progressRef.current,
          onFirstFrame: () => {
            if (disposed) return;
            firstFrame = true;
            stage.dataset.frame = "ready";
            readTimeline();
          },
          requestRender: () => runtime?.invalidate(),
        }),
        onDowngrade: (reason) => controllerRef.current?.downgrade(reason),
        presentation: currentPresentation,
        viewport: window.matchMedia("(max-width: 47.999rem)").matches
          ? "mobile"
          : "desktop",
      });
      runtimeRef.current = runtime;
      const publish = () => {
        if (!runtime || disposed) return;
        const snapshot = runtime.getSnapshot();
        stage.dataset.runtimePhase = snapshot.phase;
        main.dataset.homeRealtimePhase = snapshot.phase;
        if (snapshot.fallbackReason) {
          main.dataset.homeRealtimeFallback = snapshot.fallbackReason;
        }
        if (snapshot.phase === "fallback") setVisible(false);
      };
      unsubscribeRuntime = runtime.subscribe(publish);
      publish();
      synchronizeBag();
      await runtime.start();
      publish();
    };

    const scheduleStart = () => {
      if (activationFrame || secondActivationFrame || disposed) return;
      // Give the eager authored poster a paint before competing for the GLB.
      activationFrame = window.requestAnimationFrame(() => {
        activationFrame = 0;
        secondActivationFrame = window.requestAnimationFrame(() => {
          secondActivationFrame = 0;
          void start();
        });
      });
    };

    main.dataset.homeRealtimePhase = "poster";
    main.dataset.homeRealtimeVisible = "false";
    stage.dataset.visible = "false";
    if (poster.complete && poster.naturalWidth > 0) scheduleStart();
    else poster.addEventListener("load", scheduleStart, { once: true });

    window.addEventListener("scroll", synchronizeTimeline, { passive: true });
    window.addEventListener("resize", synchronizeTimeline, { passive: true });
    document.addEventListener("visibilitychange", synchronizeVisibility);
    document.addEventListener("vanta:bag-opened", cover);
    document.addEventListener("click", stopForRouteIntent, true);
    document.addEventListener("freeze", suspend);
    window.addEventListener("pagehide", suspend);
    window.addEventListener("pageshow", restore);

    return () => {
      disposed = true;
      poster.removeEventListener("load", scheduleStart);
      window.removeEventListener("scroll", synchronizeTimeline);
      window.removeEventListener("resize", synchronizeTimeline);
      document.removeEventListener("visibilitychange", synchronizeVisibility);
      document.removeEventListener("vanta:bag-opened", cover);
      document.removeEventListener("click", stopForRouteIntent, true);
      document.removeEventListener("freeze", suspend);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("pageshow", restore);
      bagObserver.disconnect();
      resize.disconnect();
      for (const frame of [activationFrame, secondActivationFrame, scrollFrame]) {
        if (frame) window.cancelAnimationFrame(frame);
      }
      unsubscribeRuntime();
      runtime?.dispose();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
      main.dataset.homeRealtimeVisible = "false";
    };
  }, [presentation]);

  if (
    !presentation ||
    presentation.selectedTier !== "realtime" ||
    !presentation.eligibility.realtime ||
    presentation.realtimeDeclined
  ) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={styles.realtimeStage}
      data-home-realtime-stage
      data-visible="false"
      ref={stageRef}
    >
      <canvas className={styles.realtimeCanvas} ref={canvasRef} tabIndex={-1} />
    </div>
  );
}

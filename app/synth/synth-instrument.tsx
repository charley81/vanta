"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { DEFAULT_MORPH_SESSION } from "@/src/continuity";
import {
  createNativeBrowserPresentationController,
  type BrowserPresentationController,
} from "@/src/presentation/browser.client";
import { createRealtimeRuntime, type RealtimeRuntime } from "@/src/realtime/runtime";
import { createLazySynthSceneLoader } from "@/src/synth/realtime-loader.client";
import { morphSessionStore } from "@/src/synth/session.client";

import styles from "./synth.module.css";

const FALLBACK_COPY = {
  "reduced-motion": "Interactive view is unavailable with the current motion preference.",
  network: "Interactive view is unavailable on the current network.",
  capability: "Interactive view is unavailable in this browser.",
  "resource-budget": "Interactive view exceeded its resource budget. The authored instrument remains available.",
  "startup-timeout": "Interactive view took too long to prepare. The authored instrument remains available.",
  "runtime-failure": "Interactive view became unavailable. Controls and sound remain available below.",
  performance: "Interactive view was replaced after sustained performance limits. Controls and sound remain available below.",
} as const;

export function SynthInstrument() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<BrowserPresentationController | null>(null);
  const runtimeRef = useRef<RealtimeRuntime | null>(null);
  const [presentation, setPresentation] = useState<
    ReturnType<BrowserPresentationController["getSnapshot"]> | null
  >(null);
  const [phase, setPhase] = useState<
    "poster" | "loading" | "ready" | "suspended" | "fallback"
  >("poster");
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const session = useSyncExternalStore(
    morphSessionStore.subscribe,
    morphSessionStore.getSnapshot,
    () => DEFAULT_MORPH_SESSION,
  );

  useEffect(() => {
    const controller = createNativeBrowserPresentationController(
      "direct-manipulation",
    );
    controllerRef.current = controller;
    const publish = () => setPresentation(controller.getSnapshot());
    publish();
    const unsubscribe = controller.subscribe(publish);
    return () => {
      unsubscribe();
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const stage = stageRef.current;
    if (!runtime || !stage) return;

    const synchronizeVisibility = () =>
      runtime.setActivity({ hidden: document.visibilityState === "hidden" });
    const suspend = () => runtime.setActivity({ hidden: true });
    const restore = () => synchronizeVisibility();
    const cover = () => runtime.setActivity({ covered: true });
    const stopForRouteIntent = (event: MouseEvent) => {
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
        runtime.setActivity({ complete: true });
      }
    };

    const intersection = new IntersectionObserver(
      ([entry]) => runtime.setActivity({ offscreen: !entry?.isIntersecting }),
      { threshold: 0.01 },
    );
    intersection.observe(stage);
    const resize = new ResizeObserver(() =>
      runtime.resize({
        devicePixelRatio: window.devicePixelRatio,
        viewport: window.matchMedia("(max-width: 47.999rem)").matches
          ? "mobile"
          : "desktop",
      }),
    );
    resize.observe(stage);

    const bagDialog = document.getElementById("bag-dialog");
    const synchronizeBag = () =>
      runtime.setActivity({
        covered: bagDialog instanceof HTMLDialogElement && bagDialog.open,
      });
    const bagObserver = new MutationObserver(synchronizeBag);
    if (bagDialog) {
      bagObserver.observe(bagDialog, {
        attributeFilter: ["open"],
        attributes: true,
      });
      synchronizeBag();
    }

    synchronizeVisibility();
    document.addEventListener("visibilitychange", synchronizeVisibility);
    document.addEventListener("vanta:bag-opened", cover);
    document.addEventListener("click", stopForRouteIntent, true);
    document.addEventListener("freeze", suspend);
    window.addEventListener("pagehide", suspend);
    window.addEventListener("pageshow", restore);
    return () => {
      intersection.disconnect();
      resize.disconnect();
      bagObserver.disconnect();
      document.removeEventListener("visibilitychange", synchronizeVisibility);
      document.removeEventListener("vanta:bag-opened", cover);
      document.removeEventListener("click", stopForRouteIntent, true);
      document.removeEventListener("freeze", suspend);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("pageshow", restore);
    };
  }, [phase]);

  useEffect(
    () => () => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    },
    [],
  );

  async function activate() {
    const canvas = canvasRef.current;
    const currentPresentation = presentation;
    if (!canvas || !currentPresentation || runtimeRef.current) return;

    const runtime: RealtimeRuntime = createRealtimeRuntime({
      devicePixelRatio: window.devicePixelRatio,
      loadScene: createLazySynthSceneLoader({
        canvas,
        requestRender: () => runtimeRef.current?.invalidate(),
      }),
      onDowngrade: (reason) => controllerRef.current?.downgrade(reason),
      presentation:
        controllerRef.current?.getDataSavingOptInSnapshot() ??
        currentPresentation,
      viewport: window.matchMedia("(max-width: 47.999rem)").matches
        ? "mobile"
        : "desktop",
    });
    runtimeRef.current = runtime;
    const publish = () => {
      const snapshot = runtime.getSnapshot();
      if (
        snapshot.phase === "loading" ||
        snapshot.phase === "ready" ||
        snapshot.phase === "suspended" ||
        snapshot.phase === "fallback"
      ) {
        setPhase(snapshot.phase);
      }
      setFallbackReason(snapshot.fallbackReason);
    };
    const unsubscribe = runtime.subscribe(publish);
    publish();
    await runtime.start();
    publish();
    if (runtime.getSnapshot().phase === "fallback") unsubscribe();
  }

  const dataSaving = presentation?.fallbackReason === "data-saving";
  const canActivate =
    presentation !== null &&
    !presentation.realtimeDeclined &&
    (presentation.eligibility.realtime || dataSaving);
  const selectedValue = session.values[session.selectedControl];
  const status =
    phase === "loading"
      ? "Preparing interactive instrument view…"
      : phase === "ready"
        ? "Interactive instrument ready. Tap a lit control or drag it to adjust its normalized value."
        : phase === "suspended"
          ? "Interactive instrument paused while it is not visible."
          : phase === "fallback"
            ? FALLBACK_COPY[
                fallbackReason as keyof typeof FALLBACK_COPY
              ] ?? "Interactive view is unavailable. Controls and sound remain available below."
            : dataSaving
              ? "Data saving is active. The model will not download unless you load the interactive instrument view."
              : presentation && !presentation.eligibility.realtime
                ? FALLBACK_COPY[
                    presentation.fallbackReason as keyof typeof FALLBACK_COPY
                  ] ?? "Interactive view is unavailable."
                : "Authored instrument poster ready. The model remains unloaded.";

  return (
    <figure className={styles.instrumentFigure}>
      <div
        aria-hidden="true"
        className={styles.instrumentStage}
        data-realtime-phase={phase}
        ref={stageRef}
      >
        <picture className={styles.instrumentPoster}>
          <source
            media="(max-width: 47.999rem)"
            srcSet="/media/stills/synth-poster-720.avif"
            type="image/avif"
          />
          <source
            srcSet="/media/stills/synth-poster-1440.avif"
            type="image/avif"
          />
          <source
            media="(max-width: 47.999rem)"
            srcSet="/media/stills/synth-poster-720.webp"
            type="image/webp"
          />
          <img
            alt=""
            decoding="async"
            height="810"
            src="/media/stills/synth-poster-1440.webp"
            width="1440"
          />
        </picture>
        <canvas className={styles.instrumentCanvas} ref={canvasRef} />
        <div className={styles.instrumentReadout} data-instrument-readout>
          <span>SELECTED / {session.selectedControl.toUpperCase()}</span>
          <strong>{selectedValue}%</strong>
        </div>
      </div>
      <div className={styles.instrumentActivation}>
        <p aria-live="polite" data-realtime-status role="status">
          {status}
        </p>
        {phase === "poster" && canActivate ? (
          <button onClick={() => void activate()} type="button">
            Load interactive instrument view
          </button>
        ) : null}
      </div>
      <figcaption>
        <span>MONOLITH / FULL INSTRUMENT</span>
        <span>
          Lit physical controls share one normalized state with the semantic
          Control deck. Unlit controls remain inert.
        </span>
      </figcaption>
    </figure>
  );
}

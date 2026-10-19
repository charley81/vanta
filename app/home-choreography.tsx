"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import {
  CONTINUITY_READY_EVENT,
  ROUTE_ACTIVATE_ENHANCEMENTS_EVENT,
  ROUTE_RECOMPOSE_EVENT,
  type RouteEnhancementPosition,
} from "@/src/continuity/composition";
import {
  HOME_REDUCED_MOTION_QUERY,
  HOME_TALL_VIEWPORT_QUERY,
  HOME_WIDE_VIEWPORT_QUERY,
  chapterPositionFromOffset,
  horizontalProgress,
  offsetFromChapterPosition,
  qualifyHomeChoreography,
} from "@/src/home/choreography";

import styles from "./home.module.css";

type ReadingPosition =
  | {
      kind: "chapter";
      chapterIndex: number;
      normalizedProgress: number;
    }
  | { kind: "beat"; beat: string; normalizedProgress: number }
  | null;

function documentTop(element: HTMLElement): number {
  return element.getBoundingClientRect().top + window.scrollY;
}

function supportsWorkingStickyPositioning(): boolean {
  if (!CSS.supports?.("position", "sticky")) return false;

  const scroller = document.createElement("div");
  const sticky = document.createElement("div");
  const filler = document.createElement("div");
  Object.assign(scroller.style, {
    position: "absolute",
    top: "-10000px",
    width: "2px",
    height: "2px",
    overflow: "auto",
  });
  Object.assign(sticky.style, {
    position: "sticky",
    top: "0",
    width: "1px",
    height: "1px",
  });
  Object.assign(filler.style, { width: "1px", height: "4px" });
  scroller.append(sticky, filler);
  document.body.append(scroller);
  scroller.scrollTop = 1;
  const works =
    getComputedStyle(sticky).position === "sticky" &&
    Math.abs(
      sticky.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
    ) <= 1;
  scroller.remove();
  return works;
}

function instantScroll(top: number): void {
  window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "instant" });
}

export function HomeChoreography({ children }: { children: ReactNode }) {
  const passageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const passageElement = passageRef.current;
    const viewportElement = viewportRef.current;
    const trackElement = trackRef.current;
    const mainElement = passageElement?.closest<HTMLElement>("main");
    if (!passageElement || !viewportElement || !trackElement || !mainElement) {
      return;
    }
    const passage = passageElement;
    const viewport = viewportElement;
    const track = trackElement;
    const main = mainElement;

    const chapters = Array.from(
      track.querySelectorAll<HTMLElement>(":scope > [data-chapter]"),
    );
    const queries = {
      wide: window.matchMedia(HOME_WIDE_VIEWPORT_QUERY),
      tall: window.matchMedia(HOME_TALL_VIEWPORT_QUERY),
      reducedMotion: window.matchMedia(HOME_REDUCED_MOTION_QUERY),
    };
    let enabled = false;
    let chapterStep = 0;
    let passageStart = 0;
    let travel = 0;
    let scrollFrame = 0;
    let resizeFrame = 0;
    let initialActivationFrame = 0;
    let delayedActivationFrame = 0;
    let lastReadingPosition: ReadingPosition = null;

    function shellHeight(): number {
      return document.querySelector<HTMLElement>("body > header")?.offsetHeight ?? 0;
    }

    function beatPosition(): ReadingPosition {
      const beats = Array.from(
        main.querySelectorAll<HTMLElement>("[data-home-beat]"),
      );
      const anchor = window.scrollY + Math.min(window.innerHeight * 0.35, 240);
      const beat =
        beats.findLast((candidate) => documentTop(candidate) <= anchor) ??
        beats.at(0);
      if (!beat?.dataset.homeBeat) return null;
      const chapterIndex = chapters.indexOf(beat);
      const distance = Math.max(0, beat.offsetHeight - window.innerHeight);
      const normalizedProgress =
        distance === 0
          ? 0
          : Math.min(
              1,
              Math.max(0, (window.scrollY - documentTop(beat)) / distance),
            );
      return chapterIndex >= 0
        ? { kind: "chapter", chapterIndex, normalizedProgress }
        : {
            kind: "beat",
            beat: beat.dataset.homeBeat,
            normalizedProgress,
          };
    }

    function captureReadingPosition(): ReadingPosition {
      if (
        enabled &&
        window.scrollY >= passageStart - 1 &&
        window.scrollY <= passageStart + travel + 1
      ) {
        return {
          kind: "chapter",
          ...chapterPositionFromOffset({
            chapterCount: chapters.length,
            chapterStep,
            offset: window.scrollY - passageStart,
          }),
        };
      }
      return beatPosition();
    }

    function restoreReadingPosition(position: ReadingPosition): void {
      if (!position) return;
      if (position.kind === "chapter" && enabled) {
        instantScroll(
          passageStart +
            offsetFromChapterPosition({
              chapterCount: chapters.length,
              chapterIndex: position.chapterIndex,
              chapterStep,
              normalizedProgress: position.normalizedProgress,
            }),
        );
        return;
      }

      const beat =
        position.kind === "chapter"
          ? chapters[position.chapterIndex]
          : main.querySelector<HTMLElement>(
              `[data-home-beat="${CSS.escape(position.beat)}"]`,
            );
      if (!beat) return;
      if (position.kind === "beat" && position.beat === "opening") {
        instantScroll(0);
        return;
      }
      const distance = Math.max(0, beat.offsetHeight - window.innerHeight);
      instantScroll(
        documentTop(beat) + distance * position.normalizedProgress,
      );
    }

    function clearChapterContinuityGeometry(): void {
      for (const chapter of chapters) {
        delete chapter.dataset.continuityTop;
        delete chapter.dataset.continuityHeight;
        delete chapter.dataset.continuityActive;
      }
    }

    function setVertical(
      position: ReadingPosition,
      preservePosition: boolean,
      fallback?: string,
    ): void {
      enabled = false;
      main.dataset.homePresentation = "vertical";
      if (fallback) main.dataset.homeFallback = fallback;
      else delete main.dataset.homeFallback;
      delete main.dataset.homeProgress;
      delete main.dataset.homeActiveChapter;
      passage.style.removeProperty("height");
      track.style.removeProperty("transform");
      viewport.style.removeProperty("--home-chapter-progress");
      clearChapterContinuityGeometry();
      chapterStep = 0;
      passageStart = 0;
      travel = 0;
      if (preservePosition) restoreReadingPosition(position);
      if (position) lastReadingPosition = position;
    }

    function updateHorizontalPosition(): void {
      if (!enabled) return;
      const progress = horizontalProgress({
        passageTop: passageStart,
        scrollY: window.scrollY,
        travel,
      });
      const offset = progress * travel;
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      viewport.style.setProperty("--home-chapter-progress", String(progress));
      const semantic = chapterPositionFromOffset({
        chapterCount: chapters.length,
        chapterStep,
        offset,
      });
      const passageIsCurrent =
        window.scrollY >= passageStart - 1 &&
        window.scrollY <= passageStart + travel + 1;
      chapters.forEach((chapter, index) => {
        if (passageIsCurrent && index === semantic.chapterIndex) {
          chapter.dataset.continuityActive = "true";
        } else {
          delete chapter.dataset.continuityActive;
        }
      });
      main.dataset.homeProgress = progress.toFixed(4);
      main.dataset.homeActiveChapter =
        chapters[semantic.chapterIndex]?.dataset.chapter ?? "";
      if (passageIsCurrent) {
        lastReadingPosition = { kind: "chapter", ...semantic };
      }
    }

    function setHorizontal(position: ReadingPosition): void {
      main.dataset.homePresentation = "horizontal";
      delete main.dataset.homeFallback;
      enabled = true;
      chapterStep = chapters.at(0)?.offsetWidth ?? viewport.clientWidth;
      travel = Math.max(0, chapterStep * Math.max(0, chapters.length - 1));
      passage.style.height = `${viewport.offsetHeight + travel}px`;
      passageStart = Math.max(0, documentTop(passage) - shellHeight());

      chapters.forEach((chapter, index) => {
        chapter.dataset.continuityTop = String(
          passageStart + chapterStep * index,
        );
        chapter.dataset.continuityHeight = String(
          window.innerHeight + chapterStep,
        );
      });
      restoreReadingPosition(position);
      updateHorizontalPosition();
      if (position) lastReadingPosition = position;
    }

    function qualification() {
      return qualifyHomeChoreography({
        wideViewport: queries.wide.matches,
        tallViewport: queries.tall.matches,
        reducedMotion: queries.reducedMotion.matches,
        sticky: supportsWorkingStickyPositioning(),
      });
    }

    function activate(position = captureReadingPosition()): void {
      const result = qualification();
      if (!result.eligible) {
        setVertical(position, enabled, result.fallback);
        return;
      }
      if (enabled) setVertical(null, false);
      setHorizontal(position);
    }

    function handleScroll(): void {
      if (scrollFrame || resizeFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        if (enabled) updateHorizontalPosition();
        lastReadingPosition = captureReadingPosition();
      });
    }

    function handleEnvironmentChange(): void {
      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
        scrollFrame = 0;
      }
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      const position = lastReadingPosition ?? captureReadingPosition();
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        activate(position);
      });
    }

    function handleFocusIn(event: FocusEvent): void {
      if (!enabled || !(event.target instanceof Element)) return;
      const chapter = event.target.closest<HTMLElement>("[data-chapter]");
      const chapterIndex = chapter ? chapters.indexOf(chapter) : -1;
      if (chapterIndex < 0) return;
      instantScroll(passageStart + chapterIndex * chapterStep);
      updateHorizontalPosition();
      lastReadingPosition = {
        kind: "chapter",
        chapterIndex,
        normalizedProgress: 0,
      };
    }

    function handleRecompose(): void {
      if (initialActivationFrame) {
        window.cancelAnimationFrame(initialActivationFrame);
        initialActivationFrame = 0;
      }
      if (delayedActivationFrame) {
        window.cancelAnimationFrame(delayedActivationFrame);
        delayedActivationFrame = 0;
      }
      setVertical(null, false);
    }

    function scheduleInitialActivation(): void {
      initialActivationFrame = window.requestAnimationFrame(() => {
        initialActivationFrame = 0;
        delayedActivationFrame = window.requestAnimationFrame(() => {
          delayedActivationFrame = 0;
          activate(captureReadingPosition());
        });
      });
    }

    function handleContinuityReady(): void {
      document.removeEventListener(
        CONTINUITY_READY_EVENT,
        handleContinuityReady,
      );
      scheduleInitialActivation();
    }

    function handleActivateEnhancements(event: Event): void {
      const detail = (event as CustomEvent<RouteEnhancementPosition>).detail;
      const chapterIndex = chapters.findIndex(
        (chapter) => chapter.dataset.chapter === detail?.semanticSection,
      );
      const position: ReadingPosition =
        chapterIndex >= 0
          ? {
              kind: "chapter",
              chapterIndex,
              normalizedProgress: detail.normalizedProgress,
            }
          : detail?.semanticSection
            ? {
                kind: "beat",
                beat: detail.semanticSection,
                normalizedProgress: detail.normalizedProgress,
              }
            : captureReadingPosition();
      activate(position);
    }

    const mediaQueries = Object.values(queries);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleEnvironmentChange, {
      passive: true,
    });
    track.addEventListener("focusin", handleFocusIn);
    document.addEventListener(ROUTE_RECOMPOSE_EVENT, handleRecompose);
    document.addEventListener(
      ROUTE_ACTIVATE_ENHANCEMENTS_EVENT,
      handleActivateEnhancements,
    );
    mediaQueries.forEach((query) =>
      query.addEventListener("change", handleEnvironmentChange),
    );

    lastReadingPosition = captureReadingPosition();
    const initial = qualification();
    if (!initial.eligible) main.dataset.homeFallback = initial.fallback;
    if (document.documentElement.dataset.continuityReady === "true") {
      scheduleInitialActivation();
    } else {
      document.addEventListener(
        CONTINUITY_READY_EVENT,
        handleContinuityReady,
        { once: true },
      );
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleEnvironmentChange);
      track.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener(ROUTE_RECOMPOSE_EVENT, handleRecompose);
      document.removeEventListener(
        CONTINUITY_READY_EVENT,
        handleContinuityReady,
      );
      document.removeEventListener(
        ROUTE_ACTIVATE_ENHANCEMENTS_EVENT,
        handleActivateEnhancements,
      );
      mediaQueries.forEach((query) =>
        query.removeEventListener("change", handleEnvironmentChange),
      );
      for (const frame of [
        scrollFrame,
        resizeFrame,
        initialActivationFrame,
        delayedActivationFrame,
      ]) {
        if (frame) window.cancelAnimationFrame(frame);
      }
      setVertical(null, false);
    };
  }, []);

  return (
    <div
      className={styles.chapterPassage}
      data-home-choreography="chapters"
      ref={passageRef}
    >
      <div className={styles.chapterViewport} ref={viewportRef}>
        <div
          className={styles.chapters}
          data-home-sequence="chapters"
          ref={trackRef}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

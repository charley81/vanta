import type { ReturnContext } from "./history";

export type SemanticSection = {
  top: number;
  height: number;
  headingTarget: string;
};

export type RestorationOutcome =
  | { status: "canceled" }
  | {
      status: "restored";
      position: "semantic" | "scroll-fallback";
      focus:
        | "saved-target"
        | "section-heading"
        | "route-heading"
        | "unchanged";
    };

export function semanticScrollY({
  section,
  normalizedProgress,
  viewportHeight,
}: {
  section: SemanticSection;
  normalizedProgress: number;
  viewportHeight: number;
}): number {
  const progress = Math.min(1, Math.max(0, normalizedProgress));
  const traversableDistance = Math.max(0, section.height - viewportHeight);
  return Math.max(0, section.top + traversableDistance * progress);
}

export type RestorationAdapter = {
  recompose(): void | Promise<void>;
  resolveSection(id: string): SemanticSection | null;
  viewportHeight(): number;
  applyScroll(y: number): void;
  focus(target: string): boolean;
  focusRouteHeading(): void;
  activateEnhancements(): void | Promise<void>;
  listenForInteraction(listener: () => void): () => void;
  scheduleCorrection(correction: () => void): () => void;
};

export type RestorationController = {
  cancel(): void;
  restore(context: ReturnContext): Promise<RestorationOutcome>;
};

export function createRestorationController(
  adapter: RestorationAdapter,
): RestorationController {
  let cancelCorrection: (() => void) | null = null;
  let stopListening: (() => void) | null = null;
  let generation = 0;

  function cancel() {
    generation += 1;
    cancelCorrection?.();
    stopListening?.();
    cancelCorrection = null;
    stopListening = null;
  }

  return {
    cancel,
    async restore(context) {
      cancel();
      const currentGeneration = generation;
      let visitorInteracted = false;
      stopListening = adapter.listenForInteraction(() => {
        visitorInteracted = true;
        cancelCorrection?.();
        cancelCorrection = null;
        const stop = stopListening;
        stopListening = null;
        stop?.();
      });

      await adapter.recompose();
      if (currentGeneration !== generation) return { status: "canceled" };
      const section = adapter.resolveSection(context.semanticSection);
      const position = section ? "semantic" : "scroll-fallback";
      adapter.applyScroll(
        section
          ? semanticScrollY({
              section,
              normalizedProgress: context.normalizedProgress,
              viewportHeight: adapter.viewportHeight(),
            })
          : context.scroll.y,
      );

      let focus:
        | "saved-target"
        | "section-heading"
        | "route-heading"
        | "unchanged";
      if (!context.focusTarget) {
        focus = "unchanged";
      } else if (adapter.focus(context.focusTarget)) {
        focus = "saved-target";
      } else if (section && adapter.focus(section.headingTarget)) {
        focus = "section-heading";
      } else {
        adapter.focusRouteHeading();
        focus = "route-heading";
      }

      await adapter.activateEnhancements();
      if (currentGeneration === generation && section && !visitorInteracted) {
        cancelCorrection = adapter.scheduleCorrection(() => {
          if (visitorInteracted || currentGeneration !== generation) return;
          const corrected = adapter.resolveSection(context.semanticSection);
          if (!corrected) return;
          adapter.applyScroll(
            semanticScrollY({
              section: corrected,
              normalizedProgress: context.normalizedProgress,
              viewportHeight: adapter.viewportHeight(),
            }),
          );
          if (context.focusTarget) {
            if (!adapter.focus(context.focusTarget)) {
              if (!adapter.focus(corrected.headingTarget)) {
                adapter.focusRouteHeading();
              }
            }
          }
          cancelCorrection = null;
          const stop = stopListening;
          stopListening = null;
          stop?.();
        });
      } else {
        const stop = stopListening;
        stopListening = null;
        stop?.();
      }

      return { status: "restored", position, focus };
    },
  };
}

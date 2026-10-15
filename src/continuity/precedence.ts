import type { CanonicalRoute, ReturnContext } from "./history";
import type { MorphSession } from "./morph";
import { PREVIEW_STAGES, type PreviewSession, type PreviewStage } from "./preview";

export type NavigationIntent = "explicit" | "history";

export type ContinuityResolution = {
  route: CanonicalRoute;
  bagConfirmed: boolean;
  position:
    | { source: "canonical" }
    | {
        source: "history";
        semanticSection: string;
        normalizedProgress: number;
        scroll: { x: number; y: number };
      };
  focus:
    | { source: "route-heading" }
    | { source: "history"; target: string }
    | { source: "unchanged" };
  visibleState:
    | { kind: "route" }
    | { kind: "bag"; invoker: string }
    | { kind: "preview-unavailable" }
    | { kind: "preview"; stage: PreviewStage | "terminal" };
  morphSession: MorphSession | null;
  previewRecovery: PreviewSession | null;
};

function canRestorePreviewStage(
  stage: PreviewStage | "terminal",
  session: PreviewSession,
): boolean {
  if (stage === "terminal") return session.completed;
  return PREVIEW_STAGES.indexOf(stage) <= PREVIEW_STAGES.indexOf(session.reachedStage);
}

export function resolveContinuity({
  route,
  intent,
  bagConfirmed,
  returnContext,
  previewSession,
  morphSession,
}: {
  route: CanonicalRoute;
  intent: NavigationIntent;
  bagConfirmed: boolean;
  returnContext: ReturnContext | null;
  previewSession: PreviewSession | null;
  morphSession: MorphSession | null;
}): ContinuityResolution {
  const historyMatchesRoute =
    intent === "history" && returnContext?.originRoute === route;
  const historyPosition = historyMatchesRoute ? returnContext : null;

  let visibleState: ContinuityResolution["visibleState"] = { kind: "route" };
  if (route === "/checkout-preview" && !bagConfirmed) {
    visibleState = { kind: "preview-unavailable" };
  } else if (
    intent === "history" &&
    route === "/checkout-preview" &&
    bagConfirmed &&
    returnContext?.visibleState.kind === "preview" &&
    previewSession &&
    canRestorePreviewStage(returnContext.visibleState.stage, previewSession)
  ) {
    visibleState = {
      kind: "preview",
      stage: returnContext.visibleState.stage,
    };
  } else if (
    historyMatchesRoute &&
    returnContext.visibleState.kind === "bag" &&
    returnContext.bagInvoker
  ) {
    visibleState = { kind: "bag", invoker: returnContext.bagInvoker };
  } else if (route === "/checkout-preview" && bagConfirmed) {
    visibleState = { kind: "preview", stage: "contact" };
  }

  return {
    route,
    bagConfirmed,
    position: historyPosition
      ? {
          source: "history",
          semanticSection: historyPosition.semanticSection,
          normalizedProgress: historyPosition.normalizedProgress,
          scroll: historyPosition.scroll,
        }
      : { source: "canonical" },
    focus: historyPosition
      ? historyPosition.focusTarget
        ? { source: "history", target: historyPosition.focusTarget }
        : { source: "unchanged" }
      : { source: "route-heading" },
    visibleState,
    morphSession: route === "/synth" ? morphSession : null,
    previewRecovery:
      route === "/checkout-preview" && bagConfirmed ? previewSession : null,
  };
}

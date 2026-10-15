import { describe, expect, it } from "vitest";

import {
  createDefaultPreviewSession,
  createMorphSessionStore,
  resolveContinuity,
  type ReturnContext,
} from "@/src/continuity";

const routeContext: ReturnContext = {
  version: 1,
  originRoute: "/monolith",
  semanticSection: "craft",
  normalizedProgress: 0.75,
  focusTarget: "craft-link",
  bagInvoker: null,
  scroll: { x: 0, y: 1200 },
  visibleState: { kind: "route" },
};

const previewContext: ReturnContext = {
  ...routeContext,
  originRoute: "/monolith",
  visibleState: { kind: "preview", stage: "terminal" },
};

describe("continuity precedence", () => {
  it("starts explicit route navigation canonically while retaining bounded recovery", () => {
    const preview = {
      ...createDefaultPreviewSession(1_000),
      reachedStage: "delivery" as const,
      activeStage: "delivery" as const,
    };
    const resolution = resolveContinuity({
      route: "/checkout-preview",
      intent: "explicit",
      bagConfirmed: true,
      returnContext: routeContext,
      previewSession: preview,
      morphSession: null,
    });

    expect(resolution.position).toEqual({ source: "canonical" });
    expect(resolution.focus).toEqual({ source: "route-heading" });
    expect(resolution.visibleState).toEqual({ kind: "preview", stage: "contact" });
    expect(resolution.previewRecovery).toEqual(preview);
  });

  it("restores semantic position and prior focus only for matching history", () => {
    const restored = resolveContinuity({
      route: "/monolith",
      intent: "history",
      bagConfirmed: false,
      returnContext: routeContext,
      previewSession: null,
      morphSession: null,
    });
    expect(restored.position).toMatchObject({
      source: "history",
      semanticSection: "craft",
      normalizedProgress: 0.75,
    });
    expect(restored.focus).toEqual({ source: "history", target: "craft-link" });

    const otherRoute = resolveContinuity({
      route: "/",
      intent: "history",
      bagConfirmed: false,
      returnContext: routeContext,
      previewSession: null,
      morphSession: null,
    });
    expect(otherRoute.position).toEqual({ source: "canonical" });
  });

  it("lets confirmed Bag authority reject forged terminal history", () => {
    const completed = {
      ...createDefaultPreviewSession(1_000),
      reachedStage: "review" as const,
      activeStage: "review" as const,
      completed: true,
    };
    const unavailable = resolveContinuity({
      route: "/checkout-preview",
      intent: "history",
      bagConfirmed: false,
      returnContext: previewContext,
      previewSession: completed,
      morphSession: null,
    });
    expect(unavailable.visibleState).toEqual({ kind: "preview-unavailable" });
    expect(unavailable.previewRecovery).toBeNull();

    const impossible = resolveContinuity({
      route: "/checkout-preview",
      intent: "history",
      bagConfirmed: true,
      returnContext: previewContext,
      previewSession: createDefaultPreviewSession(1_000),
      morphSession: null,
    });
    expect(impossible.visibleState).toEqual({ kind: "preview", stage: "contact" });
  });

  it("applies MORPH session only on Synth", () => {
    const morph = createMorphSessionStore().getSnapshot();
    expect(
      resolveContinuity({
        route: "/synth",
        intent: "explicit",
        bagConfirmed: false,
        returnContext: null,
        previewSession: null,
        morphSession: morph,
      }).morphSession,
    ).toEqual(morph);
    expect(
      resolveContinuity({
        route: "/monolith",
        intent: "explicit",
        bagConfirmed: false,
        returnContext: null,
        previewSession: null,
        morphSession: morph,
      }).morphSession,
    ).toBeNull();
  });
});

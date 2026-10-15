import { describe, expect, it, vi } from "vitest";

import {
  createRestorationController,
  semanticScrollY,
  type RestorationAdapter,
  type ReturnContext,
} from "@/src/continuity";

const context: ReturnContext = {
  version: 1,
  originRoute: "/",
  semanticSection: "fracture",
  normalizedProgress: 0.5,
  focusTarget: "fracture-action",
  bagInvoker: null,
  scroll: { x: 0, y: 900 },
  visibleState: { kind: "route" },
};

describe("semantic history restoration", () => {
  it("calculates normalized position against the current composition", () => {
    expect(
      semanticScrollY({
        section: { top: 500, height: 1_000, headingTarget: "heading" },
        normalizedProgress: 0.5,
        viewportHeight: 600,
      }),
    ).toBe(700);
  });

  it("recomposes, positions, focuses, then activates enhancement", async () => {
    const events: string[] = [];
    const correction: { current: (() => void) | null } = { current: null };
    const adapter: RestorationAdapter = {
      recompose: () => void events.push("recompose"),
      resolveSection: () => ({
        top: 400,
        height: 1_000,
        headingTarget: "fracture-heading",
      }),
      viewportHeight: () => 600,
      applyScroll: (y) => void events.push(`scroll:${y}`),
      focus: (target) => {
        events.push(`focus:${target}`);
        return target === "fracture-action";
      },
      focusRouteHeading: () => void events.push("focus:route"),
      activateEnhancements: () => void events.push("enhance"),
      listenForInteraction: () => () => undefined,
      scheduleCorrection: (callback) => {
        events.push("schedule-correction");
        correction.current = callback;
        return () => {
          correction.current = null;
        };
      },
    };

    const outcome = await createRestorationController(adapter).restore(context);
    expect(outcome).toEqual({
      status: "restored",
      position: "semantic",
      focus: "saved-target",
    });
    expect(events).toEqual([
      "recompose",
      "scroll:600",
      "focus:fracture-action",
      "enhance",
      "schedule-correction",
    ]);
    correction.current?.();
    expect(events.at(-1)).toBe("scroll:600");
  });

  it("cancels delayed correction on visitor interaction", async () => {
    let interact: () => void = () => undefined;
    const cancelCorrection = vi.fn();
    const applyScroll = vi.fn();
    const adapter: RestorationAdapter = {
      recompose: () => undefined,
      resolveSection: () => ({ top: 100, height: 800, headingTarget: "heading" }),
      viewportHeight: () => 400,
      applyScroll,
      focus: () => true,
      focusRouteHeading: () => undefined,
      activateEnhancements: () => undefined,
      listenForInteraction: (listener) => {
        interact = listener;
        return () => undefined;
      },
      scheduleCorrection: () => cancelCorrection,
    };

    await createRestorationController(adapter).restore(context);
    interact();
    expect(cancelCorrection).toHaveBeenCalledOnce();
    expect(applyScroll).toHaveBeenCalledOnce();
  });

  it("does not move focus for passive history restoration", async () => {
    const focus = vi.fn(() => true);
    const focusRouteHeading = vi.fn();
    const adapter: RestorationAdapter = {
      recompose: () => undefined,
      resolveSection: () => ({ top: 100, height: 800, headingTarget: "heading" }),
      viewportHeight: () => 400,
      applyScroll: () => undefined,
      focus,
      focusRouteHeading,
      activateEnhancements: () => undefined,
      listenForInteraction: () => () => undefined,
      scheduleCorrection: () => () => undefined,
    };

    const outcome = await createRestorationController(adapter).restore({
      ...context,
      focusTarget: null,
    });
    expect(focus).not.toHaveBeenCalled();
    expect(focusRouteHeading).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ status: "restored", focus: "unchanged" });
  });

  it("uses pixel fallback and route heading when semantic targets disappeared", async () => {
    const applyScroll = vi.fn();
    const focusRouteHeading = vi.fn();
    const adapter: RestorationAdapter = {
      recompose: () => undefined,
      resolveSection: () => null,
      viewportHeight: () => 600,
      applyScroll,
      focus: () => false,
      focusRouteHeading,
      activateEnhancements: () => undefined,
      listenForInteraction: () => () => undefined,
      scheduleCorrection: () => () => undefined,
    };

    const outcome = await createRestorationController(adapter).restore(context);
    expect(applyScroll).toHaveBeenCalledWith(900);
    expect(focusRouteHeading).toHaveBeenCalledOnce();
    expect(outcome).toEqual({
      status: "restored",
      position: "scroll-fallback",
      focus: "route-heading",
    });
  });
});

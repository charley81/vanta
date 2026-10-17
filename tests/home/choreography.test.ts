import { describe, expect, it } from "vitest";

import {
  chapterPositionFromOffset,
  horizontalProgress,
  offsetFromChapterPosition,
  qualifyHomeChoreography,
} from "@/src/home/choreography";

describe("Home horizontal choreography", () => {
  it("requires both viewport thresholds, normal motion, and sticky support", () => {
    expect(
      qualifyHomeChoreography({
        wideViewport: true,
        tallViewport: true,
        reducedMotion: false,
        sticky: true,
      }),
    ).toEqual({ eligible: true, fallback: null });

    expect(
      qualifyHomeChoreography({
        wideViewport: false,
        tallViewport: true,
        reducedMotion: false,
        sticky: true,
      }),
    ).toEqual({ eligible: false, fallback: "viewport" });
    expect(
      qualifyHomeChoreography({
        wideViewport: true,
        tallViewport: false,
        reducedMotion: false,
        sticky: true,
      }),
    ).toEqual({ eligible: false, fallback: "viewport" });
    expect(
      qualifyHomeChoreography({
        wideViewport: true,
        tallViewport: true,
        reducedMotion: true,
        sticky: true,
      }),
    ).toEqual({ eligible: false, fallback: "reduced-motion" });
    expect(
      qualifyHomeChoreography({
        wideViewport: true,
        tallViewport: true,
        reducedMotion: false,
        sticky: false,
      }),
    ).toEqual({ eligible: false, fallback: "sticky" });
  });

  it("clamps native document progress to the horizontal passage", () => {
    expect(horizontalProgress({ passageTop: 500, scrollY: 200, travel: 800 })).toBe(0);
    expect(horizontalProgress({ passageTop: 500, scrollY: 700, travel: 800 })).toBe(0.25);
    expect(horizontalProgress({ passageTop: 500, scrollY: 1_500, travel: 800 })).toBe(1);
  });

  it("round-trips semantic chapter progress across presentation changes", () => {
    const semantic = chapterPositionFromOffset({
      chapterCount: 9,
      chapterStep: 1_024,
      offset: 3.4 * 1_024,
    });
    expect(semantic.chapterIndex).toBe(3);
    expect(semantic.normalizedProgress).toBeCloseTo(0.4);
    expect(
      offsetFromChapterPosition({
        ...semantic,
        chapterCount: 9,
        chapterStep: 1_440,
      }),
    ).toBeCloseTo(3.4 * 1_440);
  });

  it("bounds malformed and terminal offsets safely", () => {
    expect(
      chapterPositionFromOffset({
        chapterCount: 9,
        chapterStep: 1_000,
        offset: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({ chapterIndex: 8, normalizedProgress: 0 });
    expect(
      chapterPositionFromOffset({
        chapterCount: 9,
        chapterStep: 1_000,
        offset: Number.NaN,
      }),
    ).toEqual({ chapterIndex: 0, normalizedProgress: 0 });
    expect(
      offsetFromChapterPosition({
        chapterCount: 9,
        chapterIndex: 8,
        chapterStep: 1_000,
        normalizedProgress: 1,
      }),
    ).toBe(8_000);
    expect(
      offsetFromChapterPosition({
        chapterCount: 9,
        chapterIndex: Number.NaN,
        chapterStep: 1_000,
        normalizedProgress: 0.5,
      }),
    ).toBe(500);
  });
});

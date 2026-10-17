import { describe, expect, it } from "vitest";

import {
  HOME_REALTIME_BEATS,
  homeRealtimePose,
  homeRealtimeTimeline,
} from "@/src/home/realtime-orchestration";

describe("Home Realtime orchestration", () => {
  it("interpolates reversible camera and light poses across canonical chapters", () => {
    const opening = homeRealtimePose(0);
    const morph = homeRealtimePose(5 / (HOME_REALTIME_BEATS.length - 1));
    const resolution = homeRealtimePose(1);

    expect(opening.cameraPosition).toEqual([0.46, 0.34, 0.48]);
    expect(morph).toMatchObject({
      cameraPosition: [0.02, 0.25, 0.2],
      verticalFovDegrees: 24,
      keyIntensity: 3.65,
    });
    expect(resolution.cameraPosition).toEqual(opening.cameraPosition);
    expect(resolution.cameraTarget).toEqual(opening.cameraTarget);
    expect(homeRealtimePose(-1)).toEqual(opening);
    expect(homeRealtimePose(2)).toEqual(resolution);
  });

  it("maps authored or virtual beat geometry without inventing durable scene state", () => {
    const beats = HOME_REALTIME_BEATS.map((beat, index) => ({
      beat,
      start: index * 1_000,
      end: (index + 1) * 1_000,
    }));

    expect(homeRealtimeTimeline({ anchor: -1, beats })).toEqual({
      active: false,
      beat: "opening",
      progress: 0,
    });
    expect(homeRealtimeTimeline({ anchor: 5_500, beats })).toEqual({
      active: true,
      beat: "morph",
      progress: (5 + 0.5) / 9,
    });
    expect(homeRealtimeTimeline({ anchor: 9_500, beats })).toEqual({
      active: true,
      beat: "resolution",
      progress: 1,
    });
    expect(homeRealtimeTimeline({ anchor: 10_001, beats })).toMatchObject({
      active: false,
      beat: "resolution",
      progress: 1,
    });
  });
});

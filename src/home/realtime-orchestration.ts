export const HOME_REALTIME_BEATS = [
  "opening",
  "philosophy",
  "reveal",
  "sub",
  "monolith",
  "morph",
  "gesture",
  "fracture",
  "craft",
  "resolution",
] as const;

export type HomeRealtimeBeat = (typeof HOME_REALTIME_BEATS)[number];
export type HomeRealtimeVector = readonly [number, number, number];

export type HomeRealtimePose = {
  cameraPosition: HomeRealtimeVector;
  cameraTarget: HomeRealtimeVector;
  verticalFovDegrees: number;
  modelRotationY: number;
  ambientIntensity: number;
  keyIntensity: number;
  fillIntensity: number;
};

export type HomeRealtimeBeatGeometry = {
  beat: HomeRealtimeBeat;
  start: number;
  end: number;
};

export type HomeRealtimeTimeline = {
  active: boolean;
  beat: HomeRealtimeBeat;
  progress: number;
};

const HOME_REALTIME_POSES: Record<HomeRealtimeBeat, HomeRealtimePose> = {
  opening: {
    cameraPosition: [0.46, 0.34, 0.48],
    cameraTarget: [0, 0.035, -0.1],
    verticalFovDegrees: 31,
    modelRotationY: -0.08,
    ambientIntensity: 0.34,
    keyIntensity: 3.1,
    fillIntensity: 1.25,
  },
  philosophy: {
    cameraPosition: [0.38, 0.31, 0.43],
    cameraTarget: [-0.025, 0.028, -0.1],
    verticalFovDegrees: 29,
    modelRotationY: -0.04,
    ambientIntensity: 0.3,
    keyIntensity: 2.8,
    fillIntensity: 1.1,
  },
  reveal: {
    cameraPosition: [0.1, 0.42, 0.44],
    cameraTarget: [0, 0.025, -0.1],
    verticalFovDegrees: 30,
    modelRotationY: 0,
    ambientIntensity: 0.42,
    keyIntensity: 3.45,
    fillIntensity: 1.35,
  },
  sub: {
    cameraPosition: [-0.28, 0.24, 0.35],
    cameraTarget: [-0.08, 0.025, -0.11],
    verticalFovDegrees: 27,
    modelRotationY: 0.07,
    ambientIntensity: 0.25,
    keyIntensity: 2.55,
    fillIntensity: 0.85,
  },
  monolith: {
    cameraPosition: [0.02, 0.55, 0.22],
    cameraTarget: [0, 0.025, -0.105],
    verticalFovDegrees: 29,
    modelRotationY: 0,
    ambientIntensity: 0.45,
    keyIntensity: 3.15,
    fillIntensity: 1.2,
  },
  morph: {
    cameraPosition: [0.02, 0.25, 0.2],
    cameraTarget: [0.015, 0.045, -0.105],
    verticalFovDegrees: 24,
    modelRotationY: -0.025,
    ambientIntensity: 0.36,
    keyIntensity: 3.65,
    fillIntensity: 1.5,
  },
  gesture: {
    cameraPosition: [0.32, 0.25, 0.3],
    cameraTarget: [0.045, 0.035, -0.105],
    verticalFovDegrees: 27,
    modelRotationY: -0.1,
    ambientIntensity: 0.31,
    keyIntensity: 3.2,
    fillIntensity: 1.25,
  },
  fracture: {
    cameraPosition: [-0.31, 0.3, 0.36],
    cameraTarget: [-0.015, 0.03, -0.1],
    verticalFovDegrees: 28,
    modelRotationY: 0.11,
    ambientIntensity: 0.25,
    keyIntensity: 3.7,
    fillIntensity: 1.6,
  },
  craft: {
    cameraPosition: [0.39, 0.18, 0.37],
    cameraTarget: [0.08, 0.022, -0.1],
    verticalFovDegrees: 25,
    modelRotationY: -0.12,
    ambientIntensity: 0.4,
    keyIntensity: 3.3,
    fillIntensity: 1.15,
  },
  resolution: {
    cameraPosition: [0.46, 0.34, 0.48],
    cameraTarget: [0, 0.035, -0.1],
    verticalFovDegrees: 31,
    modelRotationY: 0,
    ambientIntensity: 0.34,
    keyIntensity: 3.1,
    fillIntensity: 1.25,
  },
};

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function interpolateVector(
  from: HomeRealtimeVector,
  to: HomeRealtimeVector,
  progress: number,
): HomeRealtimeVector {
  return [
    interpolate(from[0], to[0], progress),
    interpolate(from[1], to[1], progress),
    interpolate(from[2], to[2], progress),
  ];
}

/** Maps one canonical Home timeline onto route-owned camera and light poses. */
export function homeRealtimePose(progress: number): HomeRealtimePose {
  const bounded = clamp(progress);
  const scaled = bounded * (HOME_REALTIME_BEATS.length - 1);
  const fromIndex = Math.min(
    HOME_REALTIME_BEATS.length - 1,
    Math.floor(scaled),
  );
  const toIndex = Math.min(HOME_REALTIME_BEATS.length - 1, fromIndex + 1);
  const localProgress = scaled - fromIndex;
  const from = HOME_REALTIME_POSES[HOME_REALTIME_BEATS[fromIndex]];
  const to = HOME_REALTIME_POSES[HOME_REALTIME_BEATS[toIndex]];

  return {
    cameraPosition: interpolateVector(
      from.cameraPosition,
      to.cameraPosition,
      localProgress,
    ),
    cameraTarget: interpolateVector(
      from.cameraTarget,
      to.cameraTarget,
      localProgress,
    ),
    verticalFovDegrees: interpolate(
      from.verticalFovDegrees,
      to.verticalFovDegrees,
      localProgress,
    ),
    modelRotationY: interpolate(
      from.modelRotationY,
      to.modelRotationY,
      localProgress,
    ),
    ambientIntensity: interpolate(
      from.ambientIntensity,
      to.ambientIntensity,
      localProgress,
    ),
    keyIntensity: interpolate(
      from.keyIntensity,
      to.keyIntensity,
      localProgress,
    ),
    fillIntensity: interpolate(
      from.fillIntensity,
      to.fillIntensity,
      localProgress,
    ),
  };
}

/**
 * Converts authored/virtual section geometry to one reversible scene position.
 * The scene is active only from the opening through the end of resolution.
 */
export function homeRealtimeTimeline({
  anchor,
  beats,
}: {
  anchor: number;
  beats: readonly HomeRealtimeBeatGeometry[];
}): HomeRealtimeTimeline {
  if (beats.length === 0) {
    return { active: false, beat: "opening", progress: 0 };
  }

  const first = beats[0];
  const last = beats.at(-1) ?? first;
  const active = anchor >= first.start && anchor <= last.end;
  let index = beats.findLastIndex((beat) => anchor >= beat.start);
  if (index < 0) index = 0;
  index = Math.min(index, beats.length - 1);
  const current = beats[index];
  const next = beats[index + 1];
  const segmentEnd = next?.start ?? current.end;
  const duration = Math.max(1, segmentEnd - current.start);
  const localProgress = clamp((anchor - current.start) / duration);
  const progress = clamp(
    (index + localProgress) / Math.max(1, beats.length - 1),
  );

  return { active, beat: current.beat, progress };
}

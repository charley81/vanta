export const HOME_WIDE_VIEWPORT_QUERY = "(min-width: 64rem)";
export const HOME_TALL_VIEWPORT_QUERY = "(min-height: 38rem)";
export const HOME_REDUCED_MOTION_QUERY =
  "(prefers-reduced-motion: reduce)";

export type HomeChoreographyFallback =
  | "viewport"
  | "reduced-motion"
  | "sticky";

export type HomeChoreographyQualification =
  | { eligible: true; fallback: null }
  | { eligible: false; fallback: HomeChoreographyFallback };

export function qualifyHomeChoreography({
  reducedMotion,
  sticky,
  tallViewport,
  wideViewport,
}: {
  reducedMotion: boolean;
  sticky: boolean;
  tallViewport: boolean;
  wideViewport: boolean;
}): HomeChoreographyQualification {
  if (!wideViewport || !tallViewport) {
    return { eligible: false, fallback: "viewport" };
  }
  if (reducedMotion) {
    return { eligible: false, fallback: "reduced-motion" };
  }
  if (!sticky) return { eligible: false, fallback: "sticky" };
  return { eligible: true, fallback: null };
}

export function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function horizontalProgress({
  passageTop,
  scrollY,
  travel,
}: {
  passageTop: number;
  scrollY: number;
  travel: number;
}): number {
  if (travel <= 0) return 0;
  return clampUnit((scrollY - passageTop) / travel);
}

export type HomeChapterPosition = {
  chapterIndex: number;
  normalizedProgress: number;
};

export function chapterPositionFromOffset({
  chapterCount,
  chapterStep,
  offset,
}: {
  chapterCount: number;
  chapterStep: number;
  offset: number;
}): HomeChapterPosition {
  if (chapterCount <= 1 || chapterStep <= 0) {
    return { chapterIndex: 0, normalizedProgress: 0 };
  }
  const maximum = chapterStep * (chapterCount - 1);
  const safeOffset = Number.isNaN(offset) ? 0 : offset;
  const boundedOffset = Math.min(maximum, Math.max(0, safeOffset));
  const rawChapter = boundedOffset / chapterStep;
  const chapterIndex = Math.min(
    chapterCount - 1,
    Math.floor(rawChapter),
  );
  return {
    chapterIndex,
    normalizedProgress:
      chapterIndex === chapterCount - 1
        ? 0
        : clampUnit(rawChapter - chapterIndex),
  };
}

export function offsetFromChapterPosition({
  chapterCount,
  chapterIndex,
  chapterStep,
  normalizedProgress,
}: HomeChapterPosition & {
  chapterCount: number;
  chapterStep: number;
}): number {
  if (chapterCount <= 1 || chapterStep <= 0) return 0;
  const safeIndex = Number.isFinite(chapterIndex) ? chapterIndex : 0;
  const boundedIndex = Math.min(
    chapterCount - 1,
    Math.max(0, Math.floor(safeIndex)),
  );
  return Math.min(
    chapterStep * (chapterCount - 1),
    chapterStep * (boundedIndex + clampUnit(normalizedProgress)),
  );
}

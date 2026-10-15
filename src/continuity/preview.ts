import { createSessionRecord, type SessionStorageLike } from "./store";
import {
  hasExactKeys,
  invalid,
  isFiniteNumber,
  isRecord,
  valid,
  type ParseResult,
} from "./value";

export const PREVIEW_STORAGE_KEY = "vanta:checkout-preview:v1";
export const PREVIEW_VERSION = 1;
export const PREVIEW_INACTIVITY_MS = 30 * 60 * 1_000;
export const PREVIEW_STAGES = ["contact", "delivery", "review"] as const;

export type PreviewStage = (typeof PREVIEW_STAGES)[number];
export type PreviewSession = {
  version: 1;
  reachedStage: PreviewStage;
  activeStage: PreviewStage;
  completed: boolean;
  lastMeaningfulActivityAt: number;
};

function isPreviewStage(value: unknown): value is PreviewStage {
  return PREVIEW_STAGES.some((stage) => stage === value);
}

function stageIndex(stage: PreviewStage): number {
  return PREVIEW_STAGES.indexOf(stage);
}

export function createDefaultPreviewSession(now = Date.now()): PreviewSession {
  return {
    version: PREVIEW_VERSION,
    reachedStage: "contact",
    activeStage: "contact",
    completed: false,
    lastMeaningfulActivityAt: now,
  };
}

export function parsePreviewSession(
  value: unknown,
  now = Date.now(),
): ParseResult<PreviewSession> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "version",
      "reachedStage",
      "activeStage",
      "completed",
      "lastMeaningfulActivityAt",
    ]) ||
    value.version !== PREVIEW_VERSION ||
    !isPreviewStage(value.reachedStage) ||
    !isPreviewStage(value.activeStage) ||
    typeof value.completed !== "boolean" ||
    !isFiniteNumber(value.lastMeaningfulActivityAt)
  ) {
    return invalid("Preview session is malformed or has an unknown version");
  }

  if (
    value.lastMeaningfulActivityAt < 0 ||
    value.lastMeaningfulActivityAt > now ||
    now - value.lastMeaningfulActivityAt > PREVIEW_INACTIVITY_MS
  ) {
    return invalid("Preview session is expired or has an invalid clock");
  }

  if (
    stageIndex(value.activeStage) > stageIndex(value.reachedStage) ||
    (value.completed && value.reachedStage !== "review")
  ) {
    return invalid("Preview session contains impossible progress");
  }

  return valid({
    version: PREVIEW_VERSION,
    reachedStage: value.reachedStage,
    activeStage: value.activeStage,
    completed: value.completed,
    lastMeaningfulActivityAt: value.lastMeaningfulActivityAt,
  });
}

export function advancePreviewSession(
  session: PreviewSession,
  stage: PreviewStage | "terminal",
  now = Date.now(),
): ParseResult<PreviewSession> {
  if (!parsePreviewSession(session, now).ok) {
    return invalid("Cannot advance an invalid Preview session");
  }

  if (stage === "terminal") {
    if (session.activeStage !== "review" || session.reachedStage !== "review") {
      return invalid("Terminal requires reached Review");
    }
    return valid({
      ...session,
      completed: true,
      lastMeaningfulActivityAt: now,
    });
  }

  const activeIndex = stageIndex(session.activeStage);
  const nextIndex = stageIndex(stage);
  const reachedIndex = stageIndex(session.reachedStage);
  const revisitingReachedStage = nextIndex <= reachedIndex;
  const advancingFrontier =
    activeIndex === reachedIndex && nextIndex === reachedIndex + 1;
  if (!revisitingReachedStage && !advancingFrontier) {
    return invalid("Preview stages cannot be skipped");
  }

  return valid({
    ...session,
    activeStage: stage,
    reachedStage: PREVIEW_STAGES[Math.max(reachedIndex, nextIndex)],
    completed: false,
    lastMeaningfulActivityAt: now,
  });
}

export type PreviewSessionRecord = {
  clear(): void;
  read(): PreviewSession | null;
  write(value: PreviewSession): boolean;
};

export function createPreviewSessionRecord(
  storage: SessionStorageLike,
  now: () => number = Date.now,
): PreviewSessionRecord {
  const record = createSessionRecord<PreviewSession | null>({
    storage,
    key: PREVIEW_STORAGE_KEY,
    parse: (value) =>
      value === null ? valid(null) : parsePreviewSession(value, now()),
    createDefault: () => null,
  });
  return {
    clear: record.clear,
    read: record.read,
    write: (value) => record.write(value),
  };
}

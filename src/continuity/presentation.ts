import { createSessionRecord, type SessionRecord, type SessionStorageLike } from "./store";
import {
  hasExactKeys,
  invalid,
  isRecord,
  valid,
  type ParseResult,
} from "./value";

export const PRESENTATION_STORAGE_KEY = "vanta:presentation:v1";
export const PRESENTATION_VERSION = 1;

export type PresentationTier = "core" | "motion" | "realtime";
export type PresentationFallbackReason =
  | "reduced-motion"
  | "data-saving"
  | "capability"
  | "runtime-failure"
  | "performance";

export type PresentationSession = {
  version: 1;
  eligibility: {
    motion: boolean;
    realtime: boolean;
  };
  selectedTier: PresentationTier;
  fallbackReason: PresentationFallbackReason | null;
};

const tiers: readonly PresentationTier[] = ["core", "motion", "realtime"];
const fallbackReasons: readonly PresentationFallbackReason[] = [
  "reduced-motion",
  "data-saving",
  "capability",
  "runtime-failure",
  "performance",
];

export function createDefaultPresentationSession(): PresentationSession {
  return {
    version: PRESENTATION_VERSION,
    eligibility: { motion: false, realtime: false },
    selectedTier: "core",
    fallbackReason: null,
  };
}

export function parsePresentationSession(
  value: unknown,
): ParseResult<PresentationSession> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "version",
      "eligibility",
      "selectedTier",
      "fallbackReason",
    ]) ||
    value.version !== PRESENTATION_VERSION ||
    !isRecord(value.eligibility) ||
    !hasExactKeys(value.eligibility, ["motion", "realtime"]) ||
    typeof value.eligibility.motion !== "boolean" ||
    typeof value.eligibility.realtime !== "boolean" ||
    !tiers.includes(value.selectedTier as PresentationTier) ||
    !(
      value.fallbackReason === null ||
      fallbackReasons.includes(value.fallbackReason as PresentationFallbackReason)
    )
  ) {
    return invalid("Presentation session is malformed or has an unknown version");
  }

  if (
    (value.selectedTier === "motion" && !value.eligibility.motion) ||
    (value.selectedTier === "realtime" && !value.eligibility.realtime) ||
    (value.eligibility.realtime && !value.eligibility.motion)
  ) {
    return invalid("Presentation session contradicts its eligibility");
  }

  return valid({
    version: PRESENTATION_VERSION,
    eligibility: {
      motion: value.eligibility.motion,
      realtime: value.eligibility.realtime,
    },
    selectedTier: value.selectedTier as PresentationTier,
    fallbackReason: value.fallbackReason as PresentationFallbackReason | null,
  });
}

export function createPresentationSessionRecord(
  storage: SessionStorageLike,
): SessionRecord<PresentationSession> {
  return createSessionRecord({
    storage,
    key: PRESENTATION_STORAGE_KEY,
    parse: parsePresentationSession,
    createDefault: createDefaultPresentationSession,
  });
}

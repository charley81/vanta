import { createSessionRecord, type SessionRecord, type SessionStorageLike } from "./store";
import {
  hasExactKeys,
  invalid,
  isRecord,
  valid,
  type ParseResult,
} from "./value";

export const PRESENTATION_STORAGE_KEY = "vanta:presentation:v2";
export const PRESENTATION_VERSION = 2;

export type PresentationTier = "core" | "motion" | "realtime";
export type PresentationInput = "coarse" | "fine" | "keyboard" | "mixed";
export type PresentationFallbackReason =
  | "reduced-motion"
  | "data-saving"
  | "network"
  | "capability"
  | "resource-budget"
  | "startup-timeout"
  | "runtime-failure"
  | "performance";

export type PresentationSession = {
  version: 2;
  eligibility: {
    motion: boolean;
    realtime: boolean;
  };
  adaptation: {
    dataSaving: boolean;
    input: PresentationInput;
  };
  selectedTier: PresentationTier;
  fallbackReason: PresentationFallbackReason | null;
  realtimeDeclined: boolean;
};

const tiers: readonly PresentationTier[] = ["core", "motion", "realtime"];
const inputs: readonly PresentationInput[] = ["coarse", "fine", "keyboard", "mixed"];
const fallbackReasons: readonly PresentationFallbackReason[] = [
  "reduced-motion",
  "data-saving",
  "network",
  "capability",
  "resource-budget",
  "startup-timeout",
  "runtime-failure",
  "performance",
];
const stickyFallbackReasons: readonly PresentationFallbackReason[] = [
  "resource-budget",
  "startup-timeout",
  "runtime-failure",
  "performance",
];

export function isStickyPresentationFallback(
  reason: PresentationFallbackReason | null,
): boolean {
  return reason !== null && stickyFallbackReasons.includes(reason);
}

export function createDefaultPresentationSession(): PresentationSession {
  return {
    version: PRESENTATION_VERSION,
    eligibility: { motion: false, realtime: false },
    adaptation: { dataSaving: false, input: "keyboard" },
    selectedTier: "core",
    fallbackReason: null,
    realtimeDeclined: false,
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
      "adaptation",
      "selectedTier",
      "fallbackReason",
      "realtimeDeclined",
    ]) ||
    value.version !== PRESENTATION_VERSION ||
    !isRecord(value.eligibility) ||
    !hasExactKeys(value.eligibility, ["motion", "realtime"]) ||
    typeof value.eligibility.motion !== "boolean" ||
    typeof value.eligibility.realtime !== "boolean" ||
    !isRecord(value.adaptation) ||
    !hasExactKeys(value.adaptation, ["dataSaving", "input"]) ||
    typeof value.adaptation.dataSaving !== "boolean" ||
    !inputs.includes(value.adaptation.input as PresentationInput) ||
    !tiers.includes(value.selectedTier as PresentationTier) ||
    !(
      value.fallbackReason === null ||
      fallbackReasons.includes(value.fallbackReason as PresentationFallbackReason)
    ) ||
    typeof value.realtimeDeclined !== "boolean"
  ) {
    return invalid("Presentation session is malformed or has an unknown version");
  }

  const expectedTier: PresentationTier = value.eligibility.realtime
    ? "realtime"
    : value.eligibility.motion
      ? "motion"
      : "core";
  const stickyFallback = isStickyPresentationFallback(
    value.fallbackReason as PresentationFallbackReason | null,
  );
  if (
    value.selectedTier !== expectedTier ||
    (value.realtimeDeclined && value.eligibility.realtime) ||
    value.realtimeDeclined !== stickyFallback
  ) {
    return invalid("Presentation session contradicts its eligibility");
  }

  return valid({
    version: PRESENTATION_VERSION,
    eligibility: {
      motion: value.eligibility.motion,
      realtime: value.eligibility.realtime,
    },
    adaptation: {
      dataSaving: value.adaptation.dataSaving,
      input: value.adaptation.input as PresentationInput,
    },
    selectedTier: value.selectedTier as PresentationTier,
    fallbackReason: value.fallbackReason as PresentationFallbackReason | null,
    realtimeDeclined: value.realtimeDeclined,
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

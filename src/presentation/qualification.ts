import {
  PRESENTATION_VERSION,
  isStickyPresentationFallback,
  type PresentationFallbackReason,
  type PresentationInput,
  type PresentationSession,
  type PresentationTier,
} from "@/src/continuity/presentation";

export type RealtimePurpose = "decorative" | "direct-manipulation";

export type PresentationSignals = {
  reducedMotion: boolean;
  saveData: boolean;
  effectiveConnectionType: string | null;
  logicalProcessors: number | null;
  webgl2: boolean;
  finePointer: boolean;
  coarsePointer: boolean;
  realtimePurpose: RealtimePurpose;
};

const CONSTRAINED_CONNECTIONS = new Set(["slow-2g", "2g", "3g"]);

function inputPresentation(signals: PresentationSignals): PresentationInput {
  if (signals.finePointer && signals.coarsePointer) return "mixed";
  if (signals.finePointer) return "fine";
  if (signals.coarsePointer) return "coarse";
  return "keyboard";
}

function realtimeFallbackReason(
  signals: PresentationSignals,
): PresentationFallbackReason | null {
  if (
    signals.reducedMotion &&
    signals.realtimePurpose === "decorative"
  ) {
    return "reduced-motion";
  }
  if (signals.saveData) return "data-saving";
  if (
    signals.effectiveConnectionType !== null &&
    CONSTRAINED_CONNECTIONS.has(signals.effectiveConnectionType.toLowerCase())
  ) {
    return "network";
  }
  if (!signals.webgl2) return "capability";
  if (
    signals.logicalProcessors !== null &&
    signals.logicalProcessors < 4
  ) {
    return "capability";
  }
  return null;
}

function selectedTier(motion: boolean, realtime: boolean): PresentationTier {
  if (realtime) return "realtime";
  if (motion) return "motion";
  return "core";
}

/**
 * Selects media, input, and data-saving behavior from explicit browser signals.
 * Hardware/network APIs that are absent are represented as null and remain neutral.
 */
export function qualifyPresentation(
  signals: PresentationSignals,
  previous?: PresentationSession,
): PresentationSession {
  const motion = !signals.reducedMotion && !signals.saveData;
  const liveFallback = realtimeFallbackReason(signals);
  const stickyFallback =
    previous?.realtimeDeclined &&
    isStickyPresentationFallback(previous.fallbackReason)
      ? previous.fallbackReason
      : null;
  const fallbackReason = stickyFallback ?? liveFallback;
  const realtime = fallbackReason === null;

  return {
    version: PRESENTATION_VERSION,
    eligibility: { motion, realtime },
    adaptation: {
      dataSaving: signals.saveData,
      input: inputPresentation(signals),
    },
    selectedTier: selectedTier(motion, realtime),
    fallbackReason,
    realtimeDeclined: stickyFallback !== null,
  };
}

/**
 * Requalifies an explicit Save-Data override without bypassing network,
 * processor, WebGL, reduced-motion, or sticky runtime constraints.
 */
export function qualifyDataSavingOptIn(
  signals: PresentationSignals,
  previous?: PresentationSession,
): PresentationSession {
  const actual = qualifyPresentation(signals, previous);
  if (!signals.saveData || actual.realtimeDeclined) return actual;

  const withoutDataSaving = qualifyPresentation(
    { ...signals, saveData: false },
    previous,
  );
  if (!withoutDataSaving.eligibility.realtime) {
    return {
      ...actual,
      fallbackReason: withoutDataSaving.fallbackReason,
    };
  }
  return {
    ...actual,
    eligibility: { motion: false, realtime: true },
    selectedTier: "realtime",
    fallbackReason: null,
  };
}

/** Persists a one-way Realtime decline while preserving independent adaptations. */
export function downgradePresentation(
  session: PresentationSession,
  reason: Extract<
    PresentationFallbackReason,
    "resource-budget" | "startup-timeout" | "runtime-failure" | "performance"
  >,
): PresentationSession {
  return {
    ...session,
    eligibility: { ...session.eligibility, realtime: false },
    selectedTier: session.eligibility.motion ? "motion" : "core",
    fallbackReason: reason,
    realtimeDeclined: true,
  };
}

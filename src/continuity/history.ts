import type { PreviewStage } from "./preview";
import {
  hasExactKeys,
  invalid,
  isBoundedIdentifier,
  isFiniteNumber,
  isRecord,
  valid,
  type ParseResult,
} from "./value";

export const RETURN_CONTEXT_HISTORY_KEY = "__vantaReturnContext";
export const RETURN_CONTEXT_VERSION = 1;
export const CANONICAL_ROUTES = [
  "/",
  "/monolith",
  "/synth",
  "/checkout-preview",
] as const;

export type CanonicalRoute = (typeof CANONICAL_ROUTES)[number];
export type HistoryVisibleState =
  | { kind: "route" }
  | { kind: "bag" }
  | { kind: "preview"; stage: PreviewStage | "terminal" };

export type ReturnContext = {
  version: 1;
  originRoute: CanonicalRoute;
  semanticSection: string;
  normalizedProgress: number;
  focusTarget: string | null;
  bagInvoker: string | null;
  scroll: { x: number; y: number };
  visibleState: HistoryVisibleState;
};

export type HistoryLike = {
  readonly state: unknown;
  pushState(data: unknown, unused: string, url?: string | URL | null): void;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
};

function isCanonicalRoute(value: unknown): value is CanonicalRoute {
  return CANONICAL_ROUTES.some((route) => route === value);
}

function parseVisibleState(value: unknown): ParseResult<HistoryVisibleState> {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return invalid("Visible history state is malformed");
  }
  if (
    (value.kind === "route" || value.kind === "bag") &&
    hasExactKeys(value, ["kind"])
  ) {
    return valid({ kind: value.kind });
  }
  if (
    value.kind === "preview" &&
    hasExactKeys(value, ["kind", "stage"]) &&
    ["contact", "delivery", "review", "terminal"].includes(
      String(value.stage),
    )
  ) {
    return valid({
      kind: "preview",
      stage: value.stage as PreviewStage | "terminal",
    });
  }
  return invalid("Visible history state is unknown");
}

export function parseReturnContext(value: unknown): ParseResult<ReturnContext> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "version",
      "originRoute",
      "semanticSection",
      "normalizedProgress",
      "focusTarget",
      "bagInvoker",
      "scroll",
      "visibleState",
    ]) ||
    value.version !== RETURN_CONTEXT_VERSION ||
    !isCanonicalRoute(value.originRoute) ||
    !isBoundedIdentifier(value.semanticSection) ||
    !isFiniteNumber(value.normalizedProgress) ||
    value.normalizedProgress < 0 ||
    value.normalizedProgress > 1 ||
    !(value.focusTarget === null || isBoundedIdentifier(value.focusTarget)) ||
    !(value.bagInvoker === null || isBoundedIdentifier(value.bagInvoker)) ||
    !isRecord(value.scroll) ||
    !hasExactKeys(value.scroll, ["x", "y"]) ||
    !isFiniteNumber(value.scroll.x) ||
    !isFiniteNumber(value.scroll.y) ||
    value.scroll.x < 0 ||
    value.scroll.y < 0
  ) {
    return invalid("Return context is malformed or has an unknown version");
  }

  const visibleState = parseVisibleState(value.visibleState);
  if (!visibleState.ok) return visibleState;
  if (
    visibleState.value.kind === "preview" &&
    value.originRoute === "/checkout-preview"
  ) {
    return invalid("Preview Return context cannot originate in Preview");
  }

  return valid({
    version: RETURN_CONTEXT_VERSION,
    originRoute: value.originRoute,
    semanticSection: value.semanticSection,
    normalizedProgress: value.normalizedProgress,
    focusTarget: value.focusTarget,
    bagInvoker: value.bagInvoker,
    scroll: { x: value.scroll.x, y: value.scroll.y },
    visibleState: visibleState.value,
  });
}

function historyStateWith(
  state: unknown,
  context: ReturnContext | undefined,
): Record<string, unknown> {
  const next = isRecord(state) ? { ...state } : {};
  if (context) next[RETURN_CONTEXT_HISTORY_KEY] = context;
  else delete next[RETURN_CONTEXT_HISTORY_KEY];
  return next;
}

export function readReturnContext(history: HistoryLike): ReturnContext | null {
  if (!isRecord(history.state)) return null;
  const result = parseReturnContext(history.state[RETURN_CONTEXT_HISTORY_KEY]);
  if (result.ok) return result.value;
  if (RETURN_CONTEXT_HISTORY_KEY in history.state) clearReturnContext(history);
  return null;
}

export function pushReturnContext(
  history: HistoryLike,
  context: ReturnContext,
  url?: string,
): boolean {
  const result = parseReturnContext(context);
  if (!result.ok) return false;
  try {
    history.pushState(historyStateWith(history.state, result.value), "", url);
    return true;
  } catch {
    return false;
  }
}

export function replaceReturnContext(
  history: HistoryLike,
  context: ReturnContext,
  url?: string,
): boolean {
  const result = parseReturnContext(context);
  if (!result.ok) return false;
  try {
    history.replaceState(historyStateWith(history.state, result.value), "", url);
    return true;
  } catch {
    return false;
  }
}

export function clearReturnContext(history: HistoryLike, url?: string): void {
  try {
    history.replaceState(historyStateWith(history.state, undefined), "", url);
  } catch {
    // A blocked History boundary is equivalent to unavailable Return context.
  }
}

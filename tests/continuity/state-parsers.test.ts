import { describe, expect, it } from "vitest";

import {
  DEFAULT_MORPH_SESSION,
  PREVIEW_HISTORY_KEY,
  PREVIEW_INACTIVITY_MS,
  PREVIEW_STORAGE_KEY,
  PRESENTATION_STORAGE_KEY,
  RETURN_CONTEXT_HISTORY_KEY,
  advancePreviewSession,
  createDefaultPreviewSession,
  createMorphSessionStore,
  createPresentationSessionRecord,
  createPreviewSessionRecord,
  parseMorphSession,
  parsePresentationSession,
  parsePreviewHistoryEntry,
  parsePreviewSession,
  parseReturnContext,
  readReturnContext,
  replaceReturnContext,
  type HistoryLike,
  type ReturnContext,
} from "@/src/continuity";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => void values.delete(key),
    setItem: (key: string, value: string) => void values.set(key, value),
    values,
  };
}

const returnContext: ReturnContext = {
  version: 1,
  originRoute: "/monolith",
  semanticSection: "morph",
  normalizedProgress: 0.4,
  focusTarget: "morph-heading",
  bagInvoker: "product-add",
  scroll: { x: 0, y: 640 },
  visibleState: { kind: "bag" },
};

describe("bounded continuity parsers", () => {
  it("keeps MORPH state in one in-memory concern and rejects impossible values", () => {
    const store = createMorphSessionStore();
    store.select("drive");
    expect(store.setValue("drive", 87)).toBe(true);
    expect(store.getSnapshot()).toMatchObject({
      selectedControl: "drive",
      values: { drive: 87 },
    });

    expect(store.setValue("drive", 101)).toBe(false);
    expect(parseMorphSession({ ...DEFAULT_MORPH_SESSION, extra: true }).ok).toBe(false);
    expect(createMorphSessionStore().getSnapshot()).toEqual(DEFAULT_MORPH_SESSION);
  });

  it("rejects unknown, contradictory Presentation versions", () => {
    expect(
      parsePresentationSession({
        version: 3,
        eligibility: { motion: true, realtime: true },
        adaptation: { dataSaving: false, input: "fine" },
        selectedTier: "realtime",
        fallbackReason: null,
        realtimeDeclined: false,
      }).ok,
    ).toBe(false);
    expect(
      parsePresentationSession({
        version: 2,
        eligibility: { motion: false, realtime: false },
        adaptation: { dataSaving: false, input: "fine" },
        selectedTier: "realtime",
        fallbackReason: null,
        realtimeDeclined: false,
      }).ok,
    ).toBe(false);
    expect(
      parsePresentationSession({
        version: 2,
        eligibility: { motion: true, realtime: true },
        adaptation: { dataSaving: false, input: "fine" },
        selectedTier: "core",
        fallbackReason: null,
        realtimeDeclined: false,
      }).ok,
    ).toBe(false);
    expect(
      parsePresentationSession({
        version: 2,
        eligibility: { motion: true, realtime: false },
        adaptation: { dataSaving: false, input: "fine" },
        selectedTier: "motion",
        fallbackReason: "performance",
        realtimeDeclined: false,
      }).ok,
    ).toBe(false);
  });

  it("clears only a malformed sessionStorage concern", () => {
    const storage = createStorage({
      [PREVIEW_STORAGE_KEY]: "{not-json",
      [PRESENTATION_STORAGE_KEY]: JSON.stringify({
        version: 2,
        eligibility: { motion: true, realtime: false },
        adaptation: { dataSaving: false, input: "fine" },
        selectedTier: "motion",
        fallbackReason: "capability",
        realtimeDeclined: false,
      }),
      unrelated: "retained",
    });

    const preview = createPreviewSessionRecord(storage, () => 10_000).read();
    const presentation = createPresentationSessionRecord(storage).read();

    expect(preview).toBeNull();
    expect(presentation.selectedTier).toBe("motion");
    expect(storage.values.has(PREVIEW_STORAGE_KEY)).toBe(false);
    expect(storage.values.get("unrelated")).toBe("retained");
  });

  it("rejects expired, future-clock, impossible, and unknown Preview state", () => {
    const now = 2_000_000;
    const valid = createDefaultPreviewSession(now);
    expect(parsePreviewSession(valid, now).ok).toBe(true);
    expect(
      parsePreviewSession(
        { ...valid, lastMeaningfulActivityAt: now - PREVIEW_INACTIVITY_MS - 1 },
        now,
      ).ok,
    ).toBe(false);
    expect(
      parsePreviewSession({ ...valid, lastMeaningfulActivityAt: now + 1 }, now).ok,
    ).toBe(false);
    expect(
      parsePreviewSession(
        { ...valid, activeStage: "review", reachedStage: "contact" },
        now,
      ).ok,
    ).toBe(false);
    expect(parsePreviewSession({ ...valid, version: 99 }, now).ok).toBe(false);
  });

  it("allows legal Preview advancement and reached-stage revisits without skipping", () => {
    const now = 10_000;
    const contact = createDefaultPreviewSession(now);
    const delivery = advancePreviewSession(contact, "delivery", now + 1);
    expect(delivery.ok).toBe(true);
    if (!delivery.ok) return;
    const review = advancePreviewSession(delivery.value, "review", now + 2);
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    const revisitContact = advancePreviewSession(review.value, "contact", now + 3);
    expect(revisitContact.ok).toBe(true);
    if (!revisitContact.ok) return;
    expect(advancePreviewSession(revisitContact.value, "review", now + 4).ok).toBe(true);
    expect(advancePreviewSession(contact, "review", now + 1).ok).toBe(false);
    expect(advancePreviewSession(contact, "terminal", now + 1).ok).toBe(false);
  });

  it("validates same-URL Preview history against legally reached progress", () => {
    const contact = createDefaultPreviewSession(10_000);
    const delivery = advancePreviewSession(contact, "delivery", 10_001);
    expect(delivery.ok).toBe(true);
    if (!delivery.ok) return;

    expect(
      parsePreviewHistoryEntry(
        { version: 1, stage: "contact", depth: 0 },
        delivery.value,
      ),
    ).toMatchObject({ ok: true });
    expect(
      parsePreviewHistoryEntry(
        { version: 1, stage: "delivery", depth: 1 },
        delivery.value,
      ),
    ).toMatchObject({ ok: true });
    expect(
      parsePreviewHistoryEntry(
        { version: 1, stage: "review", depth: 2 },
        delivery.value,
      ).ok,
    ).toBe(false);
    expect(
      parsePreviewHistoryEntry(
        { version: 1, stage: "terminal", depth: 3 },
        delivery.value,
      ).ok,
    ).toBe(false);
    expect(
      parsePreviewHistoryEntry(
        { version: 99, stage: "contact", depth: 0 },
        delivery.value,
      ).ok,
    ).toBe(false);
    expect(PREVIEW_HISTORY_KEY).toBe("__vantaCheckoutPreview");
  });

  it("keeps completed reachability while revisiting a reached stage", () => {
    const delivery = advancePreviewSession(
      createDefaultPreviewSession(10_000),
      "delivery",
      10_001,
    );
    expect(delivery.ok).toBe(true);
    if (!delivery.ok) return;
    const review = advancePreviewSession(delivery.value, "review", 10_002);
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    const terminal = advancePreviewSession(review.value, "terminal", 10_003);
    expect(terminal.ok).toBe(true);
    if (!terminal.ok) return;
    const revisited = advancePreviewSession(terminal.value, "contact", 10_004);
    expect(revisited).toMatchObject({
      ok: true,
      value: {
        activeStage: "contact",
        reachedStage: "review",
        completed: true,
      },
    });
  });

  it("validates and namespaces Return context without replacing router state", () => {
    let state: unknown = { nextInternal: { tree: "retained" } };
    const history: HistoryLike = {
      get state() {
        return state;
      },
      pushState(data) {
        state = data;
      },
      replaceState(data) {
        state = data;
      },
    };

    expect(replaceReturnContext(history, returnContext)).toBe(true);
    expect(state).toMatchObject({
      nextInternal: { tree: "retained" },
      [RETURN_CONTEXT_HISTORY_KEY]: returnContext,
    });
    expect(readReturnContext(history)).toEqual(returnContext);
    expect(parseReturnContext({ ...returnContext, normalizedProgress: 2 }).ok).toBe(false);

    state = {
      nextInternal: { tree: "retained" },
      [RETURN_CONTEXT_HISTORY_KEY]: { version: 99 },
    };
    expect(readReturnContext(history)).toBeNull();
    expect(state).toEqual({ nextInternal: { tree: "retained" } });
  });
});

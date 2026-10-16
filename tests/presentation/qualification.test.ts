import { describe, expect, it } from "vitest";

import {
  downgradePresentation,
  qualifyDataSavingOptIn,
  qualifyPresentation,
  type PresentationSignals,
} from "@/src/presentation/qualification";

const capableSignals: PresentationSignals = {
  coarsePointer: false,
  effectiveConnectionType: "4g",
  finePointer: true,
  logicalProcessors: 8,
  realtimePurpose: "decorative",
  reducedMotion: false,
  saveData: false,
  webgl2: true,
};

describe("Presentation qualification", () => {
  it.each([
    {
      name: "fully capable",
      patch: {},
      expected: ["realtime", null, true, true, false, "fine"],
    },
    {
      name: "Save-Data",
      patch: { saveData: true },
      expected: ["core", "data-saving", false, false, true, "fine"],
    },
    {
      name: "reported 3G",
      patch: { effectiveConnectionType: "3g" },
      expected: ["motion", "network", true, false, false, "fine"],
    },
    {
      name: "fewer than four processors",
      patch: { logicalProcessors: 3 },
      expected: ["motion", "capability", true, false, false, "fine"],
    },
    {
      name: "WebGL2 failure",
      patch: { webgl2: false },
      expected: ["motion", "capability", true, false, false, "fine"],
    },
    {
      name: "missing optional hardware and network APIs",
      patch: { effectiveConnectionType: null, logicalProcessors: null },
      expected: ["realtime", null, true, true, false, "fine"],
    },
    {
      name: "mixed pointer capabilities",
      patch: { coarsePointer: true },
      expected: ["realtime", null, true, true, false, "mixed"],
    },
  ])("selects independently for $name", ({ patch, expected }) => {
    const session = qualifyPresentation({ ...capableSignals, ...patch });

    expect([
      session.selectedTier,
      session.fallbackReason,
      session.eligibility.motion,
      session.eligibility.realtime,
      session.adaptation.dataSaving,
      session.adaptation.input,
    ]).toEqual(expected);
  });

  it("allows explicit Save-Data opt-in without bypassing other Realtime gates", () => {
    const optedIn = qualifyDataSavingOptIn({
      ...capableSignals,
      realtimePurpose: "direct-manipulation",
      saveData: true,
    });
    const incapable = qualifyDataSavingOptIn({
      ...capableSignals,
      realtimePurpose: "direct-manipulation",
      saveData: true,
      webgl2: false,
    });

    expect(optedIn).toMatchObject({
      adaptation: { dataSaving: true },
      eligibility: { motion: false, realtime: true },
      fallbackReason: null,
      selectedTier: "realtime",
    });
    expect(incapable).toMatchObject({
      adaptation: { dataSaving: true },
      eligibility: { motion: false, realtime: false },
      fallbackReason: "capability",
      selectedTier: "core",
    });
  });

  it("keeps reduced-motion separate from directly manipulated realtime", () => {
    const decorative = qualifyPresentation({
      ...capableSignals,
      reducedMotion: true,
    });
    const directManipulation = qualifyPresentation({
      ...capableSignals,
      realtimePurpose: "direct-manipulation",
      reducedMotion: true,
    });

    expect(decorative).toMatchObject({
      eligibility: { motion: false, realtime: false },
      fallbackReason: "reduced-motion",
      selectedTier: "core",
    });
    expect(directManipulation).toMatchObject({
      eligibility: { motion: false, realtime: true },
      fallbackReason: null,
      selectedTier: "realtime",
    });
  });

  it("persists a runtime downgrade without blocking live non-runtime adaptation", () => {
    const selected = qualifyPresentation(capableSignals);
    const downgraded = downgradePresentation(selected, "performance");
    const changedInput = qualifyPresentation(
      { ...capableSignals, coarsePointer: true, finePointer: false },
      downgraded,
    );

    expect(changedInput).toMatchObject({
      adaptation: { dataSaving: false, input: "coarse" },
      eligibility: { motion: true, realtime: false },
      fallbackReason: "performance",
      realtimeDeclined: true,
      selectedTier: "motion",
    });
  });
});

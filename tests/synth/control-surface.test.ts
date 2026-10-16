import { describe, expect, it } from "vitest";

import { createMorphSessionStore, DEFAULT_MORPH_SESSION } from "@/src/continuity";
import {
  MORPH_CONTROLS,
  SYNTH_CONTROL_DEFINITIONS,
  createMorphControlSurfaceAdapter,
} from "@/src/synth/controls";
import { unavailableAudioTransport } from "@/src/synth/transport";

describe("MORPH control surface contract", () => {
  it("defines exactly the six approved normalized controls and canonical defaults", () => {
    expect(SYNTH_CONTROL_DEFINITIONS.map(({ id }) => id)).toEqual(MORPH_CONTROLS);
    expect(
      Object.fromEntries(
        SYNTH_CONTROL_DEFINITIONS.map(({ id, defaultValue }) => [id, defaultValue]),
      ),
    ).toEqual(DEFAULT_MORPH_SESSION.values);
    for (const control of SYNTH_CONTROL_DEFINITIONS) {
      expect(control.defaultValue).toBeGreaterThanOrEqual(0);
      expect(control.defaultValue).toBeLessThanOrEqual(100);
      expect(control.endpoints).toHaveLength(2);
      expect(control.purpose.length).toBeGreaterThan(0);
    }
  });

  it("routes physical and semantic input through the same MORPH session", () => {
    const store = createMorphSessionStore();
    const adapter = createMorphControlSurfaceAdapter(store);

    adapter.select("drive", "physical");
    expect(adapter.setNormalizedValue("drive", 71, "physical")).toBe(true);
    expect(store.getSnapshot()).toMatchObject({
      selectedControl: "drive",
      values: { drive: 71 },
    });

    adapter.select("attack", "semantic");
    expect(adapter.setNormalizedValue("attack", 39, "semantic")).toBe(true);
    expect(store.getSnapshot()).toMatchObject({
      selectedControl: "attack",
      values: { drive: 71, attack: 39 },
    });

    expect(adapter.setNormalizedValue("attack", 39.5, "semantic")).toBe(false);
    expect(adapter.setNormalizedValue("attack", -1, "physical")).toBe(false);
    expect(store.getSnapshot().values.attack).toBe(39);
  });

  it("keeps the pre-audio transport explicitly unavailable", async () => {
    await expect(
      unavailableAudioTransport.enableFromTrustedGesture(),
    ).resolves.toEqual({ ok: false, reason: "audio-engine-unavailable" });
  });
});

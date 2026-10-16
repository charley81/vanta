import { describe, expect, it, vi } from "vitest";

import {
  controlForHierarchyNode,
  createDirectManipulationGesture,
  normalizedControlRotation,
  type NamedHierarchyNode,
} from "@/src/synth/direct-manipulation";

describe("Synth direct manipulation", () => {
  it("maps only descendants of the six supported named controls", () => {
    const supported: NamedHierarchyNode = {
      name: "CUTOFF_ROTATOR",
      parent: null,
    };
    expect(
      controlForHierarchyNode({ name: "CUTOFF_CAP", parent: supported }),
    ).toBe("cutoff");
    expect(
      controlForHierarchyNode({
        name: "OSC_CAP",
        parent: { name: "OSC_ROTATOR", parent: null },
      }),
    ).toBeNull();
    expect(controlForHierarchyNode(null)).toBeNull();
  });

  it("selects on tap without suppressing ordinary pointer movement", () => {
    const select = vi.fn();
    const value = vi.fn();
    const gesture = createDirectManipulationGesture({
      getValue: () => 50,
      onSelect: select,
      onValue: value,
    });

    expect(gesture.begin(1, "morph", { x: 10, y: 10 })).toBe(true);
    expect(gesture.move(1, { x: 13, y: 12 })).toBe(false);
    expect(gesture.end(1)).toBe("tap");
    expect(select).toHaveBeenCalledWith("morph");
    expect(value).not.toHaveBeenCalled();
  });

  it("activates only after a valid drag and clamps integer normalized values", () => {
    const select = vi.fn();
    const value = vi.fn();
    const gesture = createDirectManipulationGesture({
      dragThresholdPx: 6,
      getValue: () => 98,
      onSelect: select,
      onValue: value,
      valuePerPixel: 1,
    });

    gesture.begin(7, "drive", { x: 20, y: 20 });
    expect(gesture.move(7, { x: 24, y: 20 })).toBe(false);
    expect(gesture.isDragging(7)).toBe(false);
    expect(gesture.move(7, { x: 27, y: 20 })).toBe(true);
    expect(gesture.isDragging(7)).toBe(true);
    expect(select).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenLastCalledWith("drive", 100);

    expect(gesture.move(7, { x: -200, y: 20 })).toBe(true);
    expect(value).toHaveBeenLastCalledWith("drive", 0);
    expect(gesture.end(7)).toBe("drag");
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("ignores other pointers and cancellation without selecting", () => {
    const select = vi.fn();
    const gesture = createDirectManipulationGesture({
      getValue: () => 40,
      onSelect: select,
      onValue: vi.fn(),
    });

    gesture.begin(3, "attack", { x: 0, y: 0 });
    expect(gesture.move(4, { x: 20, y: 0 })).toBe(false);
    gesture.cancel(3);
    expect(gesture.end(3)).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });

  it("maps the normalized endpoints to a bounded 270-degree rotation", () => {
    expect(normalizedControlRotation(-1)).toBeCloseTo(-Math.PI * 0.75);
    expect(normalizedControlRotation(50)).toBe(0);
    expect(normalizedControlRotation(101)).toBeCloseTo(Math.PI * 0.75);
  });
});

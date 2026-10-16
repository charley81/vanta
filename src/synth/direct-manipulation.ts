import type { MorphControl } from "./controls";

export const SYNTH_CONTROL_NODE_NAMES = {
  MORPH_ROTATING_ENCODER: "morph",
  CUTOFF_ROTATOR: "cutoff",
  RESONANCE_ROTATOR: "resonance",
  DRIVE_ROTATOR: "drive",
  ATTACK_ROTATOR: "attack",
  RELEASE_ROTATOR: "release",
} as const satisfies Readonly<Record<string, MorphControl>>;

export type NamedHierarchyNode = {
  readonly name: string;
  readonly parent: NamedHierarchyNode | null;
};

export function controlForHierarchyNode(
  node: NamedHierarchyNode | null,
): MorphControl | null {
  let current = node;
  while (current) {
    if (current.name in SYNTH_CONTROL_NODE_NAMES) {
      return SYNTH_CONTROL_NODE_NAMES[
        current.name as keyof typeof SYNTH_CONTROL_NODE_NAMES
      ];
    }
    current = current.parent;
  }
  return null;
}

export function normalizedControlRotation(value: number): number {
  const bounded = Math.max(0, Math.min(100, value));
  return ((bounded / 100) - 0.5) * Math.PI * 1.5;
}

export type DirectManipulationGesture = {
  begin(
    pointerId: number,
    control: MorphControl,
    point: { x: number; y: number },
  ): boolean;
  move(pointerId: number, point: { x: number; y: number }): boolean;
  end(pointerId: number): "drag" | "tap" | null;
  cancel(pointerId: number): void;
  isDragging(pointerId: number): boolean;
};

export function createDirectManipulationGesture({
  dragThresholdPx = 6,
  getValue,
  onSelect,
  onValue,
  valuePerPixel = 0.65,
}: {
  dragThresholdPx?: number;
  getValue(control: MorphControl): number;
  onSelect(control: MorphControl): void;
  onValue(control: MorphControl, value: number): void;
  valuePerPixel?: number;
}): DirectManipulationGesture {
  let active:
    | {
        pointerId: number;
        control: MorphControl;
        origin: { x: number; y: number };
        initialValue: number;
        dragging: boolean;
      }
    | undefined;

  return {
    begin(pointerId, control, point) {
      if (active) return false;
      active = {
        pointerId,
        control,
        origin: point,
        initialValue: getValue(control),
        dragging: false,
      };
      return true;
    },
    move(pointerId, point) {
      if (!active || active.pointerId !== pointerId) return false;
      const deltaX = point.x - active.origin.x;
      const deltaY = point.y - active.origin.y;
      if (!active.dragging) {
        if (Math.hypot(deltaX, deltaY) < dragThresholdPx) return false;
        active.dragging = true;
        onSelect(active.control);
      }
      const value = Math.round(
        Math.max(
          0,
          Math.min(
            100,
            active.initialValue + (deltaX - deltaY) * valuePerPixel,
          ),
        ),
      );
      onValue(active.control, value);
      return true;
    },
    end(pointerId) {
      if (!active || active.pointerId !== pointerId) return null;
      const result = active.dragging ? "drag" : "tap";
      if (!active.dragging) onSelect(active.control);
      active = undefined;
      return result;
    },
    cancel(pointerId) {
      if (active?.pointerId === pointerId) active = undefined;
    },
    isDragging(pointerId) {
      return active?.pointerId === pointerId && active.dragging;
    },
  };
}

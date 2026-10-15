export type BagMode = "disabled" | "first-party-bag";

export function resolveBagMode(value: string | undefined): BagMode {
  const mode = value?.trim() || "disabled";
  if (mode === "disabled" || mode === "first-party-bag") return mode;
  throw new Error(`Unsupported BAG_MODE: ${mode}`);
}

import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.resetModules();
});

describe("Bag startup configuration", () => {
  it("fails startup for an unknown public Bag mode", async () => {
    process.env.BAG_MODE = "unknown-mode";
    vi.resetModules();

    await expect(import("@/next.config")).rejects.toThrow(
      "Unsupported BAG_MODE: unknown-mode",
    );
  });
});

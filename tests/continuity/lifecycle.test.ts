import { describe, expect, it, vi } from "vitest";

import { createLifecycleController } from "@/src/continuity";

describe("idempotent lifecycle controller", () => {
  it("coalesces repeated hide/freeze and BFCache restore cycles", async () => {
    const suspend = vi.fn();
    const revalidate = vi.fn();
    const resumeEnhancements = vi.fn();
    const controller = createLifecycleController({
      suspend,
      revalidate,
      resumeEnhancements,
      fallback: vi.fn(),
      dispose: vi.fn(),
    });

    await Promise.all([
      controller.handle("hidden"),
      controller.handle("freeze"),
      controller.handle("pagehide"),
    ]);
    expect(controller.getState()).toBe("suspended");
    expect(suspend).toHaveBeenCalledOnce();

    await Promise.all([
      controller.handle("pageshow"),
      controller.handle("pageshow"),
    ]);
    expect(controller.getState()).toBe("active");
    expect(revalidate).toHaveBeenCalledOnce();
    expect(resumeEnhancements).toHaveBeenCalledOnce();

    await controller.handle("pagehide");
    await controller.handle("pageshow");
    expect(suspend).toHaveBeenCalledTimes(2);
    expect(revalidate).toHaveBeenCalledTimes(2);
  });

  it("contains restoration failure in a degraded subsystem", async () => {
    const fallback = vi.fn();
    const controller = createLifecycleController({
      suspend: vi.fn(),
      revalidate: vi.fn(async () => {
        throw new Error("renderer ownership lost");
      }),
      resumeEnhancements: vi.fn(),
      fallback,
      dispose: vi.fn(),
    });

    await controller.suspend();
    await expect(controller.restore()).resolves.toBeUndefined();
    expect(controller.getState()).toBe("degraded");
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("disposes once even when teardown races an active operation", async () => {
    let finishSuspend: () => void = () => undefined;
    const suspend = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSuspend = resolve;
        }),
    );
    const dispose = vi.fn();
    const controller = createLifecycleController({
      suspend,
      revalidate: vi.fn(),
      resumeEnhancements: vi.fn(),
      fallback: vi.fn(),
      dispose,
    });

    const suspension = controller.suspend();
    await Promise.resolve();
    const firstDispose = controller.dispose();
    const secondDispose = controller.dispose();
    finishSuspend();
    await Promise.all([suspension, firstDispose, secondDispose]);

    expect(controller.getState()).toBe("disposed");
    expect(dispose).toHaveBeenCalledOnce();
  });
});

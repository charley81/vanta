import { describe, expect, it, vi } from "vitest";

import { createBagClient, type BagSnapshot } from "@/src/bag/client";
import { createBagCoordinator } from "@/src/bag/coordinator";

const empty: BagSnapshot = {
  schemaVersion: 1,
  item: null,
  subtotal: null,
  expiresAt: null,
};

const populated: BagSnapshot = {
  schemaVersion: 1,
  item: {
    brand: "VANTA",
    name: "MONOLITH",
    category: "Desktop Synthesizer",
    finish: "Graphite",
    price: {
      amountMinor: 249_900,
      currency: "USD",
      display: "$2,499 USD",
    },
  },
  subtotal: {
    amountMinor: 249_900,
    currency: "USD",
    display: "$2,499 USD",
  },
  expiresAt: "2026-11-14T12:00:00.000Z",
};

function response(snapshot: BagSnapshot): Response {
  return Response.json(snapshot);
}

describe("Bag coordinator", () => {
  it("opens Add to Bag only after the server confirms MONOLITH", async () => {
    let confirm!: (value: Response) => void;
    const request = vi.fn<typeof fetch>(
      () => new Promise<Response>((resolve) => (confirm = resolve)),
    );
    const coordinator = createBagCoordinator(createBagClient({ request }));

    const adding = coordinator.add();
    expect(coordinator.getSnapshot()).toMatchObject({
      confirmed: null,
      open: false,
      pending: "add",
    });
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());

    confirm(response(populated));
    await expect(adding).resolves.toBe(true);
    expect(coordinator.getSnapshot()).toMatchObject({
      confirmed: populated,
      open: true,
      pending: null,
      error: null,
    });
  });

  it("keeps a late Add confirmation without reopening after navigation", async () => {
    let confirm!: (value: Response) => void;
    const request = vi.fn<typeof fetch>(
      () => new Promise<Response>((resolve) => (confirm = resolve)),
    );
    const coordinator = createBagCoordinator(createBagClient({ request }));

    const adding = coordinator.add();
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    coordinator.cancelPendingOpen();
    confirm(response(populated));

    await expect(adding).resolves.toBe(true);
    expect(coordinator.getSnapshot()).toMatchObject({
      confirmed: populated,
      open: false,
    });
  });

  it("preserves the last confirmed state after failure and retries explicitly", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(populated))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(response(empty));
    const coordinator = createBagCoordinator(createBagClient({ request }));

    await coordinator.add();
    await expect(coordinator.remove()).resolves.toBe(false);
    expect(coordinator.getSnapshot()).toMatchObject({
      confirmed: populated,
      open: true,
      pending: null,
      error: {
        operation: "remove",
        message: "The Bag request could not connect.",
      },
    });

    await expect(coordinator.retry()).resolves.toBe(true);
    expect(coordinator.getSnapshot()).toMatchObject({
      confirmed: empty,
      error: null,
    });
  });

  it("treats cross-tab messages as invalidation and refetches on interaction", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(populated))
      .mockResolvedValueOnce(response(empty));
    const coordinator = createBagCoordinator(createBagClient({ request }));

    await coordinator.open();
    coordinator.invalidate();
    expect(coordinator.getSnapshot()).toMatchObject({
      confirmed: populated,
      stale: true,
    });
    expect(request).toHaveBeenCalledTimes(1);

    await expect(coordinator.refreshIfStale()).resolves.toBe(true);
    expect(coordinator.getSnapshot()).toMatchObject({
      confirmed: empty,
      stale: false,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });
});

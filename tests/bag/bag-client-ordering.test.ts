import { describe, expect, it, vi } from "vitest";

import { createBagClient, type BagSnapshot } from "@/src/bag/client";

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

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

function response(snapshot: BagSnapshot): Response {
  return Response.json(snapshot, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

describe("Bag browser request ordering", () => {
  it("finishes an older read before dispatching a newer mutation", async () => {
    const readResult = deferredResponse();
    const addResult = deferredResponse();
    const request = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(readResult.promise)
      .mockReturnValueOnce(addResult.promise);
    const client = createBagClient({ request });

    const reading = client.read();
    const adding = client.add();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);

    readResult.resolve(response(empty));
    await expect(reading).resolves.toEqual(empty);
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    addResult.resolve(response(populated));

    await expect(adding).resolves.toEqual(populated);
    expect(client.getConfirmed()).toEqual(populated);
  });

  it("retries only reads and preserves confirmed state after a mutation failure", async () => {
    const readRequest = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(response(populated))
      .mockRejectedValueOnce(new TypeError("offline"));
    const client = createBagClient({ request: readRequest });

    await expect(client.read()).resolves.toEqual(populated);
    await expect(client.remove()).rejects.toMatchObject({ code: "network" });
    expect(readRequest).toHaveBeenCalledTimes(3);
    expect(client.getConfirmed()).toEqual(populated);
  });

  it("aborts a stalled operation with a targeted error before five seconds", async () => {
    vi.useFakeTimers();
    try {
      const request = vi.fn<typeof fetch>((_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
      );
      const client = createBagClient({ request });
      const adding = client.add();
      const result = expect(adding).rejects.toMatchObject({ code: "timeout" });
      await Promise.resolve();

      await vi.advanceTimersByTimeAsync(4_499);
      expect(request).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(1);
      await result;
      expect(client.getConfirmed()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("serializes mutations so response cookies and confirmed state follow intent order", async () => {
    const addResult = deferredResponse();
    const removeResult = deferredResponse();
    const request = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(addResult.promise)
      .mockReturnValueOnce(removeResult.promise);
    const client = createBagClient({ request });

    const adding = client.add();
    const removing = client.remove();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    addResult.resolve(response(populated));
    await adding;
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    removeResult.resolve(response(empty));

    await expect(removing).resolves.toEqual(empty);
    expect(client.getConfirmed()).toEqual(empty);
    expect(request.mock.calls.map(([input]) => input)).toEqual([
      "/api/bag/add",
      "/api/bag/remove",
    ]);
  });
});

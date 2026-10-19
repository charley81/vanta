import { describe, expect, it, vi } from "vitest";

import {
  MAXIMUM_INVALIDATION_BODY_BYTES,
  parseEditorialInvalidationPayload,
  readBoundedRequestBody,
  resolveEditorialInvalidationConfiguration,
  verifyPublicEditorialFreshness,
} from "@/src/editorial/invalidation.server";

describe("signed Editorial invalidation contract", () => {
  it("accepts only a fixed singleton and revision payload", () => {
    expect(
      parseEditorialInvalidationPayload(
        JSON.stringify({ documentId: "homePage", revision: "rev-42" }),
      ),
    ).toEqual({ documentId: "homePage", revision: "rev-42" });

    for (const body of [
      "not json",
      JSON.stringify({ documentId: "arbitrary", revision: "rev-42" }),
      JSON.stringify({ documentId: "homePage", revision: "rev/42" }),
      JSON.stringify({ documentId: "homePage" }),
      JSON.stringify({
        documentId: "homePage",
        revision: "rev-42",
        tag: "sanity:*",
      }),
      JSON.stringify({ documentId: "__proto__", revision: "rev-42" }),
      "x".repeat(MAXIMUM_INVALIDATION_BODY_BYTES + 1),
    ]) {
      expect(parseEditorialInvalidationPayload(body)).toBeNull();
    }
  });

  it("stops reading an unstated oversized streaming body", async () => {
    const request = new Request("https://vanta.example/api/editorial/invalidate", {
      body: "x".repeat(MAXIMUM_INVALIDATION_BODY_BYTES + 1),
      method: "POST",
    });
    await expect(readBoundedRequestBody(request)).resolves.toBeNull();
  });

  it("fails closed on weak secrets or non-exact public origins", () => {
    expect(() =>
      resolveEditorialInvalidationConfiguration({
        NODE_ENV: "production",
        PUBLIC_SITE_ORIGIN: "https://vanta.example",
        SANITY_WEBHOOK_SECRET: "short",
      }),
    ).toThrow("SANITY_WEBHOOK_SECRET");
    expect(() =>
      resolveEditorialInvalidationConfiguration({
        NODE_ENV: "production",
        PUBLIC_SITE_ORIGIN: "https://vanta.example/path",
        SANITY_WEBHOOK_SECRET: "x".repeat(32),
      }),
    ).toThrow("PUBLIC_SITE_ORIGIN");
    expect(
      resolveEditorialInvalidationConfiguration({
        NODE_ENV: "production",
        PUBLIC_SITE_ORIGIN: "https://vanta.example",
        SANITY_WEBHOOK_SECRET: "x".repeat(32),
      }),
    ).toEqual({
      publicOrigin: "https://vanta.example",
      secret: "x".repeat(32),
    });
  });

  it("retries public verification and succeeds only on an exact fresh response", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ fresh: false }), { status: 409 }),
      )
      .mockRejectedValueOnce(new Error("transient network failure"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ fresh: true }), { status: 200 }),
      );
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      verifyPublicEditorialFreshness(
        {
          publicOrigin: "https://vanta.example",
          secret: "x".repeat(32),
        },
        { documentId: "productPage", revision: "rev-42" },
        { fetch: fetchMock, sleep },
      ),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      "https://vanta.example/api/editorial/freshness?document=productPage&revision=rev-42",
    );
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("reports operational failure after bounded retries without changing payload scope", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ fresh: false }), { status: 409 }),
      );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const payload = { documentId: "siteSettings" as const, revision: "rev-7" };

    await expect(
      verifyPublicEditorialFreshness(
        {
          publicOrigin: "https://vanta.example",
          secret: "x".repeat(32),
        },
        payload,
        { fetch: fetchMock, sleep },
      ),
    ).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(sleep.mock.calls).toEqual([[250], [500], [1_000], [1_500]]);

    // Replaying the same signed event repeats the same read-only verification
    // contract; it cannot select another tag or mutation.
    await expect(
      verifyPublicEditorialFreshness(
        {
          publicOrigin: "https://vanta.example",
          secret: "x".repeat(32),
        },
        payload,
        { fetch: fetchMock, sleep },
      ),
    ).resolves.toBe(false);
  });
});

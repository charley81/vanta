import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeRateLimit,
  requestRateLimitKey,
  resetRateLimitsForTesting,
} from "@/src/security/rate-limit.server";

beforeEach(() => resetRateLimitsForTesting());

describe("Editorial endpoint rate limits", () => {
  it("bounds each client and resets after the fixed window", () => {
    expect(consumeRateLimit("preview", "client-a", 2, 60_000, 1_000)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(consumeRateLimit("preview", "client-a", 2, 60_000, 2_000)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(consumeRateLimit("preview", "client-a", 2, 60_000, 3_000)).toEqual({
      allowed: false,
      retryAfterSeconds: 58,
    });
    expect(consumeRateLimit("preview", "client-b", 2, 60_000, 3_000).allowed).toBe(true);
    expect(consumeRateLimit("preview", "client-a", 2, 60_000, 61_001).allowed).toBe(true);
  });

  it("uses Netlify's connection address without logging or returning it", () => {
    const previous = process.env.NETLIFY;
    process.env.NETLIFY = "true";
    expect(
      requestRateLimitKey(
        new Request("https://vanta.example/api/editorial/preview", {
          headers: { "x-nf-client-connection-ip": "203.0.113.4" },
        }),
      ),
    ).toBe("203.0.113.4");
    if (previous === undefined) delete process.env.NETLIFY;
    else process.env.NETLIFY = previous;
  });
});

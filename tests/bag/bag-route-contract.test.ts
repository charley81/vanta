import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EDITORIAL_PREVIEW_COOKIE,
  signEditorialPreviewSession,
} from "@/src/editorial/preview-policy";
import { resetRateLimitsForTesting } from "@/src/security/rate-limit.server";

const originalEnvironment = { ...process.env };
const origin = "https://vanta.example";

function request(
  path: string,
  options: { cookie?: string; method?: "GET" | "POST" } = {},
): Request {
  const method = options.method ?? "GET";
  const headers = new Headers();
  if (options.cookie) headers.set("cookie", options.cookie);
  if (method === "POST") {
    headers.set("content-type", "application/json");
    headers.set("origin", origin);
  }
  return new Request(`${origin}${path}`, {
    body: method === "POST" ? "{}" : undefined,
    headers,
    method,
  });
}

function signedCookie(payload: unknown, encodedKey: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac(
    "sha256",
    Buffer.from(encodedKey, "base64url"),
  )
    .update(encodedPayload)
    .digest("base64url");
  return `__Host-vanta_bag=${encodedPayload}.${signature}`;
}

function cookieFrom(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Expected a Set-Cookie header");
  return setCookie.split(";", 1)[0];
}

beforeEach(() => {
  resetRateLimitsForTesting();
  process.env = {
    ...originalEnvironment,
    BAG_MODE: "first-party-bag",
    BAG_SIGNING_KEYS: Buffer.alloc(32, 7).toString("base64url"),
    NODE_ENV: "test",
  };
});

afterEach(() => {
  vi.useRealTimers();
  process.env = { ...originalEnvironment };
});

describe("Bag Route Handler contract", () => {
  it("reads, adds canonical MONOLITH, and removes it through the complete browser contract", async () => {
    const { GET } = await import("@/app/api/bag/route");
    const { POST: add } = await import("@/app/api/bag/add/route");
    const { POST: remove } = await import("@/app/api/bag/remove/route");

    const empty = await GET(request("/api/bag"));
    expect(await empty.json()).toEqual({
      schemaVersion: 1,
      item: null,
      subtotal: null,
      expiresAt: null,
    });

    const added = await add(request("/api/bag/add", { method: "POST" }));
    expect(added.status).toBe(200);
    const addedBody = await added.json();
    expect(addedBody).toEqual({
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
      expiresAt: expect.any(String),
    });

    const cookie = cookieFrom(added);
    const populated = await GET(request("/api/bag", { cookie }));
    expect(await populated.json()).toEqual(addedBody);

    const removed = await remove(
      request("/api/bag/remove", { cookie, method: "POST" }),
    );
    expect(await removed.json()).toEqual({
      schemaVersion: 1,
      item: null,
      subtotal: null,
      expiresAt: null,
    });
  });

  it("disables safely when signing material is missing or malformed", async () => {
    const { GET } = await import("@/app/api/bag/route");
    for (const signingKeys of [undefined, "short", "not base64!"]) {
      if (signingKeys === undefined) delete process.env.BAG_SIGNING_KEYS;
      else process.env.BAG_SIGNING_KEYS = signingKeys;

      const response = await GET(request("/api/bag"));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: {
          code: "bag_disabled",
          message: "Bag is temporarily unavailable.",
        },
      });
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
  });

  it("requires HTTPS when running in production", async () => {
    process.env = { ...process.env, NODE_ENV: "production" };
    const { GET } = await import("@/app/api/bag/route");

    const response = await GET(new Request("http://vanta.example/api/bag"));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "https_required" },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects caller-selected commerce fields in query strings", async () => {
    const { GET } = await import("@/app/api/bag/route");
    const { POST: add } = await import("@/app/api/bag/add/route");

    const read = await GET(
      request("/api/bag?identity=other&price=1&quantity=99"),
    );
    const mutation = await add(
      request("/api/bag/add?identity=other", { method: "POST" }),
    );

    for (const response of [read, mutation]) {
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "invalid_request" },
      });
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });

  it("rejects cross-origin, caller-selected, unsupported, and oversized mutation input", async () => {
    const { POST: add } = await import("@/app/api/bag/add/route");

    const crossOrigin = await add(
      new Request(`${origin}/api/bag/add`, {
        body: "{}",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example",
        },
        method: "POST",
      }),
    );
    expect(crossOrigin.status).toBe(403);
    expect(await crossOrigin.json()).toMatchObject({
      error: { code: "invalid_origin" },
    });

    const callerSelected = await add(
      new Request(`${origin}/api/bag/add`, {
        body: JSON.stringify({ quantity: 99, price: 1, identity: "other" }),
        headers: { "content-type": "application/json", origin },
        method: "POST",
      }),
    );
    expect(callerSelected.status).toBe(400);
    expect(await callerSelected.json()).toMatchObject({
      error: { code: "invalid_request" },
    });
    expect(callerSelected.headers.get("set-cookie")).toBeNull();

    const unsupported = await add(
      new Request(`${origin}/api/bag/add`, {
        body: "{}",
        headers: { "content-type": "text/plain", origin },
        method: "POST",
      }),
    );
    expect(unsupported.status).toBe(415);
    expect(await unsupported.json()).toMatchObject({
      error: { code: "unsupported_media_type" },
    });

    const oversized = await add(
      new Request(`${origin}/api/bag/add`, {
        body: JSON.stringify({ padding: "x".repeat(100) }),
        headers: { "content-type": "application/json", origin },
        method: "POST",
      }),
    );
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toMatchObject({
      error: { code: "payload_too_large" },
    });
  });

  it("keeps add and remove idempotent without extending an existing lifetime", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00.000Z"));
    const { POST: add } = await import("@/app/api/bag/add/route");
    const { POST: remove } = await import("@/app/api/bag/remove/route");
    const first = await add(request("/api/bag/add", { method: "POST" }));
    const firstBody = await first.json();
    const firstCookie = cookieFrom(first);

    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
    const replay = await add(
      request("/api/bag/add", { cookie: firstCookie, method: "POST" }),
    );
    expect(await replay.json()).toEqual(firstBody);
    expect(cookieFrom(replay)).toBe(firstCookie);

    const removed = await remove(
      request("/api/bag/remove", { cookie: firstCookie, method: "POST" }),
    );
    const replayedRemoval = await remove(
      request("/api/bag/remove", { method: "POST" }),
    );
    expect(await replayedRemoval.json()).toEqual(await removed.json());
    expect(replayedRemoval.headers.get("set-cookie")).toBeNull();
  });

  it("rate-limits mutation bursts with a targeted retry response", async () => {
    const { POST: add } = await import("@/app/api/bag/add/route");
    const responses = await Promise.all(
      Array.from({ length: 31 }, () =>
        add(request("/api/bag/add", { method: "POST" })),
      ),
    );

    expect(responses.slice(0, 30).every((response) => response.status === 200)).toBe(
      true,
    );
    expect(responses[30].status).toBe(429);
    expect(responses[30].headers.get("retry-after")).toBe("60");
    expect(await responses[30].json()).toMatchObject({
      error: { code: "rate_limited" },
    });
  });

  it("keeps mutations read-only during an authenticated Editorial preview", async () => {
    process.env.EDITORIAL_PREVIEW_SESSION_SECRET = "p".repeat(32);
    const session = await signEditorialPreviewSession(
      {
        version: 1,
        perspective: ["drafts"],
        studioOrigin: "https://studio.example",
        expiresAt: Date.now() + 60 * 60 * 1_000,
      },
      process.env.EDITORIAL_PREVIEW_SESSION_SECRET,
    );
    const { POST: add } = await import("@/app/api/bag/add/route");

    const response = await add(
      request("/api/bag/add", {
        cookie: `${EDITORIAL_PREVIEW_COOKIE}=${session}`,
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "bag_read_only" },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects signed cookies with unknown, extended, or impossible schemas", async () => {
    vi.useFakeTimers();
    const now = Date.parse("2026-10-15T12:00:00.000Z");
    vi.setSystemTime(now);
    const key = process.env.BAG_SIGNING_KEYS!;
    const { GET } = await import("@/app/api/bag/route");
    const invalidPayloads = [
      { v: 2, m: true, e: now + 1_000 },
      { v: 1, m: false, e: now + 1_000 },
      { v: 1, m: true, e: now + 1_000, identity: "MONOLITH" },
      { v: 1, m: true, e: now + 31 * 24 * 60 * 60 * 1_000 },
    ];

    for (const payload of invalidPayloads) {
      const response = await GET(
        request("/api/bag", { cookie: signedCookie(payload, key) }),
      );
      expect(await response.json()).toMatchObject({
        item: null,
        expiresAt: null,
      });
      expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    }
  });

  it("treats tampered and expired state as empty and clears it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00.000Z"));
    const { GET } = await import("@/app/api/bag/route");
    const { POST: add } = await import("@/app/api/bag/add/route");
    const added = await add(request("/api/bag/add", { method: "POST" }));
    const cookie = cookieFrom(added);
    const finalCharacter = cookie.at(-1);
    const tampered = `${cookie.slice(0, -1)}${finalCharacter === "A" ? "B" : "A"}`;

    const tamperedResponse = await GET(
      request("/api/bag", { cookie: tampered }),
    );
    expect(await tamperedResponse.json()).toMatchObject({
      item: null,
      expiresAt: null,
    });
    expect(tamperedResponse.headers.get("set-cookie")).toContain("Max-Age=0");

    vi.setSystemTime(new Date("2026-11-14T12:00:00.001Z"));
    const expiredResponse = await GET(request("/api/bag", { cookie }));
    expect(await expiredResponse.json()).toMatchObject({
      item: null,
      expiresAt: null,
    });
    expect(expiredResponse.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("accepts a previous signing key once and rotates the cookie to the active key", async () => {
    const oldKey = Buffer.alloc(32, 3).toString("base64url");
    const activeKey = Buffer.alloc(32, 9).toString("base64url");
    process.env.BAG_SIGNING_KEYS = oldKey;
    const { GET } = await import("@/app/api/bag/route");
    const { POST: add } = await import("@/app/api/bag/add/route");
    const added = await add(request("/api/bag/add", { method: "POST" }));
    const oldCookie = cookieFrom(added);

    process.env.BAG_SIGNING_KEYS = `${activeKey},${oldKey}`;
    const rotatedResponse = await GET(request("/api/bag", { cookie: oldCookie }));
    expect((await rotatedResponse.json()).item).toMatchObject({ name: "MONOLITH" });
    const rotatedCookie = cookieFrom(rotatedResponse);
    expect(rotatedCookie).not.toBe(oldCookie);

    process.env.BAG_SIGNING_KEYS = activeKey;
    const activeResponse = await GET(
      request("/api/bag", { cookie: rotatedCookie }),
    );
    expect((await activeResponse.json()).item).toMatchObject({ name: "MONOLITH" });
    expect(activeResponse.headers.get("set-cookie")).toBeNull();
  });

  it("stores only signed membership and a bounded expiry in a secure no-store cookie", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00.000Z"));
    const { POST: add } = await import("@/app/api/bag/add/route");

    const response = await add(request("/api/bag/add", { method: "POST" }));
    const setCookie = response.headers.get("set-cookie")!;
    const [cookie] = setCookie.split(";", 1);
    const value = cookie.slice(cookie.indexOf("=") + 1);
    const [encodedPayload, signature] = value.split(".");
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    expect(payload).toEqual({
      v: 1,
      m: true,
      e: Date.parse("2026-11-14T12:00:00.000Z"),
    });
    expect(signature).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=2592000");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).not.toContain("Domain=");
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});

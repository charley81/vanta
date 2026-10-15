import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";
import {
  EDITORIAL_PREVIEW_COOKIE,
  signEditorialPreviewSession,
} from "@/src/editorial/preview-policy";

const originalEnvironment = { ...process.env };
const secret = "proxy-preview-secret-with-at-least-32-characters";

beforeEach(() => {
  process.env = {
    ...process.env,
    EDITORIAL_PREVIEW_SESSION_SECRET: secret,
    SANITY_STUDIO_ORIGIN: "https://studio.example",
  };
});

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("Editorial preview response boundary", () => {
  it("makes an authenticated preview private and frameable only by the exact Studio", async () => {
    const value = await signEditorialPreviewSession(
      {
        version: 1,
        perspective: ["drafts"],
        studioOrigin: "https://studio.example",
        expiresAt: Date.now() + 60_000,
      },
      secret,
    );
    const request = new NextRequest("https://vanta.example/monolith", {
      headers: { cookie: `${EDITORIAL_PREVIEW_COOKIE}=${value}` },
    });

    const response = await proxy(request);

    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors https://studio.example",
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "connect-src 'self'",
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "form-action 'self'",
    );
    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("does not weaken public policy for a malformed cookie or non-preview route", async () => {
    for (const request of [
      new NextRequest("https://vanta.example/", {
        headers: { cookie: `${EDITORIAL_PREVIEW_COOKIE}=tampered` },
      }),
      new NextRequest("https://vanta.example/checkout-preview"),
    ]) {
      const response = await proxy(request);
      expect(response.headers.get("content-security-policy")).toContain(
        "frame-ancestors 'none'",
      );
      expect(response.headers.get("x-frame-options")).toBe("DENY");
    }
  });

  it("keeps every API response non-indexable", async () => {
    const response = await proxy(
      new NextRequest("https://vanta.example/api/editorial/freshness"),
    );
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});

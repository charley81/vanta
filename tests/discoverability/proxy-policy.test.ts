import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

const originalEnvironment = { ...process.env };

beforeEach(() => {
  process.env = {
    ...process.env,
    VANTA_PRODUCTION_ORIGIN: "https://vanta.example",
  };
  delete process.env.CONTEXT;
  delete process.env.NETLIFY;
});

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("discoverability response policy", () => {
  it("redirects alternate production hosts and protocol to the configured HTTPS origin", async () => {
    process.env.CONTEXT = "production";
    const response = await proxy(
      new NextRequest("http://alternate.example/monolith/?source=alternate"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://vanta.example/monolith?source=alternate",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000",
    );
  });

  it("applies the complete production security policy without cross-origin isolation", async () => {
    process.env.CONTEXT = "production";
    const response = await proxy(
      new NextRequest("https://vanta.example/monolith"),
    );

    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.get("content-security-policy")).not.toContain("*");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("permissions-policy")).toContain("payment=()");
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000",
    );
    expect(response.headers.get("cross-origin-opener-policy")).toBeNull();
    expect(response.headers.get("cross-origin-embedder-policy")).toBeNull();
    expect(response.headers.get("cross-origin-resource-policy")).toBeNull();
  });

  it("redirects trailing-slash and legacy variants without requiring a production host", async () => {
    const trailingSlash = await proxy(
      new NextRequest("http://localhost:3000/synth/"),
    );
    expect(trailingSlash.status).toBe(308);
    expect(trailingSlash.headers.get("location")).toBe(
      "http://localhost:3000/synth",
    );

    const legacy = await proxy(
      new NextRequest("http://localhost:3000/morph-lab?from=bookmark"),
    );
    expect(legacy.status).toBe(308);
    expect(legacy.headers.get("location")).toBe(
      "http://localhost:3000/synth?from=bookmark",
    );
  });

  it("sets response-level noindex on every non-canonical surface", async () => {
    for (const path of [
      "/checkout-preview",
      "/api/bag",
      "/health",
      "/not-a-route",
    ]) {
      const response = await proxy(
        new NextRequest(`http://localhost:3000${path}`),
      );
      expect(response.headers.get("x-robots-tag"), path).toBe(
        "noindex, nofollow, noarchive",
      );
    }

    const home = await proxy(new NextRequest("http://localhost:3000/"));
    expect(home.headers.get("x-robots-tag")).toBeNull();
  });

  it("keeps deploy previews reachable but non-indexable", async () => {
    process.env.CONTEXT = "deploy-preview";
    process.env.NETLIFY = "true";
    const response = await proxy(
      new NextRequest(
        "https://deploy-id--vanta-monolith.netlify.app/monolith",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive",
    );
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000",
    );
  });
});

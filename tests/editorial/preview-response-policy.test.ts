import { describe, expect, it } from "vitest";

import {
  previewContentSecurityPolicy,
  publicContentSecurityPolicy,
  RESTRICTIVE_PERMISSIONS_POLICY,
} from "@/src/security/response-policy";

describe("public and Editorial preview response policy", () => {
  it("denies public framing with an allowlisted static CSP", () => {
    const policy = publicContentSecurityPolicy();
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("connect-src 'self' blob:");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("'wasm-unsafe-eval'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("nonce-");
    expect(policy).not.toContain("*");
  });

  it("changes only framing for the exact Presentation origin and adds no browser Sanity connection", () => {
    const publicPolicy = publicContentSecurityPolicy();
    const previewPolicy = previewContentSecurityPolicy([
      "https://presentation.example",
      "https://studio.example",
    ]);

    expect(previewPolicy).toContain(
      "frame-ancestors https://presentation.example https://studio.example",
    );
    expect(previewPolicy).toContain("connect-src 'self' blob:");
    expect(previewPolicy).not.toContain("*.sanity.io");
    expect(
      previewPolicy.replace(
        "https://presentation.example https://studio.example",
        "'none'",
      ),
    ).toBe(publicPolicy);
  });

  it("rejects malformed or non-HTTPS frame ancestors at the policy boundary", () => {
    for (const origin of [
      "https://studio.example; script-src *",
      "https://studio.example/path",
      "http://studio.example",
      "https://*.sanity.studio",
    ]) {
      expect(() => previewContentSecurityPolicy([origin])).toThrow(
        /exact HTTPS origin/,
      );
    }
    expect(() =>
      previewContentSecurityPolicy(["http://localhost:3333"], true),
    ).not.toThrow();
    expect(() => previewContentSecurityPolicy([])).toThrow(
      /at least one exact frame ancestor/,
    );
  });

  it("disables sensitive and unused browser capabilities", () => {
    for (const capability of [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "browsing-topics=()",
    ]) {
      expect(RESTRICTIVE_PERMISSIONS_POLICY).toContain(capability);
    }
  });
});

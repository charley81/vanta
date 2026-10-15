import { describe, expect, it } from "vitest";

import {
  parseEditorialPreviewPerspective,
  parseEditorialPreviewTarget,
  parseExactOrigin,
  signEditorialPreviewSession,
  verifyEditorialPreviewSession,
} from "@/src/editorial/preview-policy";

const secret = "preview-session-secret-with-at-least-32-characters";
const now = Date.parse("2026-10-15T12:00:00.000Z");

describe("Editorial preview boundary", () => {
  it("allows only the three exact application-owned targets", () => {
    expect(parseEditorialPreviewTarget("/")).toBe("/");
    expect(parseEditorialPreviewTarget("/monolith")).toBe("/monolith");
    expect(parseEditorialPreviewTarget("/synth")).toBe("/synth");

    for (const target of [
      "//attacker.example/path",
      "https://attacker.example/",
      "/checkout-preview",
      "/monolith/extra",
      "/synth?secret=leak",
      "/#fragment",
      "javascript:alert(1)",
    ]) {
      expect(parseEditorialPreviewTarget(target)).toBeNull();
    }
  });

  it("accepts drafts and bounded release stacks but rejects raw or malformed perspectives", () => {
    expect(parseEditorialPreviewPerspective("drafts")).toEqual(["drafts"]);
    expect(parseEditorialPreviewPerspective("release-42,drafts")).toEqual([
      "release-42",
      "drafts",
    ]);
    expect(
      parseEditorialPreviewPerspective("release-a,release-b,drafts"),
    ).toEqual(["release-a", "release-b", "drafts"]);

    for (const perspective of [
      null,
      "published",
      "raw",
      "previewDrafts",
      "drafts,release",
      "release,drafts,drafts",
      "release.release,drafts",
      " release,drafts",
      "a,b,c,d,e,drafts",
    ]) {
      expect(parseEditorialPreviewPerspective(perspective)).toBeNull();
    }
  });

  it("requires an exact HTTPS Studio origin", () => {
    expect(parseExactOrigin("https://studio.example")).toBe(
      "https://studio.example",
    );
    expect(parseExactOrigin("http://localhost:3333", true)).toBe(
      "http://localhost:3333",
    );
    expect(parseExactOrigin("http://localhost:3333")).toBeNull();
    expect(parseExactOrigin("https://studio.example/path")).toBeNull();
    expect(parseExactOrigin("https://user@studio.example")).toBeNull();
    expect(parseExactOrigin("https://*.sanity.studio")).toBeNull();
  });

  it("signs the validated perspective and rejects tampering, expiry, and weak secrets", async () => {
    const value = await signEditorialPreviewSession(
      {
        version: 1,
        perspective: ["release-42", "drafts"],
        studioOrigin: "https://studio.example",
        expiresAt: now + 60_000,
      },
      secret,
    );
    expect(value).not.toBeNull();
    await expect(
      verifyEditorialPreviewSession(value, secret, now),
    ).resolves.toEqual({
      version: 1,
      perspective: ["release-42", "drafts"],
      studioOrigin: "https://studio.example",
      expiresAt: now + 60_000,
    });

    await expect(
      verifyEditorialPreviewSession(`${value}tampered`, secret, now),
    ).resolves.toBeNull();
    await expect(
      verifyEditorialPreviewSession(value, secret, now + 60_001),
    ).resolves.toBeNull();
    await expect(
      signEditorialPreviewSession(
        {
          version: 1,
          perspective: ["drafts"],
          studioOrigin: "https://studio.example",
          expiresAt: now + 60_000,
        },
        "short",
      ),
    ).resolves.toBeNull();
  });
});

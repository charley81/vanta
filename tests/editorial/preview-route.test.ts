import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetRateLimitsForTesting } from "@/src/security/rate-limit.server";

const enable = vi.fn();
const setCookie = vi.fn();
const validatePreviewUrl = vi.fn();
const fetchProjection = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: setCookie })),
  draftMode: vi.fn(async () => ({ enable })),
}));

vi.mock("@sanity/preview-url-secret", () => ({ validatePreviewUrl }));
vi.mock("@sanity/client", () => ({
  createClient: vi.fn(() => ({ fetch: fetchProjection })),
}));

const originalEnvironment = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimitsForTesting();
  process.env.SANITY_CONTENT_SOURCE = "published";
  process.env.SANITY_STUDIO_PROJECT_ID = "project-id";
  process.env.SANITY_STUDIO_DATASET = "production";
  process.env.SANITY_API_READ_TOKEN = "private-read-token";
  process.env.SANITY_STUDIO_ORIGIN = "https://studio.example";
  process.env.EDITORIAL_PREVIEW_SESSION_SECRET = "s".repeat(32);
});

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("Editorial preview entry Route Handler", () => {
  it.each([
    {
      name: "invalid secret",
      validation: { isValid: false },
    },
    {
      name: "external target",
      validation: {
        isValid: true,
        redirectTo: "https://attacker.example/",
        studioOrigin: "https://studio.example",
        studioPreviewPerspective: "drafts",
      },
    },
    {
      name: "raw perspective",
      validation: {
        isValid: true,
        redirectTo: "/",
        studioOrigin: "https://studio.example",
        studioPreviewPerspective: "raw",
      },
    },
    {
      name: "unsupported editing variant",
      validation: {
        isValid: true,
        redirectTo: "/",
        studioOrigin: "https://studio.example",
        studioPreviewPerspective: "drafts",
        studioPreviewVariant: "experiment-a",
      },
    },
    {
      name: "unapproved Studio origin",
      validation: {
        isValid: true,
        redirectTo: "/",
        studioOrigin: "https://attacker.example",
        studioPreviewPerspective: "drafts",
      },
    },
  ])("fails closed for $name", async ({ validation }) => {
    validatePreviewUrl.mockResolvedValue(validation);
    const { GET } = await import("@/app/api/editorial/preview/route");

    const response = await GET(
      new Request("https://vanta.example/api/editorial/preview?secret=redacted"),
    );

    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("redacted");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(enable).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
  });

  it("enables a private signed session and redirects only to an allowlisted target", async () => {
    validatePreviewUrl.mockResolvedValue({
      isValid: true,
      redirectTo: "/monolith",
      studioOrigin: "https://studio.example",
      studioPreviewPerspective: "release-42,drafts",
    });
    const { GET } = await import("@/app/api/editorial/preview/route");

    const response = await GET(
      new Request("https://vanta.example/api/editorial/preview?secret=redacted"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/monolith");
    expect(enable).toHaveBeenCalledOnce();
    expect(setCookie).toHaveBeenCalledWith(
      "vanta_editorial_preview",
      expect.not.stringContaining("release-42,drafts"),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "none",
        secure: true,
      }),
    );
  });

  it("rejects abusive preview URLs before calling Sanity", async () => {
    const { GET } = await import("@/app/api/editorial/preview/route");
    const response = await GET(
      new Request(
        `https://vanta.example/api/editorial/preview?secret=${"x".repeat(4_096)}`,
      ),
    );

    expect(response.status).toBe(414);
    expect(validatePreviewUrl).not.toHaveBeenCalled();
  });

  it("stays unavailable when any private binding is absent", async () => {
    delete process.env.SANITY_API_READ_TOKEN;
    const { GET } = await import("@/app/api/editorial/preview/route");

    const response = await GET(
      new Request("https://vanta.example/api/editorial/preview"),
    );

    expect(response.status).toBe(503);
    expect(validatePreviewUrl).not.toHaveBeenCalled();
    expect(enable).not.toHaveBeenCalled();
  });

  it("rate-limits abusive authorization attempts before further validation", async () => {
    validatePreviewUrl.mockResolvedValue({ isValid: false });
    const { GET } = await import("@/app/api/editorial/preview/route");
    const responses: Response[] = [];
    for (let attempt = 0; attempt < 21; attempt += 1) {
      responses.push(
        await GET(
          new Request(
            "https://vanta.example/api/editorial/preview?secret=redacted",
          ),
        ),
      );
    }

    expect(responses.slice(0, 20).every(({ status }) => status === 401)).toBe(
      true,
    );
    expect(responses[20].status).toBe(429);
    expect(responses[20].headers.get("retry-after")).toBe("60");
    expect(validatePreviewUrl).toHaveBeenCalledTimes(20);
  });
});

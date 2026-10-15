import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { INITIAL_EDITORIAL_PROJECTION_FIXTURES } from "@/sanity/seed/initial-content";
import { signEditorialPreviewSession } from "@/src/editorial/preview-policy";

const cookieState = { value: "" };
const readPreview = vi.fn();
const readPublished = vi.fn();
const getPublishedHome = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "vanta_editorial_preview" ? { value: cookieState.value } : undefined,
  })),
  draftMode: vi.fn(async () => ({ isEnabled: true })),
}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/src/editorial/source.server", () => ({
  readPreviewEditorialProjection: readPreview,
  readPublishedEditorialProjection: readPublished,
}));
vi.mock("@/src/editorial/public-content.server", () => ({
  getPublishedHomeRouteViewModel: getPublishedHome,
  getPublishedProductRouteViewModel: vi.fn(),
  getPublishedSiteSettings: vi.fn(),
  getPublishedSynthRouteViewModel: vi.fn(),
}));

const originalEnvironment = { ...process.env };
const sessionSecret = "preview-content-test-secret-32-characters";

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.EDITORIAL_PREVIEW_SESSION_SECRET = sessionSecret;
  process.env.SANITY_STUDIO_ORIGIN = "https://studio.example";
  cookieState.value =
    (await signEditorialPreviewSession(
      {
        version: 1,
        perspective: ["release-42", "drafts"],
        studioOrigin: "https://studio.example",
        expiresAt: Date.now() + 60_000,
      },
      sessionSecret,
    )) ?? "";
  readPublished.mockResolvedValue(INITIAL_EDITORIAL_PROJECTION_FIXTURES.homePage);
  readPreview.mockResolvedValue({
    ...INITIAL_EDITORIAL_PROJECTION_FIXTURES.homePage,
    opening: {
      ...INITIAL_EDITORIAL_PROJECTION_FIXTURES.homePage.opening,
      headline: "Private draft headline",
    },
  });
});

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("request Editorial composition", () => {
  it("reads preview content uncached while metadata stays on the published perspective", async () => {
    const {
      getHomeRouteContentForRequest,
      getPublishedHomeMetadataForRequest,
    } = await import("@/src/editorial/preview-content.server");

    const metadata = await getPublishedHomeMetadataForRequest();
    const content = await getHomeRouteContentForRequest();

    expect(metadata.opening.headline).toBe("Sound, given mass.");
    expect(content.model.opening.headline).toBe("Private draft headline");
    expect(content.preview?.perspective).toEqual(["release-42", "drafts"]);
    expect(readPublished).toHaveBeenCalledWith("homePage");
    expect(readPreview).toHaveBeenCalledWith("homePage", [
      "release-42",
      "drafts",
    ]);
    expect(getPublishedHome).not.toHaveBeenCalled();
  });
});

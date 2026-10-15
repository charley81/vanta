import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublishedEditorialRevision = vi.fn();

vi.mock("@/src/editorial/public-content.server", () => ({
  getPublishedEditorialRevision,
}));

describe("public Editorial freshness endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPublishedEditorialRevision.mockResolvedValue("rev-42");
  });

  it("reports only exact published cache revision equality", async () => {
    const { GET } = await import("@/app/api/editorial/freshness/route");
    const fresh = await GET(
      new Request(
        "https://vanta.example/api/editorial/freshness?document=homePage&revision=rev-42",
      ),
    );
    const stale = await GET(
      new Request(
        "https://vanta.example/api/editorial/freshness?document=homePage&revision=rev-41",
      ),
    );

    expect(fresh.status).toBe(200);
    await expect(fresh.json()).resolves.toEqual({ fresh: true });
    expect(stale.status).toBe(409);
    await expect(stale.json()).resolves.toEqual({ fresh: false });
  });

  it("rejects unknown documents, duplicate parameters, and query injection", async () => {
    const { GET } = await import("@/app/api/editorial/freshness/route");
    for (const query of [
      "document=unknown&revision=rev-42",
      "document=homePage&document=synthPage&revision=rev-42",
      "document=homePage&revision=rev-42&url=https://attacker.example",
      "document=homePage&revision=../../secret",
    ]) {
      const response = await GET(
        new Request(`https://vanta.example/api/editorial/freshness?${query}`),
      );
      expect(response.status).toBe(400);
    }
    expect(getPublishedEditorialRevision).not.toHaveBeenCalled();
  });

  it("reports source failure without exposing upstream details", async () => {
    getPublishedEditorialRevision.mockRejectedValue(
      new Error("private upstream details"),
    );
    const { GET } = await import("@/app/api/editorial/freshness/route");
    const response = await GET(
      new Request(
        "https://vanta.example/api/editorial/freshness?document=synthPage&revision=rev-42",
      ),
    );

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private upstream details");
  });
});

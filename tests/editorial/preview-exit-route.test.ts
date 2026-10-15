import { beforeEach, describe, expect, it, vi } from "vitest";

const disable = vi.fn();
const deleteCookie = vi.fn();
const getEditorialPreviewSession = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ delete: deleteCookie })),
  draftMode: vi.fn(async () => ({ disable })),
}));
vi.mock("@/src/editorial/preview-content.server", () => ({
  getEditorialPreviewSession,
}));

describe("Editorial preview exit Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEditorialPreviewSession.mockResolvedValue({ perspective: ["drafts"] });
  });

  it("rejects cross-origin POST attempts", async () => {
    const { POST } = await import("@/app/api/editorial/preview/exit/route");
    const response = await POST(
      new Request("https://vanta.example/api/editorial/preview/exit", {
        headers: { origin: "https://attacker.example" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(disable).not.toHaveBeenCalled();
    expect(deleteCookie).not.toHaveBeenCalled();
  });

  it.each([
    { origin: "https://vanta.example", site: undefined },
    { origin: "null", site: "same-origin" },
  ])("clears both private cookies through an accepted same-origin POST", async ({ origin, site }) => {
    const { POST } = await import("@/app/api/editorial/preview/exit/route");
    const response = await POST(
      new Request("https://vanta.example/api/editorial/preview/exit", {
        headers: {
          origin,
          ...(site ? { "sec-fetch-site": site } : {}),
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/");
    expect(disable).toHaveBeenCalledOnce();
    expect(deleteCookie).toHaveBeenCalledWith("vanta_editorial_preview");
  });

  it("exports no safe-method exit handler", async () => {
    const route = await import("@/app/api/editorial/preview/exit/route");
    expect("GET" in route).toBe(false);
  });
});

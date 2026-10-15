import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { isValidSignature, revalidateTag, verifyFreshness } = vi.hoisted(() => ({
  isValidSignature: vi.fn(),
  revalidateTag: vi.fn(),
  verifyFreshness: vi.fn(),
}));

vi.mock("@sanity/webhook", () => ({
  isValidSignature,
  SIGNATURE_HEADER_NAME: "sanity-webhook-signature",
}));
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/src/editorial/invalidation.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/editorial/invalidation.server")>()),
  verifyPublicEditorialFreshness: verifyFreshness,
}));

const originalEnvironment = { ...process.env };

function request(body: string, signature = "signature"): Request {
  return new Request("https://vanta.example/api/editorial/invalidate", {
    body,
    headers: {
      "content-type": "application/json",
      "sanity-webhook-signature": signature,
    },
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = {
    ...process.env,
    NODE_ENV: "production",
    PUBLIC_SITE_ORIGIN: "https://vanta.example",
    SANITY_WEBHOOK_SECRET: "w".repeat(32),
  };
  isValidSignature.mockResolvedValue(true);
  verifyFreshness.mockResolvedValue(true);
});

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("Editorial invalidation Route Handler", () => {
  it("rejects an invalid signature before parsing or invalidating", async () => {
    isValidSignature.mockResolvedValue(false);
    const { POST } = await import("@/app/api/editorial/invalidate/route");
    const response = await POST(request("not json", "invalid"));

    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(verifyFreshness).not.toHaveBeenCalled();
  });

  it("rejects signed payload injection outside the fixed schema", async () => {
    const { POST } = await import("@/app/api/editorial/invalidate/route");
    const response = await POST(
      request(
        JSON.stringify({
          documentId: "homePage",
          revision: "rev-42",
          tag: "sanity:*",
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("expires only the affected tag and verifies the public revision", async () => {
    const body = JSON.stringify({
      documentId: "productPage",
      revision: "rev-42",
    });
    const { POST } = await import("@/app/api/editorial/invalidate/route");
    const response = await POST(request(body));

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith(
      "sanity:document:productPage",
      "max",
    );
    expect(verifyFreshness).toHaveBeenCalledWith(
      expect.objectContaining({ publicOrigin: "https://vanta.example" }),
      { documentId: "productPage", revision: "rev-42" },
      { fetch: expect.any(Function) },
    );
  });

  it("is replay-safe and reports failed freshness for upstream retry", async () => {
    verifyFreshness.mockResolvedValue(false);
    const body = JSON.stringify({
      documentId: "synthPage",
      revision: "rev-7",
    });
    const { POST } = await import("@/app/api/editorial/invalidate/route");

    const first = await POST(request(body));
    const replay = await POST(request(body));

    expect(first.status).toBe(503);
    expect(first.headers.get("retry-after")).toBe("5");
    expect(replay.status).toBe(503);
    expect(revalidateTag).toHaveBeenNthCalledWith(
      1,
      "sanity:document:synthPage",
      "max",
    );
    expect(revalidateTag).toHaveBeenNthCalledWith(
      2,
      "sanity:document:synthPage",
      "max",
    );
  });
});

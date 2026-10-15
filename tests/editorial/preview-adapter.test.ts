import { describe, expect, it, vi } from "vitest";

import { EDITORIAL_PROJECTIONS } from "@/sanity/projections";
import {
  createPreviewEditorialAdapter,
  PreviewEditorialUnavailableError,
} from "@/src/editorial/preview-adapter.server";

describe("private Sanity preview adapter", () => {
  it("uses the fixed projection and exact validated draft/release perspective", async () => {
    const fetchProjection = vi.fn().mockResolvedValue({
      headline: "Unpublished headline",
    });
    const adapter = createPreviewEditorialAdapter(fetchProjection);

    await expect(
      adapter.read("homePage", ["release-42", "drafts"]),
    ).resolves.toEqual({ headline: "Unpublished headline" });
    expect(fetchProjection).toHaveBeenCalledWith(
      EDITORIAL_PROJECTIONS.homePage,
      {},
      { perspective: ["release-42", "drafts"] },
    );
  });

  it("contains upstream details behind a stable private error", async () => {
    const adapter = createPreviewEditorialAdapter(
      vi.fn().mockRejectedValue(new Error("token and upstream details")),
    );

    await expect(adapter.read("synthPage", ["drafts"])).rejects.toEqual(
      new PreviewEditorialUnavailableError("synthPage"),
    );
    await expect(adapter.read("synthPage", ["drafts"])).rejects.not.toThrow(
      "token and upstream details",
    );
  });
});

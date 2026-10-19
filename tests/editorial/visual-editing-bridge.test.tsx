// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { draftMode, visualEditing } = vi.hoisted(() => ({
  draftMode: vi.fn(),
  visualEditing: vi.fn(() => null),
}));

vi.mock("next/headers", () => ({ draftMode }));
vi.mock("@/app/ui/editorial-visual-editing.client", () => ({
  EditorialVisualEditingClient: visualEditing,
}));

import { EditorialVisualEditing } from "@/app/ui/editorial-visual-editing";

afterEach(() => {
  vi.clearAllMocks();
});

describe("Editorial visual-editing bridge", () => {
  it("mounts Sanity's Presentation bridge during Draft Mode", async () => {
    draftMode.mockResolvedValue({ isEnabled: true });

    render(await EditorialVisualEditing());

    expect(visualEditing).toHaveBeenCalledOnce();
  });

  it("does not load Presentation tooling for public requests", async () => {
    draftMode.mockResolvedValue({ isEnabled: false });

    render(await EditorialVisualEditing());

    expect(visualEditing).not.toHaveBeenCalled();
  });
});

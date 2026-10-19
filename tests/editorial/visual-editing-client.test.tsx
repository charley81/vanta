// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { disableVisualEditing, enableVisualEditing } = vi.hoisted(() => ({
  disableVisualEditing: vi.fn(),
  enableVisualEditing: vi.fn(),
}));

vi.mock("@sanity/visual-editing", () => ({ enableVisualEditing }));

import { EditorialVisualEditingClient } from "@/app/ui/editorial-visual-editing.client";

beforeEach(() => {
  vi.clearAllMocks();
  enableVisualEditing.mockReturnValue(disableVisualEditing);
});

describe("Editorial visual-editing client", () => {
  it("connects Presentation to Next navigation and disposes the bridge", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const replaceState = vi.spyOn(window.history, "replaceState");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    const view = render(<EditorialVisualEditingClient />);

    await waitFor(() => expect(enableVisualEditing).toHaveBeenCalledOnce());
    const options = enableVisualEditing.mock.calls[0][0];
    const history = options.history;
    expect(history).toBeDefined();
    if (!history) throw new Error("Visual editing history adapter was not configured");

    history.update({ type: "push", url: "/synth" });
    history.update({ type: "replace", url: "/monolith" });
    history.update({ type: "pop", url: "/" });
    expect(pushState).toHaveBeenCalledWith(null, "", "/synth");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/monolith");
    expect(back).toHaveBeenCalledOnce();

    const navigate = vi.fn();
    const unsubscribe = history.subscribe(navigate);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(navigate).toHaveBeenCalledWith({ type: "push", url: "/monolith" });
    unsubscribe();

    view.unmount();
    expect(disableVisualEditing).toHaveBeenCalledOnce();
  });
});

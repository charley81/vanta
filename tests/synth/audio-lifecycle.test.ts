/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

import { bindSynthPageLifecycle } from "@/src/synth/lifecycle.client";

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value,
  });
}

function click(anchor: HTMLAnchorElement, options: MouseEventInit = {}) {
  const event = new MouseEvent("click", {
    bubbles: true,
    button: 0,
    cancelable: true,
    ...options,
  });
  anchor.dispatchEvent(event);
}

afterEach(() => {
  document.body.replaceChildren();
  Reflect.deleteProperty(document, "visibilityState");
  window.history.replaceState(null, "", "/");
});

describe("Synth page lifecycle binding", () => {
  it("forwards hide, Bag, freeze, pagehide, and route intent without resuming", () => {
    window.history.replaceState(null, "", "/synth");
    const pause = vi.fn();
    const unbind = bindSynthPageLifecycle({ pause });

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(pause).not.toHaveBeenCalled();

    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new CustomEvent("vanta:bag-opened"));
    document.dispatchEvent(new Event("freeze"));
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));

    const destination = document.createElement("a");
    destination.href = "/monolith";
    destination.addEventListener("click", (event) => event.preventDefault());
    document.body.append(destination);
    click(destination);

    expect(pause).toHaveBeenCalledTimes(5);
    expect(pause).toHaveBeenCalledWith("interruption");

    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    expect(pause).toHaveBeenCalledTimes(5);

    unbind();
    document.dispatchEvent(new Event("freeze"));
    expect(pause).toHaveBeenCalledTimes(5);
  });

  it("ignores same-document, modified, canceled, download, and new-context clicks", () => {
    window.history.replaceState(null, "", "/synth");
    const pause = vi.fn();
    const unbind = bindSynthPageLifecycle({ pause });
    const anchor = document.createElement("a");
    anchor.addEventListener("click", (event) => event.preventDefault());
    document.body.append(anchor);

    anchor.href = "/synth#controls";
    click(anchor);
    anchor.href = "/monolith";
    click(anchor, { metaKey: true });
    anchor.download = "monolith.html";
    click(anchor);
    anchor.removeAttribute("download");
    anchor.target = "_blank";
    click(anchor);
    anchor.target = "";
    const canceled = new MouseEvent("click", {
      bubbles: true,
      button: 0,
      cancelable: true,
    });
    canceled.preventDefault();
    anchor.dispatchEvent(canceled);

    expect(pause).not.toHaveBeenCalled();
    unbind();
  });

  it("does not accumulate listeners across repeated bind and cleanup cycles", () => {
    const pause = vi.fn();
    bindSynthPageLifecycle({ pause })();
    bindSynthPageLifecycle({ pause })();
    const unbind = bindSynthPageLifecycle({ pause });

    document.dispatchEvent(new Event("freeze"));
    expect(pause).toHaveBeenCalledOnce();
    unbind();
  });
});

"use client";

import "client-only";

import { useEffect } from "react";

export function EditorialVisualEditingClient() {
  useEffect(() => {
    let cancelled = false;
    let disable: (() => void) | undefined;

    void import("@sanity/visual-editing").then(({ enableVisualEditing }) => {
      if (cancelled) return;
      disable = enableVisualEditing({
        history: {
          subscribe(navigate) {
            const handlePopState = () =>
              navigate({
                type: "push",
                url: `${location.pathname}${location.search}`,
              });
            window.addEventListener("popstate", handlePopState);
            return () => window.removeEventListener("popstate", handlePopState);
          },
          update(update) {
            switch (update.type) {
              case "push":
                window.history.pushState(null, "", update.url);
                break;
              case "pop":
                window.history.back();
                break;
              case "replace":
                window.history.replaceState(null, "", update.url);
                break;
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      disable?.();
    };
  }, []);

  return null;
}

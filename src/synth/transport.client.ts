"use client";

import "client-only";

import { createAudioTransportController } from "./transport";
import { morphSessionStore } from "./session.client";

export function createBrowserAudioTransport() {
  return createAudioTransportController({
    // Keep Web Audio implementation out of the initial Synth module graph. This
    // import runs only inside the trusted Enable Sound event call chain.
    loadEngine: () => import("@/src/audio/engine.client"),
    readValues: () => morphSessionStore.getSnapshot().values,
  });
}

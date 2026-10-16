"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  morphSessionStore,
  subscribeMorphControlInput,
} from "@/src/synth/session.client";
import { createBrowserAudioTransport } from "@/src/synth/transport.client";
import type { AudioTransportState } from "@/src/synth/transport";

import styles from "./synth.module.css";

const STATUS_COPY: Record<AudioTransportState, string> = {
  off: "Sound is off. Nothing starts until you choose Enable Sound.",
  preparing: "Preparing sound…",
  playing: "Sound is playing.",
  paused: "Sound is paused. It will resume only when you choose Resume Sound.",
  interrupted:
    "Sound was interrupted and will not resume automatically. Choose Resume Sound to continue.",
  unavailable:
    "Sound is unavailable. Every control and its normalized value remains available below. Choose Retry sound to try again.",
};

const BUTTON_COPY: Record<AudioTransportState, string> = {
  off: "Enable Sound",
  preparing: "Preparing sound…",
  playing: "Pause Sound",
  paused: "Resume Sound",
  interrupted: "Resume Sound",
  unavailable: "Retry sound",
};

export function SynthTransport({ enableLabel }: { enableLabel: string }) {
  const [transport] = useState(createBrowserAudioTransport);
  const state = useSyncExternalStore(
    transport.subscribe,
    transport.getSnapshot,
    () => "off" as const,
  );
  const [coldLatency, setColdLatency] = useState<number | null>(null);
  const [warmLatency, setWarmLatency] = useState<number | null>(null);
  const [controlLatency, setControlLatency] = useState<number | null>(null);

  useEffect(() => {
    return subscribeMorphControlInput((input) => {
      const measurement = transport.update(
        morphSessionStore.getSnapshot().values,
        input.atMs,
      );
      if (!measurement) return;
      setControlLatency(measurement.latencyMs);
      document.dispatchEvent(
        new CustomEvent("vanta:audio-control-scheduled", {
          detail: { latencyMs: measurement.latencyMs },
        }),
      );
    });
  }, [transport]);

  useEffect(() => {
    const interrupt = () => transport.pause("interruption");
    const pauseWhenHidden = () => {
      if (document.visibilityState === "hidden") interrupt();
    };
    const pauseForRouteIntent = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      const anchor =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!anchor || anchor.target || anchor.download) return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname !== window.location.pathname
      ) {
        interrupt();
      }
    };

    document.addEventListener("visibilitychange", pauseWhenHidden);
    document.addEventListener("vanta:bag-opened", interrupt);
    document.addEventListener("click", pauseForRouteIntent, true);
    document.addEventListener("freeze", interrupt);
    window.addEventListener("pagehide", interrupt);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      document.removeEventListener("vanta:bag-opened", interrupt);
      document.removeEventListener("click", pauseForRouteIntent, true);
      document.removeEventListener("freeze", interrupt);
      window.removeEventListener("pagehide", interrupt);
      transport.pause("interruption");
      void transport.dispose();
    };
  }, [transport]);

  async function handleTransport() {
    if (state === "playing") {
      transport.pause();
      return;
    }
    const result = await transport.enableFromTrustedGesture();
    if (!result.ok) return;
    if (result.warm) setWarmLatency(result.firstSoundLatencyMs);
    else setColdLatency(result.firstSoundLatencyMs);
  }

  return (
    <div aria-labelledby="transport-heading" className={styles.transport}>
      <div>
        <p className={styles.transportLabel} id="transport-heading">
          Sound transport
        </p>
        <p
          aria-atomic="true"
          aria-live="polite"
          className={styles.transportStatus}
          data-audio-cold-latency-ms={coldLatency ?? undefined}
          data-audio-control-latency-ms={controlLatency ?? undefined}
          data-audio-state={state}
          data-audio-warm-latency-ms={warmLatency ?? undefined}
          role="status"
        >
          {STATUS_COPY[state]}
        </p>
      </div>
      <button
        className={styles.transportButton}
        disabled={state === "preparing"}
        onClick={() => void handleTransport()}
        type="button"
      >
        {state === "off" ? enableLabel : BUTTON_COPY[state]}
      </button>
    </div>
  );
}

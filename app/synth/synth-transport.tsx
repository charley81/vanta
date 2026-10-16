"use client";

import { useRef, useState } from "react";

import {
  unavailableAudioTransport,
  type AudioTransportState,
} from "@/src/synth/transport";

import styles from "./synth.module.css";

const STATUS_COPY: Record<AudioTransportState, string> = {
  off: "Sound is off. Nothing starts until you choose Enable Sound.",
  preparing: "Preparing sound…",
  playing: "Sound is playing.",
  paused: "Sound is paused.",
  interrupted: "Sound was interrupted and will not resume automatically.",
  unavailable:
    "Sound is unavailable in this build. Every control and its normalized value remains available below.",
};

export function SynthTransport({ enableLabel }: { enableLabel: string }) {
  const [state, setState] = useState<AudioTransportState>("off");
  const attempt = useRef(0);

  async function enableSound() {
    const currentAttempt = ++attempt.current;
    setState("preparing");
    const result = await unavailableAudioTransport.enableFromTrustedGesture();
    if (currentAttempt !== attempt.current) return;
    setState(result.ok ? "playing" : "unavailable");
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
          data-audio-state={state}
          role="status"
        >
          {STATUS_COPY[state]}
        </p>
      </div>
      <button
        className={styles.transportButton}
        disabled={state === "preparing"}
        onClick={enableSound}
        type="button"
      >
        {state === "unavailable" ? "Retry sound" : enableLabel}
      </button>
    </div>
  );
}

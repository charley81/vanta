export type AudioTransportState =
  | "off"
  | "preparing"
  | "playing"
  | "paused"
  | "interrupted"
  | "unavailable";

export type EnableSoundResult =
  | { ok: true }
  | { ok: false; reason: "audio-engine-unavailable" };

export type AudioTransportAdapter = {
  enableFromTrustedGesture(): Promise<EnableSoundResult>;
};

/**
 * Issue #55 intentionally ships before an audio engine. Keeping that fact
 * behind the transport contract makes the trusted-gesture boundary real
 * without importing Web Audio, pretending to play, or coupling controls to
 * later audio work.
 */
export const unavailableAudioTransport: AudioTransportAdapter = {
  async enableFromTrustedGesture() {
    return { ok: false, reason: "audio-engine-unavailable" };
  },
};

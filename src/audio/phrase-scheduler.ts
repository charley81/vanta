import { AUTHORED_PHRASE, PHRASE_PULSE_SECONDS } from "./calibration";

export type ScheduledPhraseNote = {
  frequencyHz: number;
  phraseIndex: number;
  startTime: number;
};

export type PhraseScheduler = {
  isPlaying(): boolean;
  pause(): void;
  play(): ScheduledPhraseNote;
  tick(): void;
};

export type IntervalClock = {
  clear(handle: unknown): void;
  set(callback: () => void, intervalMs: number): unknown;
};

const browserIntervalClock: IntervalClock = {
  clear: (handle) => globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
  set: (callback, intervalMs) => globalThis.setInterval(callback, intervalMs),
};

/**
 * A look-ahead scheduler keeps note timing on the AudioContext clock instead of
 * trusting main-thread timer precision. play() is idempotent, preventing a
 * second interval or overlapping transport after repeated activation.
 */
export function createPhraseScheduler({
  currentTime,
  schedule,
  clock = browserIntervalClock,
  lookAheadSeconds = 0.1,
  tickIntervalMs = 25,
}: {
  currentTime(): number;
  schedule(note: ScheduledPhraseNote): void;
  clock?: IntervalClock;
  lookAheadSeconds?: number;
  tickIntervalMs?: number;
}): PhraseScheduler {
  let interval: unknown;
  let nextNoteTime = 0;
  let phraseIndex = 0;
  let playing = false;
  let firstScheduled: ScheduledPhraseNote | null = null;

  function tick() {
    if (!playing) return;
    const horizon = currentTime() + lookAheadSeconds;
    while (nextNoteTime < horizon) {
      const note = {
        frequencyHz: AUTHORED_PHRASE[phraseIndex % AUTHORED_PHRASE.length],
        phraseIndex: phraseIndex % AUTHORED_PHRASE.length,
        startTime: nextNoteTime,
      } satisfies ScheduledPhraseNote;
      firstScheduled ??= note;
      schedule(note);
      phraseIndex += 1;
      nextNoteTime += PHRASE_PULSE_SECONDS;
    }
  }

  return {
    isPlaying: () => playing,
    pause() {
      if (!playing) return;
      playing = false;
      if (interval !== undefined) clock.clear(interval);
      interval = undefined;
    },
    play() {
      if (playing && firstScheduled) return firstScheduled;
      playing = true;
      phraseIndex = 0;
      firstScheduled = null;
      nextNoteTime = currentTime() + 0.01;
      tick();
      interval = clock.set(tick, tickIntervalMs);
      // tick always schedules the first note because look-ahead is positive.
      if (!firstScheduled) throw new Error("Phrase scheduler failed to queue its first note");
      return firstScheduled;
    },
    tick,
  };
}

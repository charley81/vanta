import { describe, expect, it } from "vitest";

import {
  AUTHORED_PHRASE,
  PHRASE_PULSE_SECONDS,
} from "@/src/audio/calibration";
import {
  createPhraseScheduler,
  type IntervalClock,
  type ScheduledPhraseNote,
} from "@/src/audio/phrase-scheduler";

function virtualScheduler() {
  let time = 0;
  let callback: (() => void) | null = null;
  let intervalCount = 0;
  let clearCount = 0;
  const notes: ScheduledPhraseNote[] = [];
  const clock: IntervalClock = {
    clear() {
      clearCount += 1;
      callback = null;
    },
    set(next) {
      intervalCount += 1;
      callback = next;
      return intervalCount;
    },
  };
  const scheduler = createPhraseScheduler({
    currentTime: () => time,
    schedule: (note) => notes.push(note),
    clock,
  });
  return {
    advanceTo(nextTime: number) {
      time = nextTime;
      callback?.();
    },
    clearCount: () => clearCount,
    intervalCount: () => intervalCount,
    notes,
    scheduler,
  };
}

describe("authored phrase scheduler", () => {
  it("is idempotent and never creates overlapping transport intervals", () => {
    const harness = virtualScheduler();
    const first = harness.scheduler.play();
    const repeated = harness.scheduler.play();

    expect(repeated).toEqual(first);
    expect(harness.intervalCount()).toBe(1);
    expect(harness.notes).toHaveLength(1);
    harness.scheduler.pause();
    harness.scheduler.pause();
    expect(harness.clearCount()).toBe(1);
  });

  it("keeps the six-note phrase ordered and drift-free over ten scripted minutes", () => {
    const harness = virtualScheduler();
    harness.scheduler.play();
    for (let milliseconds = 25; milliseconds <= 600_000; milliseconds += 25) {
      harness.advanceTo(milliseconds / 1_000);
    }
    harness.scheduler.pause();

    expect(harness.notes.length).toBeGreaterThan(1_100);
    harness.notes.forEach((note, index) => {
      expect(note.frequencyHz).toBe(AUTHORED_PHRASE[index % 6]);
      expect(note.phraseIndex).toBe(index % 6);
      expect(note.startTime).toBeCloseTo(0.01 + index * PHRASE_PULSE_SECONDS, 8);
    });
    expect(harness.intervalCount()).toBe(1);
    expect(harness.clearCount()).toBe(1);
  });
});

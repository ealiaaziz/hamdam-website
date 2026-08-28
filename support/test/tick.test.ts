import { describe, it, expect } from 'vitest';
import { tickWork } from '../src/tick.js';

/** Epoch milliseconds for a given whole minute, so the maths is visible. */
const at = (minute: number) => minute * 60_000;

describe('tickWork', () => {
  it('reads the mailbox on every tick', () => {
    for (let minute = 0; minute < 20; minute += 1) {
      expect(tickWork(at(minute)).ingest).toBe(true);
    }
  });

  it('follows up on the bot every fifth minute', () => {
    const following = [];
    for (let minute = 100; minute < 120; minute += 1) {
      if (tickWork(at(minute)).followUp) following.push(minute);
    }
    expect(following).toEqual([100, 105, 110, 115]);
  });

  it('sweeps rate limits every fifteenth minute', () => {
    const sweeping = [];
    for (let minute = 300; minute < 340; minute += 1) {
      if (tickWork(at(minute)).purge) sweeping.push(minute);
    }
    expect(sweeping).toEqual([300, 315, 330]);
  });

  /**
   * The saving, stated as a number so a later change that quietly undoes it
   * fails here rather than in a dashboard three weeks later.
   */
  it('leaves four ticks in five doing mail and nothing else', () => {
    let bare = 0;
    for (let minute = 0; minute < 60; minute += 1) {
      const work = tickWork(at(minute));
      if (work.ingest && !work.followUp && !work.purge) bare += 1;
    }
    expect(bare).toBe(48);
  });

  /**
   * Skipping work to save CPU is a trade this is allowed to make. Skipping it
   * because a number arrived malformed is not: an hour of unread mail costs
   * more than a millisecond, and it costs it silently.
   */
  it('does everything when the tick carries no usable time', () => {
    for (const bad of [Number.NaN, Infinity, -Infinity]) {
      expect(tickWork(bad)).toEqual({ ingest: true, followUp: true, purge: true });
    }
  });

  it('is aligned to the wall clock rather than to when the Worker started', () => {
    // Two ticks a day apart land on the same footing, because epoch minutes
    // divide evenly and nothing here counts from a deploy.
    const aDayLater = at(100 + 60 * 24);
    expect(tickWork(aDayLater).followUp).toBe(tickWork(at(100)).followUp);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MOOD_STOPS, moodStopForIndex, verseForMoodStop, createSettleDebounce } from '../moodDemo.js';

const verses = [
  { id: 'hafez-016', persian: 'p1', english: 'e1' },
  { id: 'rumi-011', persian: 'p2', english: 'e2' },
  { id: 'parvin-008', persian: 'p3', english: 'e3' },
];

describe('MOOD_STOPS', () => {
  it('has between 3 and 5 stops', () => {
    expect(MOOD_STOPS.length).toBeGreaterThanOrEqual(3);
    expect(MOOD_STOPS.length).toBeLessThanOrEqual(5);
  });

  it('every stop maps to a distinct sky state', () => {
    const skies = new Set(MOOD_STOPS.map((s) => s.sky));
    expect(skies.size).toBe(MOOD_STOPS.length);
  });

  it('every stop references a verse id that exists in the verse bank', () => {
    for (const stop of MOOD_STOPS) {
      expect(verseForMoodStop(stop, verses)).not.toBeNull();
    }
  });
});

describe('moodStopForIndex', () => {
  it('returns the stop at the given index', () => {
    expect(moodStopForIndex(0)).toBe(MOOD_STOPS[0]);
    expect(moodStopForIndex(4)).toBe(MOOD_STOPS[4]);
  });

  it('clamps out-of-range indices', () => {
    expect(moodStopForIndex(-1)).toBe(MOOD_STOPS[0]);
    expect(moodStopForIndex(99)).toBe(MOOD_STOPS[MOOD_STOPS.length - 1]);
  });

  it('rounds fractional indices', () => {
    expect(moodStopForIndex(2.4)).toBe(MOOD_STOPS[2]);
    expect(moodStopForIndex(2.6)).toBe(MOOD_STOPS[3]);
  });
});

describe('verseForMoodStop', () => {
  it('finds the matching verse by id', () => {
    const stop = MOOD_STOPS[0];
    expect(verseForMoodStop(stop, verses).id).toBe(stop.verseId);
  });

  it('returns null when the verse bank has no match', () => {
    expect(verseForMoodStop(MOOD_STOPS[0], [])).toBeNull();
  });
});

describe('createSettleDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits 150ms by default before calling', () => {
    const cb = vi.fn();
    const debounced = createSettleDebounce(cb);
    debounced('a');
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(149);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledWith('a');
  });

  it('resets the delay on rapid scrubbing (no churn)', () => {
    const cb = vi.fn();
    const debounced = createSettleDebounce(cb);
    debounced('a');
    vi.advanceTimersByTime(100);
    debounced('b');
    vi.advanceTimersByTime(100);
    debounced('c');
    vi.advanceTimersByTime(149);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith('c');
  });

  it('calls immediately when immediate is true (reduced motion)', () => {
    const cb = vi.fn();
    const debounced = createSettleDebounce(cb);
    debounced('a', { immediate: true });
    expect(cb).toHaveBeenCalledWith('a');
  });

  it('cancel() clears a pending call', () => {
    const cb = vi.fn();
    const debounced = createSettleDebounce(cb);
    debounced('a');
    debounced.cancel();
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });
});

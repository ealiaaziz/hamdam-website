import { describe, it, expect, vi, afterEach } from 'vitest';
import { REVEAL, staggerDelayMs, prefersReducedMotion } from '../reveal.js';

describe('REVEAL', () => {
  it('is frozen with the two states', () => {
    expect(Object.isFrozen(REVEAL)).toBe(true);
    expect(REVEAL).toEqual({ HIDDEN: 'hidden', VISIBLE: 'visible' });
  });
});

describe('staggerDelayMs', () => {
  it('starts at zero and steps by the base', () => {
    expect(staggerDelayMs(0)).toBe(0);
    expect(staggerDelayMs(1)).toBe(60);
    expect(staggerDelayMs(3)).toBe(180);
  });

  it('caps at the maximum', () => {
    expect(staggerDelayMs(4)).toBe(240);
    expect(staggerDelayMs(50)).toBe(240);
  });

  it('honours custom base and max', () => {
    expect(staggerDelayMs(2, 100, 500)).toBe(200);
    expect(staggerDelayMs(9, 100, 500)).toBe(500);
  });
});

describe('prefersReducedMotion (re-export)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is false without a window', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('is true when the media query matches', () => {
    vi.stubGlobal('window', { matchMedia: vi.fn().mockReturnValue({ matches: true }) });
    expect(prefersReducedMotion()).toBe(true);
  });
});

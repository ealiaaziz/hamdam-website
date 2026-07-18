import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  HERO_PHASE,
  phaseFromProgress,
  gradientForProgress,
  lerpHex,
  sunYForProgress,
  sunGlowForProgress,
  starsOpacityForProgress,
  hazeOpacityForProgress,
  textColorForProgress,
  titleShadowOpacityForProgress,
  scrimOpacityForProgress,
  starField,
  prefersReducedMotion,
  skyProgressForScroll,
  skyColorForProgress,
  skyToneForProgress,
  SKY_TONE,
} from '../cinematic.js';

const RGB = /^rgb\(\d{1,3} \d{1,3} \d{1,3}\)$/;

describe('phaseFromProgress boundaries', () => {
  it.each([
    [0, HERO_PHASE.NIGHT],
    [0.14, HERO_PHASE.NIGHT],
    [0.15, HERO_PHASE.FIRST_LIGHT],
    [0.39, HERO_PHASE.FIRST_LIGHT],
    [0.40, HERO_PHASE.DAWN],
    [0.74, HERO_PHASE.DAWN],
    [0.75, HERO_PHASE.MORNING],
    [1.0, HERO_PHASE.MORNING],
  ])('p=%f → %s', (p, phase) => {
    expect(phaseFromProgress(p)).toBe(phase);
  });
});

describe('gradientForProgress', () => {
  it.each([[0], [0.5], [1.0]])('returns valid rgb() pair at p=%f', (p) => {
    const { top, bot } = gradientForProgress(p);
    expect(top).toMatch(RGB);
    expect(bot).toMatch(RGB);
  });

  it('starts at night deep and ends at dawn cream', () => {
    expect(gradientForProgress(0)).toEqual({ top: 'rgb(26 22 17)', bot: 'rgb(36 30 21)' });
    expect(gradientForProgress(1)).toEqual({ top: 'rgb(232 160 61)', bot: 'rgb(245 238 224)' });
  });

  it('clamps out-of-range progress', () => {
    expect(gradientForProgress(-1)).toEqual(gradientForProgress(0));
    expect(gradientForProgress(2)).toEqual(gradientForProgress(1));
  });
});

describe('lerpHex', () => {
  it('returns endpoints at t=0 and t=1', () => {
    expect(lerpHex('#000000', '#ffffff', 0)).toBe('rgb(0 0 0)');
    expect(lerpHex('#000000', '#ffffff', 1)).toBe('rgb(255 255 255)');
  });

  it('interpolates midpoints', () => {
    expect(lerpHex('#000000', '#ffffff', 0.5)).toBe('rgb(128 128 128)');
  });
});

describe('layer helpers', () => {
  it('sun starts fully below the horizon and floats clear at morning', () => {
    expect(sunYForProgress(0)).toBe(115);
    expect(sunYForProgress(1)).toBe(-10);
  });

  it('glow expands from 0 to 24px', () => {
    expect(sunGlowForProgress(0)).toBe(0);
    expect(sunGlowForProgress(1)).toBe(24);
  });

  it('stars are fully visible at night and gone by first light end', () => {
    expect(starsOpacityForProgress(0)).toBe(1);
    expect(starsOpacityForProgress(0.40)).toBe(0);
    expect(starsOpacityForProgress(1)).toBe(0);
  });

  it('haze is absent in deep night, peaks at 0.30 alpha in dawn, softens in morning', () => {
    expect(hazeOpacityForProgress(0)).toBe(0);
    expect(hazeOpacityForProgress(0.5)).toBe(0.30);
    expect(hazeOpacityForProgress(1)).toBeCloseTo(0.12);
  });

  it('title shadow holds through night and dissolves by late dawn', () => {
    expect(titleShadowOpacityForProgress(0)).toBe(0.28);
    expect(titleShadowOpacityForProgress(0.55)).toBe(0.28);
    expect(titleShadowOpacityForProgress(0.85)).toBe(0);
    expect(titleShadowOpacityForProgress(1)).toBe(0);
  });

  it('text is cream through mid-dawn and ink on the morning sky', () => {
    expect(textColorForProgress(0)).toBe('rgb(245 238 224)');
    expect(textColorForProgress(0.70)).toBe('rgb(245 238 224)');
    expect(textColorForProgress(0.85)).toBe('rgb(36 30 21)');
    expect(textColorForProgress(1)).toBe('rgb(36 30 21)');
    expect(textColorForProgress(0.775)).toMatch(RGB);
  });

  it('scrim appears only through the mid-dawn contrast window', () => {
    expect(scrimOpacityForProgress(0)).toBe(0);
    expect(scrimOpacityForProgress(0.30)).toBe(0);
    expect(scrimOpacityForProgress(0.45)).toBe(0.35);
    expect(scrimOpacityForProgress(0.72)).toBe(0.35);
    expect(scrimOpacityForProgress(0.85)).toBe(0);
    expect(scrimOpacityForProgress(1)).toBe(0);
  });
});

describe('starField', () => {
  it('is deterministic for the spec seed', () => {
    expect(starField(40, 42)).toEqual(starField(40, 42));
  });

  it('produces 40 stars within the sky bounds', () => {
    const stars = starField(40, 42);
    expect(stars).toHaveLength(40);
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(100);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(65);
      expect(s.o).toBeGreaterThan(0);
      expect(s.o).toBeLessThanOrEqual(1);
    }
  });

  it('differs for a different seed', () => {
    expect(starField(40, 43)).not.toEqual(starField(40, 42));
  });
});

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false when window is undefined (SSR)', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reflects a matching media query', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    });
    expect(prefersReducedMotion()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('is false when the media query does not match', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('skyProgressForScroll', () => {
  it('clamps to 0..1 and scales by the given distance', () => {
    expect(skyProgressForScroll(0, 1000)).toBe(0);
    expect(skyProgressForScroll(500, 1000)).toBe(0.5);
    expect(skyProgressForScroll(1000, 1000)).toBe(1);
    expect(skyProgressForScroll(5000, 1000)).toBe(1);
    expect(skyProgressForScroll(-100, 1000)).toBe(0);
  });

  it('returns 0 for a non-positive distance instead of dividing by zero', () => {
    expect(skyProgressForScroll(500, 0)).toBe(0);
    expect(skyProgressForScroll(500, -10)).toBe(0);
  });
});

describe('skyColorForProgress', () => {
  it('returns the exact named surface colour at each stop', () => {
    expect(skyColorForProgress(0)).toBe('rgb(20 20 48)'); // --surface-night
    expect(skyColorForProgress(1)).toBe('rgb(244 237 216)'); // --surface-morning
  });

  it('clamps out-of-range progress to the end stops', () => {
    expect(skyColorForProgress(-1)).toBe(skyColorForProgress(0));
    expect(skyColorForProgress(2)).toBe(skyColorForProgress(1));
  });

  it('interpolates monotonically between adjacent stops', () => {
    const early = skyColorForProgress(0.1);
    const mid = skyColorForProgress(0.2);
    expect(early).not.toBe(mid);
  });
});

describe('skyToneForProgress (hysteresis at 0.45 / 0.8)', () => {
  it('is NIGHT at and below 0.45 regardless of previous tone', () => {
    expect(skyToneForProgress(0, SKY_TONE.MORNING)).toBe(SKY_TONE.NIGHT);
    expect(skyToneForProgress(0.45, SKY_TONE.MORNING)).toBe(SKY_TONE.NIGHT);
  });

  it('is MORNING at and above 0.8 regardless of previous tone', () => {
    expect(skyToneForProgress(0.8, SKY_TONE.NIGHT)).toBe(SKY_TONE.MORNING);
    expect(skyToneForProgress(1, SKY_TONE.NIGHT)).toBe(SKY_TONE.MORNING);
  });

  it('holds the previous tone inside the 0.45-0.8 hysteresis band', () => {
    expect(skyToneForProgress(0.6, SKY_TONE.NIGHT)).toBe(SKY_TONE.NIGHT);
    expect(skyToneForProgress(0.6, SKY_TONE.MORNING)).toBe(SKY_TONE.MORNING);
  });

  it('defaults to NIGHT when no previous tone is given', () => {
    expect(skyToneForProgress(0.6)).toBe(SKY_TONE.NIGHT);
  });
});

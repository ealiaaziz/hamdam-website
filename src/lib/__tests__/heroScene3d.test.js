import { describe, it, expect } from 'vitest';
import {
  cameraDollyForProgress,
  DOLLY_DEPTH,
  moteOpacityForProgress,
  MOTE_PEAK_OPACITY,
} from '../heroScene3d.js';

// The rest of heroScene3d.js is WebGL context work and cannot run under jsdom.
// The dolly is the one piece that is pure arithmetic, and it is the piece with a
// safety property worth pinning: the camera must never travel far enough to
// reach the star field.
describe('cameraDollyForProgress', () => {
  it('starts at the origin and reaches full travel by the end of the fade window', () => {
    expect(cameraDollyForProgress(0)).toBe(0);
    expect(cameraDollyForProgress(0.4)).toBeCloseTo(DOLLY_DEPTH, 6);
  });

  it('holds at full travel past the window instead of continuing', () => {
    expect(cameraDollyForProgress(0.5)).toBeCloseTo(DOLLY_DEPTH, 6);
    expect(cameraDollyForProgress(1)).toBeCloseTo(DOLLY_DEPTH, 6);
  });

  it('clamps out-of-range progress to the end stops', () => {
    expect(cameraDollyForProgress(-1)).toBe(0);
    expect(cameraDollyForProgress(2)).toBeCloseTo(DOLLY_DEPTH, 6);
  });

  it('never moves backwards', () => {
    let previous = -Infinity;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const d = cameraDollyForProgress(p);
      expect(d).toBeGreaterThanOrEqual(previous);
      previous = d;
    }
  });

  it('eases out: the first half of the window covers more ground than the second', () => {
    const firstHalf = cameraDollyForProgress(0.2) - cameraDollyForProgress(0);
    const secondHalf = cameraDollyForProgress(0.4) - cameraDollyForProgress(0.2);
    expect(firstHalf).toBeGreaterThan(secondHalf);
  });

  // The constraint that matters. The camera sits at z = 4 and the nearest star
  // the field can generate is z = -1.5 (deterministicStars: -1.5 - rand() * 7),
  // so there are 5.5 world units between them at rest. If the dolly ever grew
  // past that the camera would pass through the field and stars would smear
  // across the viewport; if it reached the 0.1 near plane they would clip.
  it('stops well short of the nearest star the field can generate', () => {
    const CAMERA_Z = 4;
    const NEAREST_STAR_Z = -1.5;
    const NEAR_PLANE = 0.1;
    const closestApproach = CAMERA_Z - cameraDollyForProgress(1) - NEAREST_STAR_Z;
    expect(closestApproach).toBeGreaterThan(NEAR_PLANE);
    // And with real margin, not just technically clear.
    expect(closestApproach).toBeGreaterThan(3);
  });
});

describe('moteOpacityForProgress', () => {
  it('is absent at both ends of the hero', () => {
    expect(moteOpacityForProgress(0)).toBe(0);
    expect(moteOpacityForProgress(1)).toBe(0);
  });

  it('clamps out-of-range progress rather than reappearing', () => {
    expect(moteOpacityForProgress(-1)).toBe(0);
    expect(moteOpacityForProgress(2)).toBe(0);
  });

  it('rises to its peak in the middle of the dawn and comes back down', () => {
    const peak = moteOpacityForProgress(0.38);
    expect(peak).toBeCloseTo(MOTE_PEAK_OPACITY, 6);
    expect(moteOpacityForProgress(0.2)).toBeLessThan(peak);
    expect(moteOpacityForProgress(0.6)).toBeLessThan(peak);
    expect(moteOpacityForProgress(0.2)).toBeGreaterThan(0);
    expect(moteOpacityForProgress(0.6)).toBeGreaterThan(0);
  });

  it('never exceeds the peak anywhere on the curve', () => {
    for (let p = 0; p <= 1.0001; p += 0.005) {
      expect(moteOpacityForProgress(p)).toBeLessThanOrEqual(MOTE_PEAK_OPACITY + 1e-9);
      expect(moteOpacityForProgress(p)).toBeGreaterThanOrEqual(0);
    }
  });

  // A hard corner at either end is visible against a sky that is itself
  // changing colour, which is the whole reason for the smoothstep.
  it('eases in and out rather than switching on', () => {
    const justInside = moteOpacityForProgress(0.13);
    expect(justInside).toBeGreaterThan(0);
    expect(justInside).toBeLessThan(MOTE_PEAK_OPACITY * 0.1);
    const justBeforeOut = moteOpacityForProgress(0.71);
    expect(justBeforeOut).toBeGreaterThan(0);
    expect(justBeforeOut).toBeLessThan(MOTE_PEAK_OPACITY * 0.1);
  });

  // The two planes hand over: motes arrive as the stars are leaving, so the
  // hero never shows both at full strength and never shows neither mid-dawn.
  it('hands over from the star field rather than overlapping at full strength', () => {
    const starOpacity = (p) => 1 - Math.min(1, Math.max(0, p) / 0.4);
    expect(starOpacity(0.38)).toBeLessThan(0.1); // stars nearly gone at the mote peak
    expect(moteOpacityForProgress(0.05)).toBe(0); // nothing yet while stars are full
  });
});

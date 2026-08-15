import { describe, it, expect } from 'vitest';
import { cameraDollyForProgress, DOLLY_DEPTH } from '../heroScene3d.js';

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

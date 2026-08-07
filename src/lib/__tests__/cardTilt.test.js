import { describe, it, expect } from 'vitest';
import {
  MAX_TILT_DEG,
  DAMPING,
  pointerOffset,
  tiltForOffset,
  sheenPosition,
  approach,
  initCardTilt,
} from '../cardTilt.js';

const rect = { left: 100, top: 200, width: 200, height: 400 };

describe('pointerOffset', () => {
  it('is 0,0 at the centre of the element', () => {
    expect(pointerOffset(200, 400, rect)).toEqual({ x: 0, y: 0 });
  });

  it('is -1,-1 at the top-inline-start corner and 1,1 at the opposite one', () => {
    expect(pointerOffset(100, 200, rect)).toEqual({ x: -1, y: -1 });
    expect(pointerOffset(300, 600, rect)).toEqual({ x: 1, y: 1 });
  });

  it('clamps a pointer that has left the element, so it can never over-rotate', () => {
    // pointerleave and the next animation frame are not simultaneous, so an
    // out-of-bounds coordinate does reach this function in practice.
    expect(pointerOffset(-500, -500, rect)).toEqual({ x: -1, y: -1 });
    expect(pointerOffset(5000, 5000, rect)).toEqual({ x: 1, y: 1 });
  });

  it('returns 0 rather than NaN for a zero-sized element', () => {
    const collapsed = { left: 0, top: 0, width: 0, height: 0 };
    expect(pointerOffset(10, 10, collapsed)).toEqual({ x: 0, y: 0 });
  });
});

describe('tiltForOffset', () => {
  it('does not tilt at the centre', () => {
    expect(tiltForOffset({ x: 0, y: 0 })).toEqual({ rotateX: -0, rotateY: 0 });
  });

  it('never exceeds the maximum in either axis', () => {
    for (const x of [-1, -0.5, 0, 0.5, 1]) {
      for (const y of [-1, -0.5, 0, 0.5, 1]) {
        const { rotateX, rotateY } = tiltForOffset({ x, y });
        expect(Math.abs(rotateX)).toBeLessThanOrEqual(MAX_TILT_DEG);
        expect(Math.abs(rotateY)).toBeLessThanOrEqual(MAX_TILT_DEG);
      }
    }
  });

  it('tips the near edge toward the viewer: a pointer below centre gives a negative rotateX', () => {
    // Regression guard on the sign. Without the negation the sheet tips away from
    // the pointer, which reads as the surface pushing back rather than being pressed.
    expect(tiltForOffset({ x: 0, y: 1 }).rotateX).toBeLessThan(0);
    expect(tiltForOffset({ x: 0, y: -1 }).rotateX).toBeGreaterThan(0);
  });

  it('turns toward the pointer horizontally', () => {
    expect(tiltForOffset({ x: 1, y: 0 }).rotateY).toBeGreaterThan(0);
    expect(tiltForOffset({ x: -1, y: 0 }).rotateY).toBeLessThan(0);
  });

  it('honours an explicit maximum', () => {
    expect(tiltForOffset({ x: 1, y: -1 }, 10)).toEqual({ rotateX: 10, rotateY: 10 });
  });
});

describe('sheenPosition', () => {
  it('sits at the centre of the surface when the pointer does', () => {
    expect(sheenPosition({ x: 0, y: 0 })).toEqual({ x: 50, y: 50 });
  });

  it('tracks the pointer to the surface edges', () => {
    expect(sheenPosition({ x: -1, y: -1 })).toEqual({ x: 0, y: 0 });
    expect(sheenPosition({ x: 1, y: 1 })).toEqual({ x: 100, y: 100 });
  });

  it('stays within the surface for every reachable offset', () => {
    for (const v of [-1, -0.3, 0, 0.42, 1]) {
      const { x, y } = sheenPosition({ x: v, y: v });
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });
});

describe('approach', () => {
  it('moves toward the target without overshooting it', () => {
    let v = 0;
    for (let i = 0; i < 200; i++) v = approach(v, 1);
    expect(v).toBeGreaterThan(0.99);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('never overshoots in a single step, in either direction', () => {
    expect(approach(0, 1)).toBeLessThan(1);
    expect(approach(1, 0)).toBeGreaterThan(0);
  });

  it('is a no-op once current equals target, so the frame loop can settle and stop', () => {
    expect(approach(0.5, 0.5)).toBe(0.5);
  });

  it('uses a damping factor strictly between 0 and 1 (0 would never move, 1 would snap)', () => {
    expect(DAMPING).toBeGreaterThan(0);
    expect(DAMPING).toBeLessThan(1);
  });
});

describe('initCardTilt', () => {
  // These tests run in the node environment, where `window` is genuinely absent --
  // which is the first thing initCardTilt guards on, so it has to be stubbed here or
  // every case below passes for the wrong reason (SSR bail-out rather than the
  // media-query bail-out each case is actually about).
  const withMatchMedia = (matches) => {
    const hadWindow = 'window' in globalThis;
    const originalWindow = globalThis.window;
    const original = globalThis.matchMedia;
    globalThis.window = globalThis.window ?? {};
    globalThis.matchMedia = (query) => ({ matches: matches(query), media: query });
    return () => {
      if (original) globalThis.matchMedia = original;
      else delete globalThis.matchMedia;
      if (hadWindow) globalThis.window = originalWindow;
      else delete globalThis.window;
    };
  };

  const fakeRoot = () => {
    const calls = [];
    return {
      calls,
      querySelectorAll: (sel) => {
        calls.push(sel);
        return [];
      },
    };
  };

  it('does nothing at all when the visitor prefers reduced motion', () => {
    const restore = withMatchMedia((q) => q.includes('prefers-reduced-motion'));
    const root = fakeRoot();
    const teardown = initCardTilt(root, '.x');
    // It must bail before even looking for cards -- the point is that no listener
    // and no rAF is ever created for these visitors.
    expect(root.calls).toHaveLength(0);
    expect(typeof teardown).toBe('function');
    restore();
  });

  it('does nothing on a device without a fine hovering pointer', () => {
    // A touch screen only fires pointermove mid-drag, so tilt there would be motion
    // nobody asked for rather than a response to a deliberate input. Reduced motion
    // is NOT set here, so this isolates the pointer gate on its own.
    const restore = withMatchMedia(() => false);
    const root = fakeRoot();
    initCardTilt(root, '.x');
    expect(root.calls).toHaveLength(0);
    restore();
  });

  it('bails out during server-side rendering, where there is no window at all', () => {
    const hadWindow = 'window' in globalThis;
    const originalWindow = globalThis.window;
    delete globalThis.window;
    const root = fakeRoot();
    expect(() => initCardTilt(root, '.x')).not.toThrow();
    expect(root.calls).toHaveLength(0);
    if (hadWindow) globalThis.window = originalWindow;
  });

  it('returns a callable teardown when there are no matching cards', () => {
    const restore = withMatchMedia((q) => q.includes('hover: hover'));
    const root = fakeRoot();
    const teardown = initCardTilt(root, '.x');
    expect(root.calls).toEqual(['.x']);
    expect(() => teardown()).not.toThrow();
    restore();
  });
});

// Pointer-driven depth for flat surfaces (added 2026-08-07).
//
// The page's problem below the fold was that the hero renders a real lit scene and
// everything under it was flat fill on flat fill. This module gives a surface the two
// cues that actually read as physical: it turns very slightly toward the pointer, and a
// specular highlight tracks across it as it turns. Both are driven by a deliberate input
// and nothing else -- there is no idle animation here, per motion-specification.md
// principle 2, the same rule the hero's own pointer parallax follows.
//
// The maths is pure and exported separately from the DOM wiring so it can be tested
// without a browser, matching cinematic.js / moodDemo.js in this directory.

/** Maximum tilt in degrees. Deliberately small: past ~4deg a text surface starts to
 *  read as a gimmick and the Persian line's baseline visibly skews. */
export const MAX_TILT_DEG = 3.2;

/** Per-frame approach factor for the damping. Matches heroScene3d.js's 0.06 feel. */
export const DAMPING = 0.12;

/**
 * Pointer position within an element, normalised to -1..1 on both axes with the origin
 * at the element's centre. Values are clamped, so a pointer that leaves the element
 * (which happens between pointerout and the next frame) can never over-rotate it.
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ left: number, top: number, width: number, height: number }} rect
 * @returns {{ x: number, y: number }}
 */
export function pointerOffset(clientX, clientY, rect) {
  const nx = rect.width > 0 ? ((clientX - rect.left) / rect.width - 0.5) * 2 : 0;
  const ny = rect.height > 0 ? ((clientY - rect.top) / rect.height - 0.5) * 2 : 0;
  return { x: clamp(nx, -1, 1), y: clamp(ny, -1, 1) };
}

/**
 * Tilt for a normalised pointer offset.
 *
 * rotateX is negated against the vertical offset because a pointer BELOW the centre
 * should tip the near edge toward the viewer, not away from them -- the intuition is
 * pressing a corner of a sheet of paper down.
 *
 * @param {{ x: number, y: number }} offset
 * @param {number} [maxDeg]
 * @returns {{ rotateX: number, rotateY: number }}
 */
export function tiltForOffset(offset, maxDeg = MAX_TILT_DEG) {
  return {
    rotateX: -offset.y * maxDeg,
    rotateY: offset.x * maxDeg,
  };
}

/**
 * Where the specular highlight sits, as a percentage pair for a radial-gradient
 * position. It tracks the pointer directly (a highlight is a reflection of the light
 * source in the surface, so it follows where the surface is turned toward), which is
 * what stops the tilt reading as a flat image being skewed.
 *
 * @param {{ x: number, y: number }} offset
 * @returns {{ x: number, y: number }} each 0..100
 */
export function sheenPosition(offset) {
  return {
    x: 50 + offset.x * 50,
    y: 50 + offset.y * 50,
  };
}

/**
 * One damping step toward a target. Exported so the approach curve is covered by tests
 * rather than only observable at 60fps.
 *
 * @param {number} current
 * @param {number} target
 * @param {number} [factor]
 */
export function approach(current, target, factor = DAMPING) {
  return current + (target - current) * factor;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Wire pointer tilt onto every element matching `selector` inside `root`.
 *
 * Returns a teardown function. Does nothing at all (and returns a no-op) when the
 * visitor prefers reduced motion, when the pointer is coarse, or when the pointer
 * cannot hover -- a touch screen fires pointermove only mid-drag, so on a phone this
 * would be motion nobody asked for rather than a response to a deliberate input.
 *
 * Custom properties are set through the CSSOM rather than written into markup: the
 * production CSP is `style-src 'self'` with no unsafe-inline, so a style attribute in
 * the HTML would be blocked at the edge. Scripted CSSOM writes are not.
 *
 * @param {ParentNode} root
 * @param {string} selector
 * @param {{ maxDeg?: number }} [options]
 * @returns {() => void}
 */
export function initCardTilt(root, selector, options = {}) {
  const noop = () => {};
  if (typeof window === 'undefined' || typeof matchMedia !== 'function') return noop;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return noop;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return noop;

  const maxDeg = options.maxDeg ?? MAX_TILT_DEG;
  const cards = Array.from(root.querySelectorAll(selector));
  if (cards.length === 0) return noop;

  const teardowns = cards.map((card) => {
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let rafId = 0;
    let running = false;

    const frame = () => {
      curX = approach(curX, targetX);
      curY = approach(curY, targetY);
      const offset = { x: curX, y: curY };
      const { rotateX, rotateY } = tiltForOffset(offset, maxDeg);
      const sheen = sheenPosition(offset);
      const style = card.style;
      style.setProperty('--tilt-x', `${rotateX.toFixed(3)}deg`);
      style.setProperty('--tilt-y', `${rotateY.toFixed(3)}deg`);
      style.setProperty('--sheen-x', `${sheen.x.toFixed(2)}%`);
      style.setProperty('--sheen-y', `${sheen.y.toFixed(2)}%`);

      // Settle and stop rather than holding a rAF open forever: once the surface has
      // reached its target to within a rounding error there is nothing left to draw.
      const settled = Math.abs(targetX - curX) < 0.001 && Math.abs(targetY - curY) < 0.001;
      if (settled) {
        running = false;
        return;
      }
      rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    };

    const onPointerMove = (event) => {
      const offset = pointerOffset(event.clientX, event.clientY, card.getBoundingClientRect());
      targetX = offset.x;
      targetY = offset.y;
      card.classList.add('is-tilting');
      start();
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      card.classList.remove('is-tilting');
      start();
    };

    card.addEventListener('pointermove', onPointerMove, { passive: true });
    card.addEventListener('pointerleave', onLeave, { passive: true });

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      card.removeEventListener('pointermove', onPointerMove);
      card.removeEventListener('pointerleave', onLeave);
      card.classList.remove('is-tilting');
    };
  });

  return () => teardowns.forEach((fn) => fn());
}

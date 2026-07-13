// Pure reveal helpers — DOM wiring lives in BaseLayout's script.

import { prefersReducedMotion } from './cinematic.js';

export const REVEAL = Object.freeze({ HIDDEN: 'hidden', VISIBLE: 'visible' });

// Single implementation shared with the hero (defined in cinematic.js).
export { prefersReducedMotion };

export function staggerDelayMs(indexInGroup, baseMs = 60, maxMs = 240) {
  return Math.min(indexInGroup * baseMs, maxMs);
}

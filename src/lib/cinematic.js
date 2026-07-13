// Pure cinematic timeline helpers for the warm-dawn hero — no DOM access
// except the feature-detect in prefersReducedMotion. Everything that maps
// scroll progress to a visual value lives here so it can be unit-tested.

export const HERO_PHASE = Object.freeze({
  NIGHT: 'night', // 0.00 – 0.15
  FIRST_LIGHT: 'first', // 0.15 – 0.40
  DAWN: 'dawn', // 0.40 – 0.75
  MORNING: 'morning', // 0.75 – 1.00
});

// progress: 0..1 (scroll or time driven)
export function phaseFromProgress(p) {
  if (p < 0.15) return HERO_PHASE.NIGHT;
  if (p < 0.40) return HERO_PHASE.FIRST_LIGHT;
  if (p < 0.75) return HERO_PHASE.DAWN;
  return HERO_PHASE.MORNING;
}

// Warm-dawn gradient interpolation (returns CSS color pair)
export function gradientForProgress(p) {
  // Returns two stops: [topColor, bottomColor]
  // p=0 night deep → night gold; p=1 saffron → dawn cream
  const stops = [
    { at: 0.00, top: '#1A1611', bot: '#241E15' },
    { at: 0.30, top: '#3A2A18', bot: '#7A5A28' },
    { at: 0.65, top: '#C9502C', bot: '#E8A03D' },
    { at: 1.00, top: '#E8A03D', bot: '#F5EEE0' },
  ];
  const clamped = Math.max(0, Math.min(1, p));
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].at && clamped <= stops[i + 1].at) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const t = (clamped - a.at) / (b.at - a.at || 1);
  return { top: lerpHex(a.top, b.top, t), bot: lerpHex(a.bot, b.bot, t) };
}

export function lerpHex(hexA, hexB, t) {
  const A = hexToRgb(hexA), B = hexToRgb(hexB);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const b = Math.round(A.b + (B.b - A.b) * t);
  return `rgb(${r} ${g} ${b})`;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Sun is bottom-anchored to the horizon line inside a clipped track:
// translateY(115%) hides it fully below the horizon (glow included),
// translateY(-10%) floats it just clear at full morning.
export function sunYForProgress(p) {
  return 115 + (-10 - 115) * clamp01(p); // percent of the sun's own height
}

// Soft outer glow expands from 0 to 24px as the sun rises.
export function sunGlowForProgress(p) {
  return 24 * clamp01(p); // px
}

// Stars fade out across NIGHT → FIRST_LIGHT (gone by p=0.40).
export function starsOpacityForProgress(p) {
  return 1 - clamp01(p / 0.40);
}

// Horizon haze: absent in deep night, lifts through FIRST_LIGHT to its full
// 30% presence in DAWN, softens again through MORNING.
export function hazeOpacityForProgress(p) {
  const c = clamp01(p);
  if (c < 0.15) return 0;
  if (c < 0.40) return 0.30 * ((c - 0.15) / 0.25);
  if (c < 0.75) return 0.30;
  return 0.30 - 0.18 * ((c - 0.75) / 0.25);
}

// Hero text stays dawn cream while the scrim (below) carries it across the
// bright mid-dawn sky, then flips quickly to warm ink once the sky is light
// enough to hold dark text. Never mid-grey on mid-orange.
export function textColorForProgress(p) {
  const c = clamp01(p);
  if (c <= 0.70) return lerpHex('#F5EEE0', '#F5EEE0', 0);
  if (c >= 0.85) return lerpHex('#241E15', '#241E15', 0);
  return lerpHex('#F5EEE0', '#241E15', (c - 0.70) / 0.15);
}

// Soft night-deep backdrop behind the hero text, present only through the
// mid-dawn window where cream text would otherwise sit on a similar-value
// saffron sky (the Phase 10 contrast prescription, applied pre-emptively).
export function scrimOpacityForProgress(p) {
  const c = clamp01(p);
  if (c <= 0.30 || c >= 0.85) return 0;
  if (c < 0.45) return Math.round(0.35 * ((c - 0.30) / 0.15) * 1000) / 1000;
  if (c <= 0.72) return 0.35;
  return Math.round(0.35 * (1 - (c - 0.72) / 0.13) * 1000) / 1000;
}

// The title's grounding shadow reads well on the dark sky but muddies dark
// text on the light morning sky, so it dissolves through late DAWN.
export function titleShadowOpacityForProgress(p) {
  const c = clamp01(p);
  if (c <= 0.55) return 0.28;
  if (c >= 0.85) return 0;
  return Math.round(0.28 * (1 - (c - 0.55) / 0.30) * 1000) / 1000;
}

// Deterministic star field — mulberry32 PRNG so positions never jitter
// between builds or renders. Seed is fixed at 42 by spec.
export function starField(count = 40, seed = 42) {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.round(rand() * 1000) / 10, // percent, 1dp
      y: Math.round(rand() * 650) / 10, // upper 65% of the sky
      r: Math.round((0.6 + rand() * 1.0) * 10) / 10, // 0.6–1.6 px radius
      o: Math.round((0.35 + rand() * 0.65) * 100) / 100, // varied base opacity
    });
  }
  return stars;
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

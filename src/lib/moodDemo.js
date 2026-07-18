// Pure feeling-to-scene and feeling-to-verse mapping for the emotional
// weather demonstration (page spec §3), plus the settle-debounce so
// scrubbing the slider doesn't spawn verse-card churn (motion spec §4).
//
// FA labels reuse the exact, already-shipped Apple Health valence strings
// from ReflectionComposeSheet.swift's appleHealthLabel(for:) in the iOS
// app (never hand-typed here) at the closest matching position on this
// 5-stop scale; the EN labels are the page spec's own suggested wording
// ("for example: heavy, unsettled, steady, light, bright"). Pairing a
// warm EN label with the clinical-register FA valence string is a
// deliberate interim choice, not a matched translation -- flagged here
// for Ealia's review before this copy is considered final, the same
// requiresFinalReview pattern the iOS screenshot orchestrator uses for
// reused-in-a-new-context copy.
export const MOOD_STOPS = Object.freeze([
  Object.freeze({ id: 'heavy', labelEn: 'Heavy', labelFa: 'بسیار ناخوشایند', sky: 'night', verseId: 'hafez-016' }),
  Object.freeze({ id: 'unsettled', labelEn: 'Unsettled', labelFa: 'ناخوشایند', sky: 'dusk', verseId: 'rumi-011' }),
  Object.freeze({ id: 'steady', labelEn: 'Steady', labelFa: 'خنثی', sky: 'firstlight', verseId: 'rumi-011' }),
  Object.freeze({ id: 'light', labelEn: 'Light', labelFa: 'خوشایند', sky: 'dawn', verseId: 'parvin-008' }),
  Object.freeze({ id: 'bright', labelEn: 'Bright', labelFa: 'بسیار خوشایند', sky: 'morning', verseId: 'parvin-008' }),
]);

export function moodStopForIndex(index) {
  const clamped = Math.max(0, Math.min(MOOD_STOPS.length - 1, Math.round(index)));
  return MOOD_STOPS[clamped];
}

export function verseForMoodStop(stop, verses) {
  return verses.find((v) => v.id === stop.verseId) ?? null;
}

// Scrubbing rapidly must not spawn verse-card churn (motion spec §4): the
// verse only updates 150ms after the slider stops changing. Returns a
// debounced function; call .cancel() to clear a pending call (e.g. on
// unmount) and pass immediate=true to bypass the delay (reduced motion:
// "instant state swap, no crossfade, no rise").
export function createSettleDebounce(callback, delayMs = 150) {
  let timer = null;
  const debounced = (value, { immediate = false } = {}) => {
    if (timer) clearTimeout(timer);
    if (immediate) {
      timer = null;
      callback(value);
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      callback(value);
    }, delayMs);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

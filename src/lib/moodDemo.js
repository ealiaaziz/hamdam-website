// Pure feeling-to-scene and feeling-to-verse mapping for the emotional
// weather demonstration (page spec §3), plus the settle-debounce so
// scrubbing the slider doesn't spawn verse-card churn (motion spec §4).
//
// FA labels are the app's existing Apple Health valence strings, from
// ReflectionComposeSheet.swift's appleHealthLabel(for:) in the iOS app.
// Fable proposed warmer, idiomatic replacements (F1-02, 2026-07-18:
// سنگین/ناآرام/آرام/سبک/روشن) but Ealia vetoed in favour of app-string
// continuity (2026-07-19) -- reverted to the original values here, exact
// byte match to appleHealthLabel(for:)'s five relevant buckets (skipping
// its two "Slightly" grades, which have no EN counterpart in these five
// stops either).
//
// Each stop maps to a distinct verse (post-launch fix, 2026-07-19): the
// original 3-verse bank was one short of the 5 stops, so Unsettled/Steady
// both showed rumi-011 and Light/Bright both showed parvin-008 -- the
// second pair was the one caught live. parvin-013 (equanimity/patience)
// and saadi-003 (morning/welcome) were extracted byte-exact from the iOS
// app's verse bank to fill Steady and Bright respectively.
export const MOOD_STOPS = Object.freeze([
  Object.freeze({ id: 'heavy', labelEn: 'Heavy', labelFa: 'بسیار ناخوشایند', sky: 'night', verseId: 'hafez-016' }),
  Object.freeze({ id: 'unsettled', labelEn: 'Unsettled', labelFa: 'ناخوشایند', sky: 'dusk', verseId: 'rumi-011' }),
  Object.freeze({ id: 'steady', labelEn: 'Steady', labelFa: 'خنثی', sky: 'firstlight', verseId: 'parvin-013' }),
  Object.freeze({ id: 'light', labelEn: 'Light', labelFa: 'خوشایند', sky: 'dawn', verseId: 'parvin-008' }),
  Object.freeze({ id: 'bright', labelEn: 'Bright', labelFa: 'بسیار خوشایند', sky: 'morning', verseId: 'saadi-003' }),
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

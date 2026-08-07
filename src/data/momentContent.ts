// Per-moment content for the three cultural moments that have their own page.
//
// Moved here verbatim from RootsMoments.astro on 2026-08-07 by script, never
// retyped: every Farsi string below is byte-exact from the shipped app's
// momentMeaning(id:_:) and momentImageAlt in Localization.swift, and the
// homepage now imports these same constants rather than keeping a second copy.
// The FA sentences carry the app's own SIMA-review-pending flag; that status
// travels with them and is not a new gap.
//
// Only these three have an approved sentence in both languages, which is
// exactly why only these three have a page. Mehregan, Sizdah Bedar, Tirgan and
// Sepandarmazgan stay as name-plus-countdown rows on the homepage: giving them
// a page would mean authoring copy, and authoring the Farsi half is Ealia's
// call, not a generation task's.

export interface MomentSentence {
  sentenceEn: string;
  sentenceFa: string;
}

export interface MomentAlt {
  en: string;
  fa: string;
}

/**
 * URL slug per moment id. Latin, hyphenated and identical on both locales:
 * the Farsi route is /fa/moments/<slug>/, so switchLocalePath maps the pair
 * with no per-locale slug table to keep in step.
 */
export const MOMENT_SLUGS: Record<string, string> = {
  yalda: 'yalda',
  norooz: 'norooz',
  chaharshanbeSuri: 'chaharshanbe-suri',
};

/** Moment ids that have a page, in the order the cluster should be read. */
export const MOMENT_PAGE_IDS = ['yalda', 'norooz', 'chaharshanbeSuri'] as const;

/** Slug back to moment id, for getStaticPaths and for resolving a request. */
export const MOMENT_ID_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(MOMENT_SLUGS).map(([id, slug]) => [slug, id])
);

/**
 * English title tail, so the <title> carries the thing people actually search
 * for rather than a bare proper noun. Each is the opening clause of that
 * moment's approved sentence below, shortened, so it asserts nothing the
 * approved copy does not already assert.
 *
 * AUTHORED 2026-08-07, PENDING EALIA'S SIGN-OFF. There is deliberately no
 * Farsi equivalent: the Farsi <title> is `{nameFa} | همدم`, composed from
 * strings that already exist, because authoring the Persian is Ealia's call.
 * The asymmetry is confined to the title tag; every word of visible page copy
 * is approved in both languages.
 */
export const MOMENT_TITLE_TAIL_EN: Record<string, string> = {
  yalda: 'the longest night of the year',
  norooz: 'the first day of spring',
  chaharshanbeSuri: 'the last Tuesday night before Norooz',
};

export const MOMENT_ALT: Record<string, MomentAlt> = {
  yalda: { en: 'Pomegranates and candlelight for Yalda night', fa: 'انار و شمع برای شب یلدا' },
  norooz: { en: 'Spring blossoms in morning light for Norooz', fa: 'شکوفه‌های بهاری در نور صبح برای نوروز' },
  chaharshanbeSuri: { en: 'Fire glow at dusk for Chaharshanbe Suri', fa: 'شعله‌ی آتش در غروب برای چهارشنبه‌سوری' },
};

export const MOMENT_COPY: Record<string, MomentSentence> = {
  yalda: {
    sentenceEn: 'The longest night of the year, when families gather to read Hafez, share pomegranates and watermelon, and welcome the return of the sun.',
    sentenceFa: 'طولانی‌ترین شب سال، وقتی خانواده‌ها دور هم جمع می‌شوند تا حافظ بخوانند، انار و هندوانه به اشتراک بگذارند، و بازگشت خورشید را خوش‌آمد بگویند.',
  },
  norooz: {
    sentenceEn: 'The first day of spring, marking renewal, rebirth, and the balance of light and dark.',
    sentenceFa: 'نخستین روز بهار، نشانه‌ی تجدید، تولدی دوباره، و توازن روشنایی و تاریکی.',
  },
  chaharshanbeSuri: {
    sentenceEn: "The last Tuesday night before Norooz, when people leap over small fires whispering 'give me your redness, take my paleness.'",
    sentenceFa: 'شب سه‌شنبه‌ی آخر پیش از نوروز، وقتی مردم از روی آتش‌های کوچک می‌پرند و زمزمه می‌کنند «سرخی تو از من، زردی من از تو».',
  },
};

/**
 * The Farsi UI strings this cluster needs, lifted by script on 2026-08-07 from
 * the components that already owned them: the bridge line is the Roots
 * section's own approved heading in RootsMoments.astro, and the three CTA and
 * home strings are NavBar.astro's. Nothing here is new Persian, and nothing
 * here was typed by hand.
 *
 * The English side is not a translation of the Farsi. Each locale carries the
 * line already approved for it in this context, which is why they are two
 * fields rather than one pair.
 */
export const MOMENT_UI = {
  bridge: {
    en: 'Hamdam keeps the days that matter where you come from, and where you live.',
    fa: 'یلدا، نوروز، چهارشنبه‌سوری. همدم می‌داند کِی از راه می‌رسند، و آن‌ها را با شعری که به خودشان تعلق دارد خوش‌آمد می‌گوید.',
  },
  home: { en: 'Hamdam', fa: 'همدم' },
  cta: { en: 'Get Hamdam', fa: 'دریافت همدم' },
  ctaAria: { en: 'Download Hamdam on the App Store', fa: 'دانلود همدم از اپ‌استور' },
} as const;

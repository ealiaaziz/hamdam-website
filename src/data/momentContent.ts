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
  /** Meta-description-only English, for moments whose sentenceEn is too long
   *  once the date sentence is prepended. Falls back to sentenceEn when absent.
   *  Added 2026-09-05: the description does not have to be the body sentence,
   *  and shortening the body sentence to fit a snippet is the wrong trade.
   *  There is deliberately no Farsi counterpart. Every Farsi description on
   *  the site already fits, and authoring Persian here is not permitted. */
  snippetEn?: string;
  /** English-only body paragraphs, added 2026-09-05. The three moment pages
   *  rendered around 133 words each, one photo and one sentence, which is thin
   *  enough to be a weak ranking and citation candidate for exactly the queries
   *  the campaign targets ("what is Yalda night").
   *
   *  Same rule as snippetEn above and as poetPages.biographyEn: English only,
   *  because authoring the Farsi half is Ealia's call and not a generation
   *  task's. The Farsi page keeps its approved sentence and omits this block
   *  rather than carrying a machine-written one, which is the same trade the
   *  poet pages already make for the biography.
   *
   *  Content rule inherited from biographyEn: matters of record (what is done,
   *  when, where, what it is called), not interpretation. */
  bodyEn?: string[];
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
    snippetEn: 'The longest night of the year, when families gather to read Hafez and share pomegranates.',
    bodyEn: [
      'Yalda, also called Shab-e Chelleh, falls on the northern winter solstice, the night of 21 December in most years and 20 December in some. It is the longest night and the last night of autumn, and the morning after it the days begin to lengthen again.',
      'The name comes from a Syriac word for birth. What is being born is the sun: the night marks the turn of the year toward light rather than the depth of winter, which is why it is kept as a celebration and not a vigil. The tradition predates Islam in Iran and has continued alongside it for well over a thousand years.',
      'The table is red on purpose. Pomegranate and watermelon are the two fruits that must be there, both for the colour, which stands for the dawn, and because a watermelon kept from summer is proof the household planned ahead. Nuts, dried fruit and a candle complete it.',
      'Then the Divan comes out. Someone makes a wish, opens Hafez at random and reads the ghazal aloud, and the family argues about what it means for the person who asked. That is a faal, and Yalda is the night it is done most. Families who keep no other tradition often still keep this one.',
      'It is observed wherever the diaspora is, and the date does not move with the hemisphere: Iranians in Australia keep Yalda in December, on the longest night in Tehran rather than the longest night where they live. Hamdam marks it on the day and offers the faal.',
    ],
    sentenceFa: 'طولانی‌ترین شب سال، وقتی خانواده‌ها دور هم جمع می‌شوند تا حافظ بخوانند، انار و هندوانه به اشتراک بگذارند، و بازگشت خورشید را خوش‌آمد بگویند.',
  },
  norooz: {
    sentenceEn: 'The first day of spring, marking renewal, rebirth, and the balance of light and dark.',
    bodyEn: [
      'Norooz means new day, and it begins at the exact moment of the spring equinox rather than at midnight. That instant is calculated to the minute and is the same instant everywhere on earth, so the new year arrives in Sydney, Tehran and Los Angeles simultaneously and at different times on the clock. It is usually 20 or 21 March.',
      'It is the Iranian new year and it is not only Iranian. Norooz is kept in Afghanistan, Tajikistan, Uzbekistan, Azerbaijan, parts of Iraq, Turkey and India, and across the diaspora, by people of several religions and none. UNESCO lists it as intangible cultural heritage.',
      'The haft-sin is the table it is kept at: seven items whose Persian names begin with the letter sin, each standing for something wanted in the year ahead. Sabzeh, sprouted wheat or lentils, for rebirth. Samanu, a wheat pudding, for strength. Senjed, sib, seer, somaq, serkeh. A mirror, goldfish, painted eggs and a book of poetry usually sit alongside them.',
      'The book is often Hafez. In many houses the year turns with someone reading a ghazal aloud at the moment of the equinox, which makes Norooz the second great occasion, after Yalda, for opening the Divan.',
      'The season does not end that day. Visits to elders run through the following fortnight, and the thirteenth day, Sizdah Bedar, is spent outdoors, where the sabzeh from the table is thrown into running water. Hamdam counts down to the equinox and marks the days that follow it.',
    ],
    sentenceFa: 'نخستین روز بهار، نشانه‌ی تجدید، تولدی دوباره، و توازن روشنایی و تاریکی.',
  },
  chaharshanbeSuri: {
    sentenceEn: "The last Tuesday night before Norooz, when people leap over small fires whispering 'give me your redness, take my paleness.'",
    snippetEn: 'The last Tuesday night before Norooz, when people leap over small fires for the year ahead.',
    bodyEn: [
      'Chaharshanbe Suri is the eve of the last Wednesday of the Iranian year, so it is kept on the Tuesday night, usually in the middle of March. Chaharshanbe is Wednesday and suri means festive or red. It is the first event of the Norooz season rather than a separate holiday.',
      'Small fires are lit in the street and people jump over them calling out sorkhi-ye to az man, zardi-ye man az to: give me your redness, take my paleness. The exchange is the whole point. Red is health and the fire\'s vigour, yellow is sickness and winter pallor, and the year is being started clean.',
      'Fire is treated as something to leap over rather than something to worship, a distinction Iranians make often when the night is described from outside. The practice is old, plainly pre-Islamic in origin, and has survived periods when it was discouraged.',
      'Two customs travel with it. Qashogh-zani, spoon banging, sends children to knock at doors with a spoon and a bowl for sweets, which resembles trick or treating and long predates it in Iran. And ajil-e moshkel-gosha, the problem-solving mix of nuts and dried fruit, is shared afterwards.',
      'It is also the noisiest night of the Iranian year, and in modern Iran the fireworks cause enough injuries that hospitals staff for it. Hamdam marks the night and the fortnight of Norooz that follows.',
    ],
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

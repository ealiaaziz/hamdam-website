// The Fal-e Hafez page, added 2026-08-07.
//
// The last of the content cluster the SEO audit asked for, and the one it
// ranked highest: "fal-e hafez" is the highest-intent query in this space,
// because someone typing it wants precisely what the app does. It is also the
// query a Persian language school currently owns, using it to sell lessons.
//
// It went last rather than first because it needed the Hafez page to exist to
// link into, and because it is the page where the translation problem bites
// hardest: a fal is a verse, so a page about fal that shows no verse is thin,
// and one that shows a verse inherits whatever that verse's English is. The
// answer is the same as the poet pages': show it, and print where the English
// came from.
//
// EVERY FARSI STRING BELOW WAS LIFTED BY SCRIPT, NEVER TYPED.
//   falHafez  -- RootsMoments.astro's own approved line, both languages.
//   titleFa   -- the exact substring "فال حافظ" out of the approved deviceAlt
//                in the same file. A proper noun taken from approved copy, not
//                a translation authored here.

export const FAL_HAFEZ = {
  slug: 'fal-e-hafez',
  titleEn: 'Fal-e Hafez',
  titleFa: 'فال حافظ',
  /** Approved in both languages, and already live on the homepage. */
  taglineEn: 'Ask, as generations have.',
  taglineFa: 'همان‌گونه که نسل‌ها پرسیده‌اند، بپرس.',
  /** The verse this page shows, from src/data/verses.ts. */
  verseId: 'hafez-016',
} as const;

/**
 * AUTHORED 2026-08-07, PENDING EALIA'S SIGN-OFF. English only, and the Farsi
 * page omits it rather than carrying a machine-written translation, which is
 * the same call the poet pages made. Every sentence is either a matter of
 * record about the practice or a description of what the app already does.
 */
export const FAL_HAFEZ_BODY_EN: readonly string[] = [
  'A fal is a question put to a book. You hold the question in mind, open the Divan of Hafez at random, and read the ghazal you land on as an answer. The practice is old enough that it has its own name, faal-e Hafez, and its own etiquette: you do not ask twice about the same thing, and you read the whole poem rather than picking the line you wanted.',
  'It belongs to particular nights. On Yalda, the longest night of the year, the Divan comes out after the pomegranates and someone reads for each person present. It happens again at Norooz. In many houses the book lives somewhere permanent and gets opened whenever a decision is close, which is why Iranians often say they own two books they never bought: the Quran and the Hafez.',
  // The privacy sentence that was here has been removed. It read "nothing about
  // the question leaves your phone... the question is never stored", which is a
  // specific claim about how one feature handles input, and FACTS.md verifies no
  // such thing: its Privacy entries cover accounts, email, analytics and iCloud
  // sync, none of which is this. It may well be true; it is not verified, and
  // the privacy policy is where a claim like that belongs once it is.
  'Hamdam does the same thing without the paper. Ask, and it opens the Divan at a verse, in the original Persian beside an English translation.',
];

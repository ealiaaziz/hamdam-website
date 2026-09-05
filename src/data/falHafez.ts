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
export const FAL_HAFEZ_BODY_EN: readonly { heading: string; body: string }[] = [
  // Headings added 2026-08-16. The paragraphs are unchanged, word for word;
  // only their labels are new. The page had exactly one heading, its h1, above
  // three paragraphs answering three different questions, which is the shape a
  // search engine reads as one undifferentiated block and a screen reader
  // offers no way to navigate. The 2026-08-16 Search Console reading has this
  // page at position 27 for "fal e hafez english", the highest-intent query in
  // this space, so the sub-questions people actually type are worth naming.
  //
  // Each heading labels the paragraph beneath it and claims nothing the
  // paragraph does not already say.
  {
    heading: 'What a fal is',
    body: 'A fal is a question put to a book. You hold the question in mind, open the Divan of Hafez at random, and read the ghazal you land on as an answer. The practice is old enough that it has its own name, faal-e Hafez, and its own etiquette: you do not ask twice about the same thing, and you read the whole poem rather than picking the line you wanted.',
  },
  {
    heading: 'When a fal is read',
    body: 'It belongs to particular nights. On Yalda, the longest night of the year, the Divan comes out after the pomegranates and someone reads for each person present. It happens again at Norooz. In many houses the book lives somewhere permanent and gets opened whenever a decision is close, which is why Iranians often say they own two books they never bought: the Quran and the Hafez.',
  },
  // The privacy sentence that was here has been removed. It read "nothing about
  // the question leaves your phone... the question is never stored", which is a
  // specific claim about how one feature handles input, and FACTS.md verifies no
  // such thing: its Privacy entries cover accounts, email, analytics and iCloud
  // sync, none of which is this. It may well be true; it is not verified, and
  // the privacy policy is where a claim like that belongs once it is.
  // "beside an English translation" -> "or in English", 2026-08-16. The fal is
  // the sharpest case of the site-wide presentation error: DivanLeafView shows
  // the ghazal in one language and, in Farsi, deliberately shows no English at
  // all (Ealia, 2026-07-27: "I don't need English translation at all, add
  // tafsir instead"). See "Verse display" in FACTS.md.
  // Four sections added 2026-09-05. The page rendered at 296 words, thin for the
  // highest-intent query in this space and thin for an assistant asked "how do I
  // do a Hafez faal", which is a question this page should be able to answer on
  // its own. Each heading below is a sub-question people actually type, and the
  // English one is the exact Search Console query named above, where the page
  // sat at position 27. Same rule as the paragraphs above: a matter of record
  // about the practice, or a description of what the app already does.
  {
    heading: 'How a fal is taken',
    body: 'The steps are the same whether the book is on a table or on a phone. You settle on the question first and hold it without saying it aloud, which is the niyat, the intention. Many people then say a Fatiha for Hafez himself before opening. You open the Divan at random rather than choosing, and you read the ghazal you land on from the beginning, not from the line that catches your eye. Custom says one question at a time, and not the same question twice.',
  },
  {
    heading: 'Why the Divan of Hafez',
    body: 'Other books are used the same way, the Shahnameh and the Masnavi among them, but Hafez is the one that stuck. He is called Lisan al-Ghayb, the tongue of the unseen, and Tarjoman al-Asrar, the interpreter of secrets, and both titles were given because of this practice rather than the other way round. It helps that the ghazals do not tell stories. Each one turns on longing, patience, luck or the gap between what is said and what is meant, so almost any of them will meet almost any question halfway.',
  },
  {
    heading: 'Reading the answer',
    body: 'A fal is not read as a prediction. The ghazal is taken as a comment on the situation, and the work is in deciding which line is speaking to you and what it is saying, which is why it is usually done aloud and with other people arguing about it. Printed editions often carry a tafsir, a short interpretation, beside each poem; some readers use it and some consider it beside the point. Nobody treats a fal as binding.',
  },
  {
    heading: 'Fal-e Hafez in English',
    body: 'It works in English, with one thing worth knowing. The Persian ghazal carries its meaning in ambiguity, in words that hold a worldly and a spiritual sense at once, and a translation has to choose. That is why two English versions of the same poem can read as different answers. Reading the Persian alongside the English, even without reading Persian, at least shows you where the poem is denser than the rendering. The name is transliterated several ways, fal, faal and fa\'l among them, and written فال حافظ in Persian.',
  },
  {
    heading: 'Fal-e Hafez in Hamdam',
    body: 'Hamdam does the same thing without the paper. Ask, and it opens the Divan at a verse, in the original Persian or in English.',
  },
];

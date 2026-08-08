// Per-poet page content, added 2026-08-07.
//
// TRANSLATION PROVENANCE, which is the thing to read before editing this file.
//
// The site's public commitment is to cited public domain translations
// (Nicholson, Whinfield, Bell). FACTS.md marks the app's current English
// CONTESTED for that reason. The owner's instruction on 2026-08-07 was that an
// AI translation is acceptable where a trustworthy source cannot be found, so
// the first question was whether one can be.
//
// For the poets: yes. Bell's "Poems from the Divan of Hafiz" (1897),
// Nicholson's "Selected Poems from the Divani Shamsi Tabriz" (1898),
// Whinfield's "Masnavi i Ma'navi" (1898) and "Quatrains of Omar Khayyam"
// (1883), and Rehatsek's "Gulistan" (1888) are all public domain and all
// online.
//
// For these particular verses: no. The verses in src/data/verses.ts are
// byte-exact from the app's Ganjoor-sourced bank and cite standard Divan
// numbering ("Divan-e Hafez, Ghazal 367"). The public domain collections do
// not use that numbering: Bell and Le Gallienne index by English title, and
// each renders a whole ghazal rather than the single bayt the app quotes.
// Matching one to the other means reading the Persian and pairing line by
// line, and a wrong pairing publishes a translation under a poem it does not
// belong to. That is a worse failure than an honest label.
//
// So each verse carries its provenance to the page, and the page prints it.
// A reader is told which of the two they are looking at. When a human pairs a
// verse to a public domain rendering, change that verse's `translation` entry
// to `publicDomain` with the citation filled in; the component already renders
// it.

import type { ImageMetadata } from 'astro:assets';
import { poets } from './poets';

export type TranslationProvenance =
  | { kind: 'machine' }
  | { kind: 'publicDomain'; translator: string; work: string; year: number; url: string };

export interface PoetPage {
  /** Index into `poets`, so name, description and portrait stay in one place. */
  poetIndex: number;
  slug: string;
  /** Verse id in src/data/verses.ts to feature, or null when the bank has none
   *  for this poet. The page omits the verse block in that case. */
  verseId: string | null;
  translation: TranslationProvenance;
  /** Life dates as normally given in reference works. Latin digits both locales. */
  lifespan: string;
  /** Authored 2026-08-07, PENDING EALIA'S SIGN-OFF. English only: this repo
   *  bars authoring the Persian half, so the Farsi page omits the biography
   *  rather than carrying a machine-written one. Every sentence is a matter of
   *  record (dates, cities, titles of works), not interpretation. */
  biographyEn: string[];
  /** Ganjoor's page for this poet, which the footer already credits sitewide. */
  ganjoor: string;
}

export const POET_PAGES: readonly PoetPage[] = [
  {
    poetIndex: 0,
    slug: 'hafez',
    verseId: 'hafez-016',
    translation: { kind: 'machine' },
    lifespan: 'c. 1325 to 1390, Shiraz',
    biographyEn: [
      'Khwaja Shams-ud-Din Muhammad Hafez-e Shirazi lived his whole life in Shiraz, in what is now Iran, and left a single book: the Divan, a collection of roughly five hundred ghazals. The name Hafez is a title, given to someone who has memorised the Quran.',
      'The Divan is the book Iranians keep in the house. It is read at Yalda and at Norooz, and it is the book opened at random for a fal, a question put to the page. That practice is old enough that the poems are known by their opening lines rather than by number.',
    ],
    ganjoor: 'https://ganjoor.net/hafez',
  },
  {
    poetIndex: 1,
    slug: 'rumi',
    verseId: 'rumi-011',
    translation: { kind: 'machine' },
    lifespan: '1207 to 1273, Balkh to Konya',
    biographyEn: [
      'Jalal ad-Din Muhammad Balkhi, called Mowlana in Persian and Rumi in English, was born in Balkh in present-day Afghanistan and died in Konya in present-day Turkey. His family left Balkh ahead of the Mongol advance when he was a child.',
      'He wrote two great works. The Masnavi-ye Ma’navi runs to six books of narrative and commentary. The Divan-e Shams-e Tabrizi is named for the wandering dervish whose arrival, and later disappearance, turned a respected jurist into a poet.',
    ],
    ganjoor: 'https://ganjoor.net/moulavi',
  },
  {
    poetIndex: 2,
    slug: 'saadi',
    verseId: 'saadi-003',
    translation: { kind: 'machine' },
    lifespan: 'c. 1210 to c. 1291, Shiraz',
    biographyEn: [
      'Abu-Muhammad Muslih al-Din bin Abdallah Shirazi, known as Saadi, spent decades travelling before returning to Shiraz to write the two books he is remembered for.',
      'The Bustan, finished in 1257, is in verse. The Golestan, finished the year after, alternates prose and poetry and is the book Persian children have learned from for seven centuries. Its lines on the shared body of humankind are inscribed at the United Nations.',
    ],
    ganjoor: 'https://ganjoor.net/saadi',
  },
  {
    poetIndex: 3,
    slug: 'khayyam',
    verseId: 'khayyam-002',
    translation: { kind: 'machine' },
    lifespan: '1048 to 1131, Nishapur',
    biographyEn: [
      'Ghiyath al-Din Abu’l-Fath Umar ibn Ibrahim Khayyam Nishapuri was, in his own lifetime and by his own reckoning, a mathematician and an astronomer. He wrote a treatise on cubic equations and helped reform the Persian calendar into the Jalali, which is more accurate than the Gregorian.',
      'The quatrains came to English through Edward FitzGerald in 1859, in a version loose enough that scholars still argue about how much of it is Khayyam. The Persian originals are shorter, drier and harder.',
    ],
    ganjoor: 'https://ganjoor.net/khayyam',
  },
  {
    poetIndex: 4,
    slug: 'parvin-etesami',
    verseId: 'parvin-008',
    translation: { kind: 'machine' },
    lifespan: '1907 to 1941, Tabriz',
    biographyEn: [
      'Parvin Etesami is the most recent of the five and the only woman among them. She was born in Tabriz, published her Divan in 1935, and died at thirty-four.',
      'Her form is the monazere, the debate poem, in which two things argue: a needle and a thread, an ant and an eagle, a candle and a moth. The argument is the lesson. She is also the poet here for whom no public domain English translation exists, her work being too recent for one.',
    ],
    ganjoor: 'https://ganjoor.net/parvin',
  },
];

export const POET_PAGE_BY_SLUG: Record<string, PoetPage> = Object.fromEntries(
  POET_PAGES.map((p) => [p.slug, p])
);

/** The `poets` entry a page describes, so callers do not index by hand. */
export function poetFor(page: PoetPage): (typeof poets)[number] & { portrait: ImageMetadata } {
  return poets[page.poetIndex] as (typeof poets)[number] & { portrait: ImageMetadata };
}

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
      'The ghazal he wrote in is a fixed shape rather than a free one. Between five and fifteen couplets, every one of them ending on the same rhyme and often the same repeated word, and the poet naming himself in the last couplet. Hafez signs almost all of his that way, which is why so many end by addressing him directly.',
      'He lived through the reigns of three rulers of Shiraz and the poems register all three. Abu Ishaq Inju kept a court that made room for him. Mubariz al-Din closed the wine houses and enforced a public piety the Divan answers with wine, taverns and a hypocrite preacher who appears often enough to be a character. Shah Shuja reopened the city, and Hafez outlived him.',
      'His tomb sits in a garden in Shiraz called the Hafezieh, in the pavilion built over it in 1935. It is a place people visit rather than a monument they look at: the usual thing to do there is to open the Divan and read a line, which is the same act the app calls a faal.',
      'He reached English slowly and unevenly. Gertrude Bell published Poems from the Divan of Hafiz in 1897 and it remains the version most often quoted; Goethe had already worked from a German rendering for his West-Eastern Divan seventy years earlier. Neither used the numbering that Persian editions use, which is why matching a single couplet to a public domain English line is harder than it sounds, and why the app labels its own translations honestly.',
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
      'The name is a description of where he ended up. Konya sat in the territory Persian writers called Rum, the old Roman and Byzantine Anatolia, so Rumi means the one from Rum. Persians rarely use it. They say Molana or Molavi, meaning our master, and Turkish says Mevlana. One poet, four names, which is worth knowing if you are searching for him in more than one language.',
      'The Masnavi is roughly twenty five thousand couplets and does not read like a collection of poems. It is a continuous argument carried by stories, one opening inside another, a merchant and a parrot giving way to a grammarian and a boatman. Persians have called it the Quran in Persian for centuries, meaning the scale of it rather than claiming any equivalence.',
      'He did not found the order that carries his practice. The Mevlevi, the dervishes who turn, were organised after his death by his son and his followers, who built the ceremony around the sama, the listening he had already made part of his life. His funeral in Konya is described as having drawn Christians and Jews as well as Muslims, and his tomb there is still visited.',
      'English readers mostly meet him twice removed. Reynold Nicholson edited and translated the whole Masnavi across eight volumes between 1925 and 1940, and that remains the scholarly text; his Selected Poems from the Divani Shamsi Tabriz of 1898 is the earlier and shorter door. Most of the Rumi circulating in English today descends instead from versions made without the Persian, which is why the same couplet can appear in two forms that share almost no words.',
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
      'Those lines are the Bani Adam, and they say that the children of Adam are limbs of one body, made from one essence, so that when one limb is hurt the others cannot rest. They are quoted far more often than they are attributed, and they were written into a book of practical advice rather than a manifesto.',
      'The two books were built to be different from each other on purpose. The Bustan is how the world should go: generosity, justice, restraint, argued in verse across ten chapters. The Golestan is how it actually goes, told in short anecdotes about kings, beggars, teachers and frauds, each ending in a couplet. Read together they are a moral education that never once pretends people are better than they are.',
      'The travelling came first and it shaped both. By his own account he spent something like thirty years on the road, through Anatolia, Syria, Egypt and the Hijaz, in a century when the Mongol invasions were remaking everything behind him. The stories he tells are told as things witnessed, which is why the Golestan reads more like reportage than instruction.',
      'He is the earliest of the five in English. Francis Gladwin translated the Golestan in 1806, Edward Rehatsek in 1888, and both are public domain; Emerson read him and wrote a preface for an American edition. Ganjoor holds the Persian, and the app links every verse back to it.',
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
      'The calendar was the day job and it was extraordinary work. Commissioned by the Seljuk sultan Malik Shah and completed around 1079, the Jalali reckoning sets the year by the moment of the spring equinox as observed, so Norooz falls on the first day of spring by measurement rather than by rule. A version of it is still the civil calendar of Iran and Afghanistan today.',
      'The form he is remembered for is the rubai, a single quatrain rhyming on the first, second and fourth lines. It is a closed shape with room for one turn of thought, which suits an argument made and abandoned in four lines, and it is why his poems can be read in any order without loss.',
      'Which quatrains are actually his is genuinely unsettled. Verses accumulated under his name for centuries after his death, and the manuscripts disagree; estimates of the authentic core run from a few dozen to several hundred. This is a real scholarly problem rather than a cautious hedge, and it is the reason a Khayyam collection in one edition may barely overlap another.',
      'FitzGerald made him famous in English and also partly made him up, rearranging and combining until the sequence had an argument the Persian does not have. E. H. Whinfield published a closer, plainer rendering in 1883, and it is public domain. The app quotes the Persian and labels its English for exactly this reason.',
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
      'She grew up inside the material. Her father Yusef Etesami was a translator and editor who published the literary journal Bahar, so the house held books, visiting writers and a classical training most girls of her generation were never offered. She was writing publishable verse in her early teens and her father printed some of it.',
      'What the debate form lets her do is argue without preaching. Putting the case in the mouths of a needle and a thread, or a full jar and an empty one, means the poem can take a side on poverty, labour or the treatment of women while appearing to be about household objects. Persian readers have always understood that the objects are not the subject.',
      'She published one book. The Divan of 1935 collects the work, and a second expanded edition followed after her death; there is no late period, no change of direction, because she did not get one. She died of typhoid in 1941, aged thirty four, and is buried in Qom beside her father.',
      'She is the hardest of the five to read in English, and the reason is copyright rather than difficulty. The public domain collections that carry Hafez, Rumi, Saadi and Khayyam were made in the nineteenth century, decades before she wrote. Anything in English is modern and rights-bound, so her page here relies on the Persian, which Ganjoor holds in full.',
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

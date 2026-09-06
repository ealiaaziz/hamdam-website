// Pure release-note logic for the What's New pages. No DOM, no Astro imports,
// unit tested in isolation, the same shape as momentText.js.
//
// Everything here derives from src/data/releases.ts, which is generated from
// the App Store field itself. Nothing in this file knows a version number or a
// date: if it did, the site would have one more place to drift from the store,
// and this repository's own history says that is exactly what happens.

import { WHATS_NEW_UI } from '../data/whatsNewCopy';

const PERSIAN_ZERO = 0x06f0;
const ASCII_ZERO = 0x30;

/**
 * ASCII digits to Persian ones, mirroring the app's `persianNumeralsInString`.
 *
 * Built from code points rather than written out, so this file stays pure
 * ASCII: scripts/check-persian.mjs holds itself to the same rule for the same
 * reason, which is that an invisible character in a table of digits is
 * undetectable by reading.
 *
 * @param {string} text
 */
export function persianNumerals(text) {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    out += code >= ASCII_ZERO && code <= ASCII_ZERO + 9
      ? String.fromCharCode(PERSIAN_ZERO + (code - ASCII_ZERO))
      : ch;
  }
  return out;
}

/**
 * A release date, formatted for the locale.
 *
 * Same call as formatMomentDate: `fa-IR` resolves to the Persian calendar, so
 * a Farsi reader gets the Shamsi date and an English one gets the Gregorian.
 * Fixed to UTC because that is the timezone Apple reports
 * `currentVersionReleaseDate` in, and midday because a date rendered at
 * midnight can slide a day under any offset.
 *
 * @param {'en' | 'fa'} lang
 * @param {string} iso  `YYYY-MM-DD`
 */
export function formatReleaseDate(lang, iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(Date.UTC(year, month - 1, day, 12));
}

/**
 * "Version 1.3.2" / the Farsi equivalent with Persian numerals, which is the
 * form the app's own Settings row uses.
 *
 * @param {'en' | 'fa'} lang
 * @param {string} version
 */
export function versionLabel(lang, version) {
  const number = lang === 'fa' ? persianNumerals(version) : version;
  return `${WHATS_NEW_UI.version[lang]} ${number}`;
}

/**
 * The notes for a release in one language.
 *
 * @param {'en' | 'fa'} lang
 * @param {{ notesEn: readonly string[], notesFa: readonly string[] }} release
 */
export function notesFor(lang, release) {
  return lang === 'fa' ? release.notesFa : release.notesEn;
}

/**
 * The sentences of a release's notes, in order.
 *
 * A whole paragraph is often too long for a snippet while its first sentence
 * fits comfortably, so the description below appends at this granularity. That
 * is also what keeps the Persian rule: a sentence boundary in Ealia's own text
 * is a split, not an edit, which is the same call src/data/siteCopy.ts already
 * made when it took the Garden copy out of the 1.3 notes.
 *
 * @param {readonly string[]} paragraphs
 */
export function sentencesOf(paragraphs) {
  return paragraphs.flatMap((paragraph) =>
    paragraph.split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean),
  );
}

/**
 * The meta description, built from the release rather than written once and
 * left to go stale.
 *
 * It leads with the version and the date because that is the question this
 * page exists to answer, and because the moment pages already proved the point:
 * they sat at position 5.9 with no clicks until the date moved into the two
 * lines a searcher actually reads.
 *
 * Sentences are then appended whole while they fit, so the text is never cut
 * mid clause and never exceeds what Google will render. English reserves room
 * for a closing line carrying the head term; Farsi has no such line, because
 * writing one would mean authoring Persian, so the Farsi description is the
 * version label and Ealia's own sentences and nothing else.
 *
 * @param {'en' | 'fa'} lang
 * @param {{ version: string, iso: string, notesEn: readonly string[], notesFa: readonly string[] }} release
 * @param {number} limit  Characters. 160 for English, 200 for Farsi, matching
 *                        the limits metaDescription.test.js enforces on the build.
 */
export function releaseMetaDescription(lang, release, limit) {
  const opening = lang === 'fa'
    ? `${versionLabel('fa', release.version)}.`
    : `Hamdam ${release.version} arrived on ${formatReleaseDate('en', release.iso)}.`;
  const tail = lang === 'en' ? WHATS_NEW_UI.descriptionTail : null;
  const budget = tail ? limit - ([...tail].length + 1) : limit;

  let text = opening;
  for (const sentence of sentencesOf(notesFor(lang, release))) {
    const next = `${text} ${sentence}`;
    if ([...next].length > budget) break;
    text = next;
  }
  if (tail && [...`${text} ${tail}`].length <= limit) text = `${text} ${tail}`;
  return text;
}

/**
 * The `<title>`. English leads with the brand and the version, which is the
 * shape of the query ("hamdam 1.3.2", "what's new in hamdam"). Farsi joins two
 * approved strings and composes nothing.
 *
 * @param {'en' | 'fa'} lang
 * @param {{ version: string }} release
 */
export function releaseTitle(lang, release) {
  return lang === 'fa'
    ? `${WHATS_NEW_UI.title.fa}: ${versionLabel('fa', release.version)}`
    : `Hamdam ${release.version}: what's new in the latest update | Hamdam`;
}

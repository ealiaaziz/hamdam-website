// The App Store name of the app, which changes at version 1.4.
//
// Ealia, 2026-09-07: from 1.4 the listing is called "Hamdam: Reflection
// Companion" rather than "Hamdam: Daily Persian Poetry".
//
// The hard part is not the string, it is the timing. 1.4 is not released: the
// store reported 1.3.2 under the old name on both the AU and US storefronts on
// 2026-09-07, hours before this was written. This repository has a standing
// rule that the site must never publish something the App Store disagrees
// with, and the name is a worse thing to be wrong about than the version was,
// because it appears in the homepage <title>, in `alternateName` on the
// SoftwareApplication node, and in the anchor text of the one crawlable link
// this site gives an indexer for the listing. All three are places where a
// crawler compares what we say to what Apple's own page says.
//
// So the name is not a string that somebody flips on launch day. It is derived
// from the version the store itself reports, through the generated record in
// src/data/releases.ts that `scripts/extract-releases.mjs` writes and
// `npm run check:release` verifies against Apple. Ship 1.4, regenerate, and
// the name changes by itself across every surface. Nobody has to remember.
//
// The failure direction is deliberate. An unparseable or missing version
// resolves to the old name, not the new one: being briefly stale is a much
// cheaper error than announcing a name Apple has not applied yet.
//
// One thing this does NOT do automatically, and it is a loud failure rather
// than a silent one: `public/llms.txt` carries the canonical store URL as a
// literal, because it is a static file with no build step. A test asserts it
// matches APP_STORE_CANONICAL_URL, so the rename breaks `npm test` until that
// one line is updated by hand.

/** The name on the listing up to and including 1.3.2. */
export const LEGACY_APP_STORE_NAME = 'Hamdam: Daily Persian Poetry';

/** The name from 1.4 onward. */
export const RENAMED_APP_STORE_NAME = 'Hamdam: Reflection Companion';

/** The first version that carries the new name. */
export const RENAME_VERSION = '1.4';

/**
 * Compares two dotted version strings numerically, shorter side padded with
 * zeros, so "1.4" and "1.4.0" are equal and "1.3.2" is below both.
 *
 * Deliberately not a semver library. These are Apple marketing versions: one
 * to three numeric segments, nothing else, and the whole repository already
 * treats them as such. Returns null when either side is not that shape, which
 * every caller here reads as "do not act on this".
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number | null} negative, zero or positive, or null if unparseable.
 */
export function compareVersions(a, b) {
  const parse = (raw) => {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!/^\d+(\.\d+){0,2}$/.test(trimmed)) return null;
    return trimmed.split('.').map(Number);
  };
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** The first version that ships the Garden's games. */
export const GAMES_VERSION = '1.4';

/**
 * Whether the version the store reports actually carries the Garden's games.
 *
 * The same derivation as the name, for the same reason and with the same
 * failure direction, because the two are the same problem. The games do not
 * exist in the live build: `hamdam-ios` `origin/main` has no Chistan, no Hokm
 * and no `GamesPlayGate`, and the App Store reported 1.3.2 on both the AU and
 * US storefronts on 2026-09-08 while 1.4 sat in review. Copy that names the
 * games is therefore true of a build nobody can download yet.
 *
 * That is a worse error than a stale name. A stale name is a mismatch a
 * crawler notices; a feature claim is a promise to somebody who taps Get, and
 * the App Store's own guideline 2.3 is about exactly this. So the games copy
 * is gated on the shipping version rather than merged when it happens to be
 * written, which also means the whole 1.4 bundle, name and games together,
 * lands in one build the day Apple approves and cannot half-land.
 *
 * Unparseable or missing resolves to false: say less than the app does, never
 * more.
 *
 * @param {unknown} currentVersion Normally RELEASES[0].version.
 */
export function gamesShippedIn(currentVersion) {
  const comparison = compareVersions(currentVersion, GAMES_VERSION);
  return comparison !== null && comparison >= 0;
}

/**
 * The App Store name for a given shipping version.
 *
 * @param {unknown} currentVersion The version the store reports, normally
 *   RELEASES[0].version out of the generated record.
 */
export function appStoreNameFor(currentVersion) {
  const comparison = compareVersions(currentVersion, RENAME_VERSION);
  return comparison !== null && comparison >= 0 ? RENAMED_APP_STORE_NAME : LEGACY_APP_STORE_NAME;
}

/**
 * The homepage <title> for a given shipping version.
 *
 * A separate string rather than the name plus a suffix, because the two names
 * do not take the same suffix. The old title is "Hamdam: Daily Persian Poetry,
 * Reflection and Journal"; appending that same tail to the new name would read
 * "Hamdam: Reflection Companion, Reflection and Journal", which says
 * "reflection" twice and drops nothing in exchange.
 *
 * The 1.4 title keeps "Persian Poetry" for a reason worth stating, since it is
 * the one real cost of this rename: the old store name carried the site's
 * strongest search term inside the app name itself, on the homepage, for free.
 * The new name does not. `docs/seo/2026-09-05-content-check.md` and the
 * Search Console readings in `docs/seo/traffic-log.md` both show the Persian
 * poetry cluster is what this site actually ranks for, so the term moves into
 * the descriptive half of the title rather than being dropped.
 *
 * @param {unknown} currentVersion
 */
export function homepageTitleFor(currentVersion) {
  return appStoreNameFor(currentVersion) === RENAMED_APP_STORE_NAME
    ? 'Hamdam: Reflection Companion, Persian Poetry and Journal'
    : 'Hamdam: Daily Persian Poetry, Reflection and Journal';
}

/**
 * Apple's URL slug for a listing name.
 *
 * Verified against the live listing rather than assumed: on 2026-09-07 the
 * lookup API returned trackViewUrl `.../app/hamdam-daily-persian-poetry/...`
 * on both the AU and US storefronts, and this function reproduces that slug
 * byte for byte from the current name. A test pins that, so the derivation
 * cannot quietly start producing something else.
 *
 * The slug is decorative to Apple in any case: the bare id resolves, and a
 * deliberately wrong slug still returns 200. It is in the URL because it
 * carries the product name, which is the part an indexer reads, and that is
 * exactly why it has to follow the name rather than sit frozen at the old one.
 *
 * @param {string} name
 */
export function storeSlug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

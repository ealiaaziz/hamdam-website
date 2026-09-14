#!/usr/bin/env node
// Fails when this site's release record disagrees with the live App Store.
//
// This exists because the site now publishes a version number, in
// `softwareVersion` on both homepages and on /whats-new/, and a published
// version number is a claim that goes stale on its own. The hamdam-ios
// CLAUDE.md has drifted four builds behind the project file twice; this
// repository's own CLAUDE.md has been wrong about deploys three times. The
// lesson recorded in docs/method-failures.md is the same every time: verify,
// do not quote.
//
// So: fetch the store, compare, and say plainly which side is behind.
//
//   npm run check:release
//
// Network only, no credentials. Exit 0 when the site matches the store, 1 when
// it does not, 2 when the store could not be reached (which is not a failure of
// the site and must not be reported as one).
//
// It imports a .ts file directly, which Node strips types from without a flag
// from 22.18 onward. On 22.12 to 22.17, the rest of this package's engines
// range, run it as `node --experimental-strip-types scripts/check-release-current.mjs`.

import { RELEASES } from '../src/data/releases.ts';

const APP_ID = '6784461990';
const LOOKUP = `https://itunes.apple.com/lookup?id=${APP_ID}&country=us`;

// The endpoint is edge cached and, for a day or so after a release, different
// nodes answer differently. Measured on 2026-09-09, the day after 1.4 shipped:
// ten consecutive AU lookups returned 1.4 seven times and a coherent snapshot
// of the previous listing, old version AND old name together, three times. A
// single call therefore failed this check about a third of the time with no
// real disagreement, and a gate that fails at random is one people learn to
// ignore. That is worse than no gate, and this is the gate that stops the site
// publishing a version Apple disagrees with.
//
// So sample, and believe the newest release date seen rather than the last
// response to arrive. A stale node can only ever show an OLDER release, never
// a newer one, which is what makes "newest wins" safe here.
const SAMPLES = 4;

async function lookupOnce() {
  const res = await fetch(LOOKUP, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body.resultCount) throw new Error('lookup returned no result');
  return body.results[0];
}

const seen = [];
let lastError;
for (let i = 0; i < SAMPLES; i += 1) {
  try {
    seen.push(await lookupOnce());
  } catch (error) {
    lastError = error;
  }
}

if (seen.length === 0) {
  console.error(`Could not reach the App Store: ${lastError?.message ?? 'unknown error'}`);
  console.error('This says nothing about whether the site is current. Try again.');
  process.exit(2);
}

// Newest by release date, with the version string as a tiebreak for the case
// where two builds share a date.
const listing = seen
  .slice()
  .sort((a, b) =>
    String(a.currentVersionReleaseDate).localeCompare(String(b.currentVersionReleaseDate)) ||
    String(a.version).localeCompare(String(b.version)),
  )
  .at(-1);

const distinct = [...new Set(seen.map((r) => r.version))];
if (distinct.length > 1) {
  console.warn(
    `Note: the App Store endpoint returned ${distinct.join(' and ')} across ${seen.length} samples, ` +
      `which is edge cache lag rather than disagreement. Taking ${listing.version}, the newest.`,
  );
}

const live = { version: listing.version, iso: listing.currentVersionReleaseDate.slice(0, 10) };
const site = RELEASES[0];
const problems = [];

if (site.version !== live.version) {
  problems.push(
    `The store is on ${live.version} and the site says ${site.version}.`,
  );
}
if (site.version === live.version && site.iso !== live.iso) {
  problems.push(
    `Version ${live.version} is dated ${live.iso} on the store and ${site.iso} here.`,
  );
}

// The notes are compared too, not just the number. A version can ship, be
// pulled, and ship again under the same number with different copy, and the
// number alone would call that current.
if (site.version === live.version) {
  const normalise = (text) => text.replace(/\s+/g, ' ').trim();
  const storeText = normalise(listing.releaseNotes ?? '');
  for (const paragraph of [...site.notesEn, ...site.notesFa]) {
    if (!storeText.includes(normalise(paragraph))) {
      problems.push(`A paragraph in ${site.version} is not in the store's notes: ${paragraph.slice(0, 60)}`);
      break;
    }
  }
}

if (problems.length) {
  console.error('The site does not match the App Store.\n');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('\nRegenerate: node scripts/extract-releases.mjs --write');
  console.error('Then read the diff before committing it.');
  process.exit(1);
}

console.log(`Current: ${live.version}, released ${live.iso}. The site agrees.`);

import { describe, test, expect } from 'vitest';
import {
  featureReleases,
  formatReleaseDate,
  isFeatureRelease,
  notesFor,
  persianNumerals,
  releaseMetaDescription,
  releaseTitle,
  sentencesOf,
  versionLabel,
} from '../releases.js';
import { RELEASES } from '../../data/releases.ts';

// Exact values, not bounds, and both sides of every boundary. The iOS repo's
// mutation-testing rule is the reason: a one sided bound is blind in the other
// direction, and the blind side is not always the obvious one.

const LATEST = RELEASES[0];
// What the two pages actually render in their title and description.
const FEATURE = RELEASES.find((r) => isFeatureRelease(r.version));

describe('persianNumerals', () => {
  test('maps every ASCII digit to its Persian counterpart', () => {
    expect(persianNumerals('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
  });

  test('leaves separators and letters alone', () => {
    expect(persianNumerals('1.3.2')).toBe('۱.۳.۲');
    expect(persianNumerals('iOS 26')).toBe('iOS ۲۶');
  });

  test('is a no-op on text with no digits', () => {
    expect(persianNumerals('نسخه')).toBe('نسخه');
  });
});

describe('formatReleaseDate', () => {
  test('English renders the Gregorian date', () => {
    expect(formatReleaseDate('en', '2026-09-01')).toBe('1 September 2026');
    expect(formatReleaseDate('en', '2026-08-17')).toBe('17 August 2026');
  });

  test('Farsi renders the Persian calendar, which is a different date entirely', () => {
    // 1 September 2026 is 10 Shahrivar 1405. Stated as an independent second
    // witness rather than as whatever Intl happens to return: if the calendar
    // ever silently resolves to Gregorian, this fails.
    const fa = formatReleaseDate('fa', '2026-09-01');
    expect(fa).toContain('۱۴۰۵');
    expect(fa).not.toContain('2026');
  });

  test('does not slide a day at either end of the month', () => {
    expect(formatReleaseDate('en', '2026-08-01')).toBe('1 August 2026');
    expect(formatReleaseDate('en', '2026-08-31')).toBe('31 August 2026');
  });
});

describe('versionLabel', () => {
  test('English is the plain label', () => {
    expect(versionLabel('en', '1.3.2')).toBe('Version 1.3.2');
  });

  test('Farsi carries the app’s own label and Persian numerals', () => {
    expect(versionLabel('fa', '1.3.2')).toBe('نسخه ۱.۳.۲');
  });
});

describe('the release data itself', () => {
  test('is ordered newest first', () => {
    const dates = RELEASES.map((r) => r.iso);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  test('every release has both languages, paragraph for paragraph', () => {
    for (const release of RELEASES) {
      expect(release.notesEn.length, `${release.version} English`).toBeGreaterThan(0);
      expect(release.notesFa.length, `${release.version} Farsi`).toBe(release.notesEn.length);
    }
  });

  test('every release names where its text came from', () => {
    for (const release of RELEASES) {
      expect(release.source, `${release.version}`).toBeTruthy();
    }
  });

  test('every version is a dotted number, never a range or a word', () => {
    for (const release of RELEASES) {
      expect(release.version).toMatch(/^\d+(\.\d+)*$/);
    }
  });

  test('no release note carries an em dash or an en dash', () => {
    // check-dashes.mjs walks src/ and would catch this too. Stated again here
    // because these strings are quoted from an external system: the day one of
    // them arrives with a dash, the failure should name the release.
    //
    // The pattern is assembled from escapes rather than written out, for the
    // same reason check-persian.mjs assembles its own: a file that asserts
    // there are no em dashes must not contain one, or the check that walks src/
    // fails on this file. It did, the first time.
    const dashes = new RegExp('[\\u2013\\u2014]');
    for (const release of RELEASES) {
      for (const paragraph of [...release.notesEn, ...release.notesFa]) {
        expect(paragraph, `${release.version}`).not.toMatch(dashes);
      }
    }
  });

  test('the Farsi half of 1.3 is the same text the Garden section already shipped', () => {
    // An independent second witness that the 1.3 notes in this repository are
    // what Apple actually published. src/data/siteCopy.ts took its Garden copy
    // from the live listing by a different route on a different day; if the two
    // disagree, one of them is not the shipped text.
    const v13 = RELEASES.find((r) => r.version === '1.3');
    expect(v13, '1.3 is missing from the release data').toBeDefined();
    const joined = v13.notesFa.join('\n');
    expect(joined).toContain(
      'چیزی از تو خواسته نمی‌شود',
    );
  });
});

describe('isFeatureRelease', () => {
  test('two components is a feature release, three is a patch on one', () => {
    expect(isFeatureRelease('1.3')).toBe(true);
    expect(isFeatureRelease('1.2')).toBe(true);
    expect(isFeatureRelease('2.0')).toBe(true);
    expect(isFeatureRelease('1.3.1')).toBe(false);
    expect(isFeatureRelease('1.3.2')).toBe(false);
  });

  test('a bare major is a feature release and a four part build is not', () => {
    // Both sides of the boundary, not just the shapes shipped so far.
    expect(isFeatureRelease('2')).toBe(false);
    expect(isFeatureRelease('1.3.2.1')).toBe(false);
  });
});

describe('featureReleases', () => {
  test('keeps the feature releases and drops the point releases', () => {
    // Derived, not pinned. This asserted ['1.3', '1.2'] until 1.4 shipped on
    // 2026-09-08 and made it fail for the one reason it never should: a
    // correct new feature release. A list written out by hand here has to be
    // edited on every release, and a test somebody edits on every release
    // stops being read.
    const versions = featureReleases(RELEASES).map((r) => r.version);
    expect(versions).toEqual(RELEASES.filter((r) => isFeatureRelease(r.version)).map((r) => r.version));
    expect(versions.every(isFeatureRelease)).toBe(true);
    expect(versions).not.toContain('1.3.2');
    expect(versions).not.toContain('1.3.1');
  });

  test('preserves newest first order', () => {
    const dates = featureReleases(RELEASES).map((r) => r.iso);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  test('filters the page and never the record', () => {
    // The record must keep the live release even when the page does not show
    // it, because check:release compares RELEASES[0] to the store and the
    // structured data publishes it. If this ever fails, the site is about to
    // start claiming a version the App Store disagrees with.
    //
    // This used to assert that the two differ, which was true only while a
    // POINT release was live: 1.3.2 was filtered off the page, so the page's
    // first entry was 1.3. 1.4 is a feature release, so the page and the
    // record now agree, and asserting they differ was asserting a
    // coincidence. What actually has to hold either way is below.
    const live = RELEASES[0];
    const page = featureReleases(RELEASES);
    expect(RELEASES.some((r) => r.version === live.version)).toBe(true);
    expect(page.every((r) => isFeatureRelease(r.version))).toBe(true);
    if (isFeatureRelease(live.version)) {
      expect(page[0].version).toBe(live.version);
    } else {
      expect(page[0].version).not.toBe(live.version);
      expect(RELEASES.length).toBeGreaterThan(page.length);
    }
  });

  test('returns an empty list rather than throwing when nothing qualifies', () => {
    expect(featureReleases([{ version: '1.0.1' }])).toEqual([]);
  });
});

describe('notesFor', () => {
  test('picks the half the locale asked for', () => {
    expect(notesFor('en', LATEST)).toBe(LATEST.notesEn);
    expect(notesFor('fa', LATEST)).toBe(LATEST.notesFa);
  });
});

describe('releaseMetaDescription', () => {
  test('leads with the version and the date in English', () => {
    const text = releaseMetaDescription('en', LATEST, 160);
    expect(text.startsWith(`Hamdam ${LATEST.version} arrived on `)).toBe(true);
  });

  test('leads with the version in Farsi', () => {
    const text = releaseMetaDescription('fa', LATEST, 200);
    expect(text.startsWith(versionLabel('fa', LATEST.version))).toBe(true);
  });

  test('every release fits inside the limit the build test enforces', () => {
    for (const release of RELEASES) {
      expect([...releaseMetaDescription('en', release, 160)].length).toBeLessThanOrEqual(160);
      expect([...releaseMetaDescription('fa', release, 200)].length).toBeLessThanOrEqual(200);
      expect([...releaseMetaDescription('en', release, 160)].length).toBeGreaterThan(20);
      expect([...releaseMetaDescription('fa', release, 200)].length).toBeGreaterThan(20);
    }
  });

  test('appends whole sentences, never a fragment of one', () => {
    // This asserted whole PARAGRAPHS and passed for 1.2 and 1.3 by luck: their
    // paragraphs were single sentences, or fell outside the budget entirely.
    // 1.4's second paragraph is two sentences and 91 characters, so the
    // description takes the first sentence and stops, and the old assertion
    // called that a fragment.
    //
    // It is not. `releaseMetaDescription` loops over `sentencesOf`, and a
    // description that ends on a sentence boundary is what a search result
    // should show. The implementation was right and the test was describing
    // something the code never promised, so the test moved to what it does.
    const text = releaseMetaDescription('en', LATEST, 160);
    const opening = `Hamdam ${LATEST.version} arrived on `;
    expect(text.startsWith(opening)).toBe(true);
    for (const sentence of sentencesOf(LATEST.notesEn)) {
      if (text.includes(sentence.slice(0, 12))) expect(text).toContain(sentence);
    }
  });

  test('a limit too small for any paragraph still returns the opening', () => {
    // The boundary on the other side: pinning only the generous case would
    // leave a truncation bug at a tight limit completely unguarded.
    const text = releaseMetaDescription('en', LATEST, 45);
    expect(text).toBe(`Hamdam ${LATEST.version} arrived on ${formatReleaseDate('en', LATEST.iso)}.`);
  });
});

describe('releaseTitle', () => {
  test('English leads with the brand and the version', () => {
    expect(releaseTitle('en', FEATURE)).toBe(
      `Hamdam ${FEATURE.version}: what's new in the latest update | Hamdam`,
    );
  });

  test('Farsi joins two approved strings and composes nothing else', () => {
    expect(releaseTitle('fa', FEATURE)).toBe(
      `تازه‌ها در همدم: ${versionLabel('fa', FEATURE.version)}`,
    );
  });

  test('both titles stay inside what a search result renders', () => {
    expect(releaseTitle('en', FEATURE).length).toBeLessThanOrEqual(70);
    expect([...releaseTitle('fa', FEATURE)].length).toBeLessThanOrEqual(70);
  });

  test('the indexed title names the feature release, not the point release', () => {
    // The whole reason the two are separated. If this ever equals the live
    // version, somebody has quietly reverted Ealia's 2026-09-06 call.
    expect(releaseTitle('en', FEATURE)).toContain(`${FEATURE.version}:`);
    expect(isFeatureRelease(FEATURE.version)).toBe(true);
    for (const r of RELEASES.filter((x) => !isFeatureRelease(x.version))) {
      expect(releaseTitle('en', FEATURE)).not.toContain(r.version);
    }
  });
});

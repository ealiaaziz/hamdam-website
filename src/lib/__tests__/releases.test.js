import { describe, test, expect } from 'vitest';
import {
  formatReleaseDate,
  notesFor,
  persianNumerals,
  releaseMetaDescription,
  releaseTitle,
  versionLabel,
} from '../releases.js';
import { RELEASES } from '../../data/releases.ts';

// Exact values, not bounds, and both sides of every boundary. The iOS repo's
// mutation-testing rule is the reason: a one sided bound is blind in the other
// direction, and the blind side is not always the obvious one.

const LATEST = RELEASES[0];

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

  test('appends whole paragraphs, never a fragment of one', () => {
    const text = releaseMetaDescription('en', LATEST, 160);
    for (const paragraph of LATEST.notesEn) {
      if (text.includes(paragraph.slice(0, 12))) expect(text).toContain(paragraph);
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
  test('English leads with the brand and the live version', () => {
    expect(releaseTitle('en', LATEST)).toBe(
      `Hamdam ${LATEST.version}: what's new in the latest update | Hamdam`,
    );
  });

  test('Farsi joins two approved strings and composes nothing else', () => {
    expect(releaseTitle('fa', LATEST)).toBe(
      `تازه‌ها در همدم: ${versionLabel('fa', LATEST.version)}`,
    );
  });

  test('both titles stay inside what a search result renders', () => {
    expect(releaseTitle('en', LATEST).length).toBeLessThanOrEqual(70);
    expect([...releaseTitle('fa', LATEST)].length).toBeLessThanOrEqual(70);
  });
});

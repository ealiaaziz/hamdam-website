import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  LEGACY_APP_STORE_NAME,
  RENAMED_APP_STORE_NAME,
  RENAME_VERSION,
  appStoreNameFor,
  compareVersions,
  homepageTitleFor,
  storeSlug,
} from '../appName.js';
import { APP_STORE_CANONICAL_URL, APP_STORE_NAME, HOMEPAGE_TITLE_EN } from '../appStore.js';
import { RELEASES } from '../../data/releases.ts';

// The whole point of this module is that the site never publishes a name the
// App Store disagrees with. These tests are arranged around the two directions
// that can go wrong: naming 1.4 early, and failing to name it once it ships.

describe('compareVersions', () => {
  it('orders Apple marketing versions numerically, not as strings', () => {
    expect(compareVersions('1.4', '1.3.2')).toBeGreaterThan(0);
    expect(compareVersions('1.3.2', '1.4')).toBeLessThan(0);
    // The string comparison this replaces gets this one backwards, because
    // '1.10' sorts below '1.4' alphabetically.
    expect(compareVersions('1.10', '1.4')).toBeGreaterThan(0);
    expect(compareVersions('2.0', '1.999.999')).toBeGreaterThan(0);
  });

  it('pads the shorter side with zeros', () => {
    expect(compareVersions('1.4', '1.4.0')).toBe(0);
    expect(compareVersions('1.4.1', '1.4')).toBeGreaterThan(0);
  });

  it('returns null for anything that is not a dotted number', () => {
    for (const bad of ['', '1.4-beta', 'v1.4', '1.2.3.4', null, undefined, 1.4, {}]) {
      expect(compareVersions(bad, '1.4')).toBeNull();
      expect(compareVersions('1.4', bad)).toBeNull();
    }
  });
});

describe('appStoreNameFor', () => {
  it('keeps the old name for everything below 1.4', () => {
    for (const v of ['1.0', '1.1', '1.2', '1.3', '1.3.1', '1.3.2']) {
      expect(appStoreNameFor(v)).toBe(LEGACY_APP_STORE_NAME);
    }
  });

  it('uses the new name from 1.4 onward', () => {
    for (const v of ['1.4', '1.4.0', '1.4.1', '1.5', '2.0']) {
      expect(appStoreNameFor(v)).toBe(RENAMED_APP_STORE_NAME);
    }
  });

  it('falls back to the old name when the version is unreadable', () => {
    // Fail in the direction of being stale, never in the direction of
    // announcing a name Apple has not applied yet.
    for (const bad of [undefined, null, '', 'nightly', 1.4]) {
      expect(appStoreNameFor(bad)).toBe(LEGACY_APP_STORE_NAME);
    }
  });
});

describe('homepageTitleFor', () => {
  it('does not simply append the old tail to the new name', () => {
    const renamed = homepageTitleFor('1.4');
    expect(renamed).toContain(RENAMED_APP_STORE_NAME);
    // "Reflection Companion, Reflection and Journal" would say it twice.
    expect(renamed.toLowerCase().match(/reflection/g)).toHaveLength(1);
  });

  it('keeps the Persian poetry term, which the new store name drops', () => {
    expect(homepageTitleFor('1.4')).toContain('Persian Poetry');
    expect(homepageTitleFor('1.3.2')).toContain('Persian Poetry');
  });
});

describe('storeSlug', () => {
  it('reproduces the slug Apple actually serves for the current name', () => {
    // Verified 2026-09-07 against itunes.apple.com/lookup: trackViewUrl on
    // both the AU and US storefronts carries this slug.
    expect(storeSlug(LEGACY_APP_STORE_NAME)).toBe('hamdam-daily-persian-poetry');
  });

  it('slugifies the 1.4 name', () => {
    expect(storeSlug(RENAMED_APP_STORE_NAME)).toBe('hamdam-reflection-companion');
  });

  it('collapses punctuation runs and never leaves a leading or trailing dash', () => {
    expect(storeSlug('Hamdam:   Reflection & Companion!')).toBe('hamdam-reflection-companion');
  });
});

describe('what the site publishes today', () => {
  // Pins the live state rather than the logic. 1.4 is unreleased, so every one
  // of these must still read as it did before this module existed. When 1.4
  // ships and releases.ts is regenerated, these flip together and this block
  // is the record of what changed.
  const shipped = RELEASES[0].version;

  it('tracks the version in the generated record', () => {
    expect(APP_STORE_NAME).toBe(appStoreNameFor(shipped));
    expect(HOMEPAGE_TITLE_EN).toBe(homepageTitleFor(shipped));
  });

  it('builds the canonical store URL from whichever name is active', () => {
    expect(APP_STORE_CANONICAL_URL).toBe(
      `https://apps.apple.com/app/${storeSlug(APP_STORE_NAME)}/id6784461990`
    );
  });

  it('has not started publishing the 1.4 name early', () => {
    if (compareVersions(shipped, RENAME_VERSION) < 0) {
      expect(APP_STORE_NAME).toBe(LEGACY_APP_STORE_NAME);
      expect(APP_STORE_CANONICAL_URL).toContain('hamdam-daily-persian-poetry');
    } else {
      expect(APP_STORE_NAME).toBe(RENAMED_APP_STORE_NAME);
    }
  });
});

describe('public/llms.txt', () => {
  // The one surface that cannot derive the name: a static file with no build
  // step. This test is the alarm, and it is meant to fail on the day 1.4 is
  // regenerated, so the rename cannot half-land.
  it('carries the same canonical store URL the rest of the site does', () => {
    const llms = readFileSync(new URL('../../../public/llms.txt', import.meta.url), 'utf8');
    expect(llms).toContain(APP_STORE_CANONICAL_URL);
  });
});

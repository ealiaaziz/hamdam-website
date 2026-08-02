import { describe, expect, it } from 'vitest';
import { DEFAULT_ALLOWED_COUNTRIES, isAllowedCountry, parseAllowedCountries } from '../src/geo.js';

// The portal is the only unauthenticated, internet-facing part of this
// system. These tests are the second lock: the WAF rule at the edge is the
// first, and it is one dashboard click from being deleted by someone tidying
// up, with no visible symptom.

describe('parseAllowedCountries', () => {
  it('reads a configured list', () => {
    expect(parseAllowedCountries('AU,NZ')).toEqual(['AU', 'NZ']);
    expect(parseAllowedCountries(' au , nz , gb ')).toEqual(['AU', 'NZ', 'GB']);
  });

  it('falls back to the default rather than to serving everyone', () => {
    // A typo in a config string must not quietly open the site to the world.
    for (const value of [undefined, '', '   ', ',,,', 'not-a-country', 'AUS']) {
      expect(parseAllowedCountries(value), JSON.stringify(value)).toEqual([...DEFAULT_ALLOWED_COUNTRIES]);
    }
  });

  it('drops junk without dropping the valid entries beside it', () => {
    expect(parseAllowedCountries('AU,rubbish,NZ')).toEqual(['AU', 'NZ']);
  });
});

describe('isAllowedCountry', () => {
  const allowed = ['AU', 'NZ'];

  it('serves the countries Hamdam is sold in', () => {
    expect(isAllowedCountry('AU', allowed)).toBe(true);
    expect(isAllowedCountry('NZ', allowed)).toBe(true);
    expect(isAllowedCountry('au', allowed)).toBe(true);
  });

  it('refuses everywhere else', () => {
    for (const country of ['US', 'GB', 'CN', 'RU', 'IR', 'SG']) {
      expect(isAllowedCountry(country, allowed), country).toBe(false);
    }
  });

  it('refuses when the origin cannot be determined', () => {
    // Cloudflare reports XX when it cannot place an address and T1 for Tor.
    // Treating "we do not know" as "probably fine" makes the rule
    // decorative, and that traffic is the reason the rule exists.
    for (const country of [undefined, null, '', 'XX', 'T1']) {
      expect(isAllowedCountry(country, allowed), String(country)).toBe(false);
    }
  });

  it('honours a widened list without a code change', () => {
    expect(isAllowedCountry('GB', ['AU', 'NZ', 'GB'])).toBe(true);
  });
});

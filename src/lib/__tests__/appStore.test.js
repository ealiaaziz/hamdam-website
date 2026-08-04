import { describe, it, expect } from 'vitest';
import {
  APP_STORE,
  appStoreUrl,
  campaignParamsFromSearch,
  normalizeProviderToken,
  ASC_PROVIDER_TOKEN,
} from '../appStore.js';

describe('APP_STORE', () => {
  it('is frozen with the numeric App Store ID', () => {
    expect(Object.isFrozen(APP_STORE)).toBe(true);
    expect(APP_STORE.ID).toBe('6784461990');
  });
});

describe('appStoreUrl', () => {
  it('builds the AU storefront URL', () => {
    expect(appStoreUrl()).toBe('https://apps.apple.com/au/app/id6784461990');
    expect(appStoreUrl('en')).toBe('https://apps.apple.com/au/app/id6784461990');
  });

  it('appends the Farsi locale hint for FA pages (no Iran storefront invented)', () => {
    expect(appStoreUrl('fa')).toBe('https://apps.apple.com/au/app/id6784461990?l=fa');
  });

  it('appends a real provider token as pt, alongside ct and the locale hint', () => {
    const url = appStoreUrl('fa', { ct: 'newsletter', pt: '123456789' });
    expect(url).toBe('https://apps.apple.com/au/app/id6784461990?l=fa&ct=newsletter&pt=123456789');
  });

  it('omits pt entirely when no provider token is configured, keeping ct', () => {
    expect(appStoreUrl('en', { ct: 'newsletter', pt: null })).toBe(
      'https://apps.apple.com/au/app/id6784461990?ct=newsletter'
    );
    expect(appStoreUrl('en', null, 'hero')).toBe(
      'https://apps.apple.com/au/app/id6784461990?ct=web-hero'
    );
  });

  // The regression this file exists for: the placeholder used to be the
  // token, so every link on the site shipped pt=%5BASC_PROVIDER_TOKEN%5D.
  it('never emits a placeholder-shaped pt on any built URL', () => {
    const urls = ['en', 'fa'].flatMap((lang) =>
      ['hero', 'nav', 'pricing', 'sticky'].map((placement) => appStoreUrl(lang, null, placement))
    );
    for (const url of urls) {
      expect(url).not.toContain('ASC_PROVIDER_TOKEN');
      expect(url).not.toMatch(/%5B|%5D|\[|\]/);
    }
  });

  it('omits campaign params entirely when none are passed (unchanged default)', () => {
    expect(appStoreUrl('en', null)).toBe('https://apps.apple.com/au/app/id6784461990');
  });
});

describe('normalizeProviderToken', () => {
  it('accepts a real ASC token', () => {
    expect(normalizeProviderToken('123456789')).toBe('123456789');
    expect(normalizeProviderToken('  123456789  ')).toBe('123456789');
  });

  it('rejects placeholders, blanks and anything not URL-safe', () => {
    for (const bad of ['[ASC_PROVIDER_TOKEN]', '', '   ', 'your token here', undefined, null, 42]) {
      expect(normalizeProviderToken(bad)).toBeNull();
    }
  });
});

describe('ASC_PROVIDER_TOKEN', () => {
  it('is a usable token or null, never a placeholder', () => {
    expect(ASC_PROVIDER_TOKEN === null || normalizeProviderToken(ASC_PROVIDER_TOKEN)).toBeTruthy();
  });
});

describe('campaignParamsFromSearch', () => {
  it('maps utm_campaign to ct', () => {
    const params = campaignParamsFromSearch(new URLSearchParams('utm_campaign=newsletter'));
    expect(params).toEqual({ ct: 'newsletter', pt: ASC_PROVIDER_TOKEN });
  });

  it('falls back to "website" when utm_campaign is absent', () => {
    const params = campaignParamsFromSearch(new URLSearchParams(''));
    expect(params.ct).toBe('website');
  });

  it('falls back to "website" when searchParams itself is null/undefined', () => {
    expect(campaignParamsFromSearch(null).ct).toBe('website');
    expect(campaignParamsFromSearch(undefined).ct).toBe('website');
  });
});

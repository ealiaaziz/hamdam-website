import { describe, it, expect } from 'vitest';
import { APP_STORE, appStoreUrl, campaignParamsFromSearch, ASC_PROVIDER_TOKEN } from '../appStore.js';

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

  it('appends ct/pt campaign params when given, alongside the locale hint', () => {
    const url = appStoreUrl('fa', { ct: 'newsletter', pt: ASC_PROVIDER_TOKEN });
    expect(url).toBe(
      `https://apps.apple.com/au/app/id6784461990?l=fa&ct=newsletter&pt=${encodeURIComponent(ASC_PROVIDER_TOKEN)}`
    );
  });

  it('omits campaign params entirely when none are passed (unchanged default)', () => {
    expect(appStoreUrl('en', null)).toBe('https://apps.apple.com/au/app/id6784461990');
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

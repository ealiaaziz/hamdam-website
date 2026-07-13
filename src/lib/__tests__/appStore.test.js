import { describe, it, expect } from 'vitest';
import { APP_STORE, appStoreUrl } from '../appStore.js';

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
});

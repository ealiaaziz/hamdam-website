import { describe, it, expect } from 'vitest';
import {
  homepageSchema,
  organizationSchema,
  FEATURE_LIST,
  ORGANIZATION_ID,
  APPLICATION_ID,
} from '../schema.js';
import { APP_STORE } from '../appStore.js';

const build = (overrides = {}) =>
  homepageSchema({
    lang: 'en',
    name: 'Hamdam',
    description: 'A daily verse and a reflection.',
    url: 'https://hamdam.com.au/',
    downloadUrl: 'https://apps.apple.com/au/app/id6784461990?ct=web-schema',
    screenshots: ['https://hamdam.com.au/_astro/01-hero-en.png'],
    ...overrides,
  });

const appNode = (schema) => schema['@graph'].find((node) => node['@type'] === 'SoftwareApplication');

describe('homepageSchema', () => {
  it('emits a graph of the application plus the shared organization', () => {
    const schema = build();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@graph'].map((node) => node['@type'])).toEqual([
      'SoftwareApplication',
      'Organization',
    ]);
    expect(appNode(schema)['@id']).toBe(APPLICATION_ID);
    expect(organizationSchema['@id']).toBe(ORGANIZATION_ID);
  });

  it('references the organization by @id rather than repeating it', () => {
    expect(appNode(build()).publisher).toEqual({ '@id': ORGANIZATION_ID });
  });

  it('carries the locale-specific fields it is handed', () => {
    const fa = build({ lang: 'fa', name: 'همدم', url: 'https://hamdam.com.au/fa/' });
    const node = appNode(fa);
    expect(node.name).toBe('همدم');
    expect(node.url).toBe('https://hamdam.com.au/fa/');
    expect(node.inLanguage).toEqual(['fa', 'en']);
    expect(appNode(build()).inLanguage).toEqual(['en', 'fa']);
  });

  it('omits screenshot entirely rather than publishing an empty array', () => {
    expect(appNode(build({ screenshots: [] }))).not.toHaveProperty('screenshot');
    expect(appNode(build()).screenshot).toHaveLength(1);
  });
});

// The reason this file exists. Both homepages published `iOS 26+` while
// FACTS.md still recorded the deployment target as an unresolved defect, so
// the number was published before anyone stood behind it. It was cut to the
// unversioned 'iOS' on 2026-08-07, then set to the real floor the same day
// once Ealia confirmed the minimum genuinely is 26.5.
//
// The assertion is pinned to the exact string rather than a pattern, because
// the failure this guards is a plausible-looking wrong number, not a malformed
// one. '26+', '26.5', '17.0' and 'iOS' would all pass a loose regex and all
// misstate what the app requires. Change it here only after FACTS.md changes.
describe('operatingSystem', () => {
  it('states the verified minimum exactly', () => {
    expect(appNode(build()).operatingSystem).toBe('iOS 26.5+');
  });

  it('is identical on both locales, since a device floor is not localised', () => {
    const fa = build({ lang: 'fa', name: 'همدم', url: 'https://hamdam.com.au/fa/' });
    expect(appNode(fa).operatingSystem).toBe(appNode(build()).operatingSystem);
  });

  it('never reverts to the unverified 26+ or the abandoned 17.0', () => {
    const os = appNode(build()).operatingSystem;
    expect(os).not.toBe('iOS 26+');
    expect(os).not.toMatch(/\b17(\.0)?\b/);
  });
});

// FACTS.md marks ratings, review counts and download numbers UNVERIFIED, and
// marks every claim about translation quality or provenance CONTESTED with a
// hard block. Neither may reach structured data, where it would be both a
// fabricated claim and a Google structured-data violation.
describe('claim discipline', () => {
  it('publishes no rating, review count or download count', () => {
    const serialised = JSON.stringify(build());
    for (const banned of ['aggregateRating', 'ratingValue', 'ratingCount', 'reviewCount',
      'interactionCount', 'downloadCount', 'award']) {
      expect(serialised).not.toContain(banned);
    }
  });

  it('makes no claim about translation quality or provenance', () => {
    const serialised = JSON.stringify(build()).toLowerCase();
    for (const banned of ['translat', 'scholar', 'authoritative', 'faithful']) {
      expect(serialised).not.toContain(banned);
    }
  });

  it('publishes no paid-tier price', () => {
    const offers = appNode(build()).offers;
    expect(offers.price).toBe('0');
    expect(JSON.stringify(build())).not.toMatch(/\$|AUD\s*\d*\.\d/);
  });
});

describe('FEATURE_LIST', () => {
  it('is frozen, non-empty, and free of contested claims', () => {
    expect(Object.isFrozen(FEATURE_LIST)).toBe(true);
    expect(FEATURE_LIST.length).toBeGreaterThan(0);
    for (const feature of FEATURE_LIST) {
      expect(feature.toLowerCase()).not.toContain('translat');
    }
  });

  it('is copied into the node, so a caller cannot mutate the shared list', () => {
    const node = appNode(build());
    node.featureList.push('invented');
    expect(FEATURE_LIST).not.toContain('invented');
  });
});

describe('organizationSchema', () => {
  it('carries a logo and contact, and asserts no unverified social profiles', () => {
    expect(organizationSchema.logo.url).toBe('https://hamdam.com.au/icons/icon-512.png');
    expect(organizationSchema.email).toBe('developer@hamdam.com.au');
    expect(organizationSchema).not.toHaveProperty('sameAs');
  });
});

// Added 2026-08-07 with the visible requirement line under the store badge.
// The floor now has two consumers, the structured data and that line, and two
// hand-maintained copies of one number is exactly how both homepages came to
// publish an unverified `iOS 26+`. This binds them to APP_STORE.MINIMUM_IOS.
describe('the iOS floor has one source', () => {
  it('derives operatingSystem from APP_STORE.MINIMUM_IOS', () => {
    expect(appNode(build()).operatingSystem).toBe(`iOS ${APP_STORE.MINIMUM_IOS}+`);
  });

  it('keeps MINIMUM_IOS a bare version, not a prefixed or suffixed string', () => {
    // The consumers add "iOS " and "+"; if the constant carried them too the
    // rendered result would read "iOS iOS 26.5++" and still typecheck.
    expect(APP_STORE.MINIMUM_IOS).toMatch(/^\d+(\.\d+)*$/);
  });
});

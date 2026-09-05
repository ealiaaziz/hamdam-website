import { describe, it, expect } from 'vitest';
import {
  homepageSchema,
  poetPageSchema,
  momentPageSchema,
  organizationSchema,
  websiteSchema,
  FEATURE_LIST,
  ORGANIZATION_ID,
  APPLICATION_ID,
  WEBSITE_ID,
} from '../schema.js';
import { APP_STORE, APP_STORE_CANONICAL_URL, appStoreUrl } from '../appStore.js';

const build = (overrides = {}) =>
  homepageSchema({
    lang: 'en',
    name: 'Hamdam',
    description: 'A daily verse and a reflection.',
    url: 'https://hamdam.com.au/',
    downloadUrl: 'https://apps.apple.com/au/app/id6784461990?ct=web-schema',
    screenshots: ['https://hamdam.com.au/_astro/01-today-en.png'],
    ...overrides,
  });

const appNode = (schema) => schema['@graph'].find((node) => node['@type'] === 'SoftwareApplication');

describe('homepageSchema', () => {
  it('emits a graph of the application plus the shared organization and website', () => {
    const schema = build();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@graph'].map((node) => node['@type'])).toEqual([
      'SoftwareApplication',
      'Organization',
      'WebSite',
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

  // Added 2026-08-16 with the canonical store link. The listing was not
  // appearing in search indexes while competitor listings were, and one
  // contributing cause was that every reference to it on this site was a
  // storefront-pinned, ct-tagged CTA. `sameAs` is the field that tells a
  // search engine this app and that listing are one entity, so it has to be
  // the clean URL and it has to match the crawlable footer link exactly.
  it('names the App Store listing as the same entity, via the clean URL', () => {
    expect(appNode(build()).sameAs).toEqual([APP_STORE_CANONICAL_URL]);
  });

  // The three properties an application node is judged on. `author` was
  // simply missing until 2026-08-16; the other two were already right and are
  // pinned here so they stay that way.
  it('carries author, applicationCategory and operatingSystem', () => {
    const node = appNode(build());
    expect(node.author).toEqual({ '@type': 'Person', name: 'Seyed Valiallah Azizollahi' });
    expect(node.applicationCategory).toBe('LifestyleApplication');
    expect(node.operatingSystem).toBe(`iOS ${APP_STORE.MINIMUM_IOS}+, iPadOS ${APP_STORE.MINIMUM_IOS}+`);
  });

  // `url` is this site's page for the app and must not be quietly repointed
  // at the App Store: the two fields answer different questions, and losing
  // the homepage here would drop the only link between the entity and the
  // site that publishes it.
  it('keeps url pointing at the homepage, not the store', () => {
    expect(appNode(build()).url).toBe('https://hamdam.com.au/');
  });
});

// The canonical store URL, asserted on its own because three things now
// depend on it being exactly this string: the footer anchor, the application
// node's `sameAs` and the organization's. A `ct`, a `?l=fa` or a reinstated
// `/au/` segment here would silently undo the reason it was added.
describe('APP_STORE_CANONICAL_URL', () => {
  it('carries no query string and no storefront segment', () => {
    expect(APP_STORE_CANONICAL_URL).toBe(
      'https://apps.apple.com/app/hamdam-daily-persian-poetry/id6784461990'
    );
    expect(APP_STORE_CANONICAL_URL).not.toContain('?');
    expect(APP_STORE_CANONICAL_URL).not.toMatch(/apps\.apple\.com\/[a-z]{2}\//);
  });

  it('is a different URL from every CTA the site builds', () => {
    expect(APP_STORE_CANONICAL_URL).not.toBe(appStoreUrl('en', null, 'footer'));
    expect(appStoreUrl('en', null, 'footer')).toContain('ct=web-footer');
  });
});

// The reason this file exists. Both homepages published `iOS 26+` while
// FACTS.md still recorded the deployment target as an unresolved defect, so
// the number was published before anyone stood behind it. It was cut to the
// unversioned 'iOS' on 2026-08-07, then set to the real floor the same day
// once Ealia confirmed the minimum genuinely was 26.5.
//
// It reads `iOS 26+` again as of 2026-08-15, and this is the one place where
// that could be mistaken for the original defect coming back, so: it is not.
// 26.5 was the floor of version 1.1.1. Version 1.2 is live and ships
// `IPHONEOS_DEPLOYMENT_TARGET = 26.0`, read from the project file on
// 2026-08-13 and confirmed live by Ealia on 2026-08-15. Same characters,
// different provenance -- the first was inherited from a suspected build
// mistake and unchecked, this one is the shipping build's own target. FACTS.md
// has the full trail.
//
// The assertion stays pinned to the exact string rather than a pattern,
// because the failure it guards is a plausible-looking wrong number, not a
// malformed one. '26.5', '17.0' and 'iOS' would all pass a loose regex and all
// misstate what the app requires. Change it here only after FACTS.md changes.
//
// iPadOS joined the string 2026-08-28, after FACTS.md changed, which is the
// order this comment asks for. The floor is one number for both: the listing
// states "Requires iOS 26.0" and "iPadOS 26.0 or later" separately and they
// agree. The number did not move, and a diff that shows it moving is a defect.
describe('operatingSystem', () => {
  it('states the verified minimum exactly', () => {
    expect(appNode(build()).operatingSystem).toBe('iOS 26+, iPadOS 26+');
  });

  it('is identical on both locales, since a device floor is not localised', () => {
    const fa = build({ lang: 'fa', name: 'همدم', url: 'https://hamdam.com.au/fa/' });
    expect(appNode(fa).operatingSystem).toBe(appNode(build()).operatingSystem);
  });

  // This assertion used to read `expect(os).not.toBe('iOS 26+')`, written when
  // 26+ was the unverified number and never publishing it again was the whole
  // point. 26+ is now the verified floor of the shipping build, so that
  // assertion had to go -- but only that half of it. What it was really
  // guarding is still worth guarding: 17.0 was an abandoned assumption that
  // was never anyone's real target, and the bare unversioned 'iOS' was a
  // deliberate placeholder for the window when nobody knew the answer. Neither
  // should ever reappear, and both would look plausible in a diff.
  it('never reverts to the abandoned 17.0 or the unversioned placeholder', () => {
    const os = appNode(build()).operatingSystem;
    expect(os).not.toMatch(/\b17(\.0)?\b/);
    expect(os).not.toBe('iOS');
    expect(os).toMatch(/^iOS \d+(\.\d+)*\+, iPadOS \d+(\.\d+)*\+$/);
  });

  // The two halves are one floor read twice, so they cannot be allowed to
  // drift apart silently: a diff that bumped iOS and forgot iPadOS would still
  // match the shape above and would still look deliberate.
  it('states the same floor for both operating systems', () => {
    const os = appNode(build()).operatingSystem;
    const [ios, ipados] = os.split(', ');
    expect(ios.replace('iOS ', '')).toBe(ipados.replace('iPadOS ', ''));
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
  it('carries a logo and contact', () => {
    expect(organizationSchema.logo.url).toBe('https://hamdam.com.au/icons/icon-512.png');
    expect(organizationSchema.email).toBe('developer@hamdam.com.au');
  });

  // Until 2026-08-13 this asserted `not.toHaveProperty('sameAs')`, which was
  // the right test while no social URL was recorded anywhere in the repo. The
  // three below are confirmed, so the assertion inverts: the profiles are
  // named, and the test's job becomes stopping an unverified fourth.
  it('lists exactly the three confirmed profiles', () => {
    expect(organizationSchema.sameAs).toEqual([
      'https://www.instagram.com/hamdam_au/',
      'https://x.com/Hamdam_au',
      'https://apps.apple.com/app/hamdam-daily-persian-poetry/id6784461990',
    ]);
  });

  // LinkedIn is deliberately absent: whether a company page exists is
  // unresolved, and a 403 on organisation ACLs does not distinguish "no page"
  // from "no permission". This fails if someone adds a guessed URL, which is
  // the same failure the old assertion existed to prevent.
  it('claims no profile that has not been confirmed', () => {
    for (const url of organizationSchema.sameAs) {
      expect(url).toMatch(/^https:\/\/(www\.instagram\.com|x\.com|apps\.apple\.com)\//);
    }
  });

  it('cannot be mutated by a caller', () => {
    expect(() => {
      organizationSchema.sameAs.push('https://www.linkedin.com/company/invented');
    }).toThrow();
    expect(organizationSchema.sameAs).toHaveLength(3);
  });
});

// Added 2026-08-07 with the visible requirement line under the store badge.
// The floor now has two consumers, the structured data and that line, and two
// hand-maintained copies of one number is exactly how both homepages came to
// publish an unverified `iOS 26+`. This binds them to APP_STORE.MINIMUM_IOS.
describe('the iOS floor has one source', () => {
  it('derives operatingSystem from APP_STORE.MINIMUM_IOS', () => {
    expect(appNode(build()).operatingSystem).toBe(`iOS ${APP_STORE.MINIMUM_IOS}+, iPadOS ${APP_STORE.MINIMUM_IOS}+`);
  });

  it('keeps MINIMUM_IOS a bare version, not a prefixed or suffixed string', () => {
    // The consumers add "iOS " and "+"; if the constant carried them too the
    // rendered result would read "iOS iOS 26++" and still typecheck.
    expect(APP_STORE.MINIMUM_IOS).toMatch(/^\d+(\.\d+)*$/);
  });
});

// Added 2026-08-28 with the iPad claim. FACTS.md's platform entry said for a
// fortnight that the project had no iPad target, which was wrong, and the site
// said iPhone on the strength of it. Pinned here so the correction cannot be
// undone by a tidy-up that reads 'iPhone' as the safer value.
describe('availableOnDevice', () => {
  it('names both devices the app installs on', () => {
    expect(appNode(build()).availableOnDevice).toEqual(['iPhone', 'iPad']);
  });

  it('is the same on both locales, since a device list is not localised', () => {
    const fa = build({ lang: 'fa', name: 'همدم', url: 'https://hamdam.com.au/fa/' });
    expect(appNode(fa).availableOnDevice).toEqual(appNode(build()).availableOnDevice);
  });

  // The watch app ships embedded in the iPhone app rather than as its own
  // install, so it belongs in the prose and the featureList, not here. Listed
  // as an assertion because "add Apple Watch too" is the obvious-looking edit.
  it('does not list Apple Watch, which is a companion and not an install', () => {
    expect(appNode(build()).availableOnDevice).not.toContain('Apple Watch');
  });
});

// Added 2026-09-05 with the WebSite node. Every non-homepage page used to set
// isPartOf to APPLICATION_ID, so each poet and moment page claimed to be part
// of the iOS app rather than part of this website. SoftwareApplication is a
// CreativeWork subtype, so nothing errored and nothing surfaced; it was simply
// the wrong entity, and there was no node anywhere tying the 24 URLs together
// as one site. Pinned because "isPartOf the app" reads plausibly in a diff.
describe('page nodes belong to the website, not the app', () => {
  const poet = (lang = 'en') => poetPageSchema({
    lang,
    name: lang === 'fa' ? 'حافظ' : 'Hafez',
    alternateName: lang === 'fa' ? 'Hafez' : 'حافظ',
    description: 'A poet.',
    url: `https://hamdam.com.au/${lang === 'fa' ? 'fa/' : ''}poets/hafez/`,
    breadcrumbHome: 'Hamdam',
    homeUrl: 'https://hamdam.com.au/',
    sameAs: 'https://ganjoor.net/hafez',
    slug: 'hafez',
  });
  const moment = () => momentPageSchema({
    lang: 'en',
    name: 'Yalda',
    description: 'The longest night.',
    url: 'https://hamdam.com.au/moments/yalda/',
    breadcrumbHome: 'Hamdam',
    homeUrl: 'https://hamdam.com.au/',
  });
  const pageNode = (schema) => schema['@graph'].find((n) => n['@type'] === 'WebPage');

  it('points isPartOf at the website on poet and moment pages', () => {
    expect(pageNode(poet()).isPartOf).toEqual({ '@id': WEBSITE_ID });
    expect(pageNode(moment()).isPartOf).toEqual({ '@id': WEBSITE_ID });
  });

  it('never points isPartOf at the application node again', () => {
    for (const schema of [poet(), poet('fa'), moment()]) {
      expect(JSON.stringify(pageNode(schema).isPartOf)).not.toContain(APPLICATION_ID);
    }
  });

  it('carries the website node those @id references resolve to', () => {
    for (const schema of [poet(), moment()]) {
      expect(schema['@graph'].some((n) => n['@id'] === WEBSITE_ID)).toBe(true);
    }
  });

  // The website is about the app; that relationship moved here rather than
  // being lost when isPartOf was corrected.
  it('keeps the app as what the website is about', () => {
    expect(websiteSchema.about).toEqual({ '@id': APPLICATION_ID });
  });

  // Hafez and حافظ are one person. Before the shared @id they were two
  // anonymous Person nodes that merely happened to carry the same sameAs.
  it('gives each poet one @id shared by both locales', () => {
    const en = poet()['@graph'][0].about;
    const fa = poet('fa')['@graph'][0].about;
    expect(en['@id']).toBe('https://hamdam.com.au/#poet-hafez');
    expect(fa['@id']).toBe(en['@id']);
    expect(en.name).not.toBe(fa.name);
  });

  // The searchbox needs a real endpoint. This site has none, so publishing a
  // SearchAction would describe a feature that is not there.
  it('publishes no SearchAction, since the site has no search', () => {
    expect(JSON.stringify(websiteSchema)).not.toContain('SearchAction');
  });
});

// Added 2026-08-22. Four live pages carried '@type': 'PrivacyPolicy' and
// 'TermsAndConditions', neither of which is a schema.org type. Both resolve
// 404 on schema.org, the same as a nonsense string, and neither is in the
// pending vocabulary. An unrecognised @type raises nothing and shows nothing:
// consumers simply ignore the entity, so those pages published structured data
// that did no work at all for weeks.
//
// This locks the vocabulary rather than the pages, so a new page inventing a
// plausible-sounding type fails here instead of shipping. The list is types
// verified to resolve on schema.org, and it is deliberately small: adding an
// entry means checking https://schema.org/<Type> returns 200 first, not
// guessing that a name sounds official.
describe('structured data uses real schema.org types', () => {
  const VERIFIED = new Set([
    'AggregateRating', 'Article', 'BreadcrumbList', 'ContactPoint',
    'CreativeWork', 'DigitalDocument', 'ImageObject', 'ItemList',
    'ListItem', 'Offer', 'Organization', 'Person', 'PostalAddress',
    'SoftwareApplication', 'WebPage', 'WebSite',
  ]);

  const typesIn = (node, found = []) => {
    if (Array.isArray(node)) {
      node.forEach((n) => typesIn(n, found));
    } else if (node && typeof node === 'object') {
      if (typeof node['@type'] === 'string') found.push(node['@type']);
      Object.values(node).forEach((v) => typesIn(v, found));
    }
    return found;
  };

  const pages = import.meta.glob('../../pages/**/*.astro', {
    eager: true,
    query: '?raw',
    import: 'default',
  });

  // Without this, the check below passes vacuously if the glob ever resolves
  // to nothing, which is the quiet way a guard like this stops guarding.
  it('actually finds the page sources it claims to scan', () => {
    expect(Object.keys(pages).length).toBeGreaterThan(10);
    const all = Object.values(pages).flatMap((src) =>
      [...String(src).matchAll(/'@type':\s*'([A-Za-z]+)'/g)].map((m) => m[1]));
    expect(all).toContain('WebPage');
  });

  it('declares no @type outside the verified list', () => {
    const offenders = [];
    for (const [file, source] of Object.entries(pages)) {
      for (const m of String(source).matchAll(/'@type':\s*'([A-Za-z]+)'/g)) {
        if (!VERIFIED.has(m[1])) offenders.push(`${file}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('rejects the two invented types specifically', () => {
    expect(VERIFIED.has('PrivacyPolicy')).toBe(false);
    expect(VERIFIED.has('TermsAndConditions')).toBe(false);
  });

  it('walks nested @type values, not just the top level', () => {
    expect(typesIn({ '@type': 'WebPage', publisher: { '@type': 'Person' } }))
      .toEqual(['WebPage', 'Person']);
  });
});

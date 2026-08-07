// Structured data for the two homepages.
//
// Extracted from index.astro / fa/index.astro on 2026-08-07, when an SEO audit
// found `operatingSystem: 'iOS 26+'` published on both. That string was the
// accidental deployment target (26.5 rather than the intended 17.0), so the
// schema was advertising the defect to every search and answer engine that
// read it. Both copies said it, because both were hand-maintained; one builder
// with one test is why they can no longer drift apart.
//
// Two rules govern what may appear here, and both come from FACTS.md:
//
//   1. No device-compatibility claim until the deployment target is fixed and
//      verified. `operatingSystem` is therefore the unversioned 'iOS'. That is
//      true whatever the minimum turns out to be, and it is what stops the
//      schema from either advertising the bug or publishing an iOS 17 claim
//      the shipped binary does not yet support. Add the floor back, as
//      'iOS 17.0', in the same commit that verifies the new build.
//   2. Nothing about translation quality or provenance. FACTS.md marks that
//      CONTESTED and hard-blocked while AI-generated English remains in the
//      app, so featureList below describes the mechanism (a verse and a
//      reflection chosen by mood) and never the translation.
//
// Everything in FEATURE_LIST is a VERIFIED entry in FACTS.md. Nothing is added
// here without one: aggregateRating, ratingCount and downloadCount are all
// UNVERIFIED there, and a fabricated rating is both a Google structured-data
// violation and the exact kind of invented claim this repo's rules exist to
// prevent.

const SITE = 'https://hamdam.com.au';

/** Stable @id for the publisher node, referenced from the app node. */
export const ORGANIZATION_ID = `${SITE}/#organization`;
export const APPLICATION_ID = `${SITE}/#app`;

/**
 * VERIFIED features only (FACTS.md "Core features" and "Privacy"). English on
 * both locales on purpose: this repo bars Claude from authoring Persian, and
 * featureList is machine-read metadata rather than user-visible copy. It is the
 * same call already made for offers.description on the Farsi page.
 */
export const FEATURE_LIST = Object.freeze([
  'A daily verse from Hafez, Rumi, Saadi, Khayyam or Parvin Etesami',
  'A reflection chosen by how the day feels, on a five-point mood slider',
  'Private journal, favourites, and a streak that forgives a missed day',
  'Cultural calendar: Yalda, Norooz, Chaharshanbe Suri, Mehregan and more',
  'Australian public holidays by state',
  'Optional Siri, Home Screen widgets, Apple Watch and Apple Music integration',
  'Optional Apple Health State of Mind logging',
  'Family Sharing supported',
  'No account, no sign-up, no tracking',
]);

/**
 * The Organization node. Kept separate from the app node and referenced by
 * @id so both homepages describe one publisher rather than two anonymous ones.
 *
 * No `sameAs`: the social accounts are real but no URL for them is recorded
 * anywhere in this repository, and guessing a handle into structured data
 * would be asserting something unverified. Add them here once confirmed.
 */
export const organizationSchema = Object.freeze({
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'Hamdam',
  url: `${SITE}/`,
  email: 'developer@hamdam.com.au',
  logo: {
    '@type': 'ImageObject',
    url: `${SITE}/icons/icon-512.png`,
    width: 512,
    height: 512,
  },
  // VERIFIED in FACTS.md: copyright holder, and made in Brisbane.
  founder: { '@type': 'Person', name: 'Seyed Valiallah Azizollahi' },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Brisbane',
    addressRegion: 'QLD',
    addressCountry: 'AU',
  },
});

/**
 * Builds the homepage @graph: one SoftwareApplication plus the shared
 * Organization.
 *
 * @param {object} options
 * @param {'en' | 'fa'} options.lang
 * @param {string} options.name           Localised app name.
 * @param {string} options.description    Localised meta description, reused verbatim.
 * @param {string} options.url            Absolute canonical URL of this homepage.
 * @param {string} options.downloadUrl    Absolute App Store URL for this locale.
 * @param {string[]} [options.screenshots] Absolute URLs of real in-app screenshots.
 */
export function homepageSchema({ lang, name, description, url, downloadUrl, screenshots = [] }) {
  const application = {
    '@type': 'SoftwareApplication',
    '@id': APPLICATION_ID,
    name,
    alternateName: 'Hamdam: Daily Persian Poetry',
    description,
    url,
    // Unversioned on purpose. Read the header of this file before changing it.
    operatingSystem: 'iOS',
    applicationCategory: 'LifestyleApplication',
    availableOnDevice: 'iPhone',
    downloadUrl,
    installUrl: downloadUrl,
    inLanguage: lang === 'fa' ? ['fa', 'en'] : ['en', 'fa'],
    featureList: [...FEATURE_LIST],
    publisher: { '@id': ORGANIZATION_ID },
    // Paid-tier prices intentionally not published (decision 2026-07-02);
    // FACTS.md also requires Ealia's sign-off on any pricing claim.
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'AUD',
      description: 'Free with in-app purchases',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'developer@hamdam.com.au',
      contactType: 'customer support',
    },
  };

  if (screenshots.length) application.screenshot = screenshots;

  return {
    '@context': 'https://schema.org',
    '@graph': [application, organizationSchema],
  };
}

/**
 * A cultural moment page (/moments/<slug>/ and its Farsi pair).
 *
 * Deliberately modest: a WebPage, a BreadcrumbList and a reference to the
 * publisher. Not schema.org/Event, which wants a start date, an end date and
 * somewhere it happens, and would be claiming that Yalda is an event Hamdam is
 * running rather than a night people observe. Not FAQPage either, since there
 * is no question and answer copy on the page to mark up, and marking up copy
 * that is not there is how a rich result turns into a manual action.
 *
 * @param {object} options
 * @param {'en' | 'fa'} options.lang
 * @param {string} options.name
 * @param {string} options.description  The approved sentence, verbatim.
 * @param {string} options.url
 * @param {string} options.breadcrumbHome  Localised name of the homepage crumb.
 * @param {string} options.homeUrl
 */
export function momentPageSchema({ lang, name, description, url, breadcrumbHome, homeUrl }) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        name,
        description,
        url,
        inLanguage: lang,
        isPartOf: { '@id': APPLICATION_ID },
        publisher: { '@id': ORGANIZATION_ID },
        about: { '@type': 'Thing', name },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: breadcrumbHome, item: homeUrl },
          { '@type': 'ListItem', position: 2, name, item: url },
        ],
      },
      organizationSchema,
    ],
  };
}

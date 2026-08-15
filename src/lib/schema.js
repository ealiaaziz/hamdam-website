// Structured data for the two homepages.
//
// Extracted from index.astro / fa/index.astro on 2026-08-07, when an SEO audit
// found `operatingSystem: 'iOS 26+'` published on both. Both copies said it,
// because both were hand-maintained; one builder with one test is why they can
// no longer drift apart.
//
// The version claim has now been four different things, so the history is
// worth keeping straight. It read 'iOS 26+' while FACTS.md recorded the
// deployment target as an unresolved defect (26.5 where 17.0 was intended), so
// the schema was publishing a number nobody stood behind. It was cut to the
// unversioned 'iOS' on that basis: true whatever the minimum turned out to be,
// and safe to publish while the answer was unknown. On 2026-08-07 Ealia
// confirmed the minimum genuinely was iOS 26.5, so it was stated. On
// 2026-08-15 version 1.2 went live carrying IPHONEOS_DEPLOYMENT_TARGET 26.0,
// and the floor dropped to 'iOS 26+'.
//
// So the string is now character-for-character the one removed as unverified,
// and it is still not the same claim. The old one was an unchecked number
// inherited from a suspected build mistake. This one is the shipping build's
// own deployment target, read from the project file on 2026-08-13, queued
// against 1.2 shipping, and confirmed live on 2026-08-15. Stating it is the
// point: an answer engine that knows the floor will not recommend the app to
// someone whose phone cannot run it.
//
// Two rules govern what may appear here, and both come from FACTS.md:
//
//   1. Device-compatibility claims track FACTS.md and nothing else. The
//      minimum is iOS 26, VERIFIED there on 2026-08-15. If the floor ever
//      moves, it moves in FACTS.md first and here second, never the other way
//      round: this file is downstream of that record, which is what stopped an
//      unverified 26+ being published for weeks.
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

import { APP_STORE } from './appStore.js';

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
 * `sameAs` was empty until 2026-08-13 for a good reason: the accounts were
 * real but no URL for them was recorded anywhere in this repository, and
 * guessing a handle into structured data asserts something unverified. The
 * three below are confirmed, so the reason no longer applies.
 *
 * What this is for, and what it is not for. `sameAs` is how a search engine
 * ties this Organization node to profiles it already has an entity for. That
 * matters here because "hamdam" is a common Persian word and a widely used
 * brand name: over the 3 July to 11 August window the brand term drew 13
 * impressions at average position 22.5 and no clicks. Nothing in this array
 * fixes that quickly. Entity signals compound over months, which is the
 * argument for adding them now rather than in December.
 *
 * No LinkedIn URL: whether a company page exists is unresolved (the connector
 * returned 403 on organisation ACLs, which does not distinguish "no page"
 * from "no permission"). Add one here only once someone has loaded the page
 * in a browser. An unverified URL in `sameAs` is the exact failure this
 * comment used to describe.
 */
export const organizationSchema = Object.freeze({
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'Hamdam',
  url: `${SITE}/`,
  email: 'developer@hamdam.com.au',
  sameAs: Object.freeze([
    'https://www.instagram.com/hamdam_au/',
    'https://x.com/Hamdam_au',
    'https://apps.apple.com/au/app/hamdam-daily-persian-poetry/id6784461990',
  ]),
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
    // VERIFIED minimum, not a guess, and derived rather than retyped so it
    // cannot drift from the requirement line under the store badge.
    operatingSystem: `iOS ${APP_STORE.MINIMUM_IOS}+`,
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
/**
 * A poet page. The entity described is a Person, which is what schema.org has
 * for a poet and what lets `sameAs` point at Ganjoor's page for the same
 * person. No birthDate/deathDate: several of the five have only approximate
 * dates ("c. 1325"), and schema.org Date wants an exact one, so the lifespan
 * stays prose on the page rather than becoming a precise claim in metadata.
 *
 * @param {object} options
 * @param {'en' | 'fa'} options.lang
 * @param {string} options.name
 * @param {string} options.alternateName  The name in the other script.
 * @param {string} options.description
 * @param {string} options.url
 * @param {string} options.breadcrumbHome
 * @param {string} options.homeUrl
 * @param {string} options.sameAs  Ganjoor's page for this poet.
 */
export function poetPageSchema({
  lang, name, alternateName, description, url, breadcrumbHome, homeUrl, sameAs,
}) {
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
        about: {
          '@type': 'Person',
          name,
          alternateName,
          description,
          sameAs,
        },
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

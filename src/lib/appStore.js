// App Store link/state logic. RELEASED is the launch-day switch: while
// false, CTAs render the approved "Coming soon" pill (Apple's badge
// guidelines only permit the official badge for available apps, and the
// store URL 404s pre-release). Flip to true on launch day.

import { RELEASES } from '../data/releases.ts';
import { appStoreNameFor, gamesShippedIn, homepageTitleFor, storeSlug } from './appName.js';

/**
 * The listing's name, as the App Store currently reports it.
 *
 * Derived, never typed. `RELEASES[0].version` is the live version out of the
 * generated record, and `appStoreNameFor` returns the old name below 1.4 and
 * "Hamdam: Reflection Companion" from 1.4 onward. Ship the release, run
 * `node scripts/extract-releases.mjs --write`, and every surface that names
 * the app follows in the same build: the homepage title, `alternateName` in
 * the structured data, the footer's crawlable store link, and the slug in the
 * canonical URL below.
 *
 * The reasoning behind deriving rather than flipping a boolean is in
 * src/lib/appName.js. In one line: a boolean is a thing somebody has to
 * remember on a day they are busy shipping, and being wrong here means the
 * site publishes a name Apple's own page contradicts.
 */
export const APP_STORE_NAME = appStoreNameFor(RELEASES[0]?.version);

/**
 * The English homepage `<title>`, which tracks the same switch but is not
 * simply the name plus a suffix. See homepageTitleFor for why, including what
 * this rename costs the site in search terms and how the 1.4 title pays it
 * back.
 */
export const HOMEPAGE_TITLE_EN = homepageTitleFor(RELEASES[0]?.version);

/**
 * Whether the live listing has the Garden's games, and therefore whether copy
 * may name them. See `gamesShippedIn` for why this is derived rather than a
 * boolean somebody flips: the games claim and the rename are one release, and
 * neither may appear before Apple has approved the build that carries them.
 */
export const GAMES_SHIPPED = gamesShippedIn(RELEASES[0]?.version);

export const APP_STORE = Object.freeze({
  ID: '6784461990',
  RELEASED: true,
  COUNTRY: 'au',
  /**
   * Minimum iOS, VERIFIED in FACTS.md. Lives here rather than in either
   * consumer because it has two: the structured data in schema.js and the
   * requirement line under the store badge. Those were about to be two
   * hand-maintained copies of one number, which is exactly how both homepages
   * came to publish an unverified `iOS 26+` in the first place.
   * Change it in FACTS.md first, here second, and nowhere else.
   *
   * 26 since 2026-08-15, down from 26.5, because Hamdam 1.2 is live and ships
   * `IPHONEOS_DEPLOYMENT_TARGET = 26.0`. The 2026-08-13 audit had already read
   * that out of the project file and queued this edit against 1.2 shipping.
   *
   * Yes, the rendered string is `iOS 26+` again, and no, the old defect has not
   * returned: that one was an unchecked number inherited from a suspected build
   * mistake, this one is the shipping build's own target. FACTS.md carries the
   * full distinction, and it is worth reading before assuming a regression.
   *
   * Bare number, no `+` and no `iOS` -- every consumer adds its own, and a
   * test enforces the shape so `iOS iOS 26++` cannot happen.
   *
   * One number for two operating systems, added 2026-08-28. The listing states
   * "Requires iOS 26.0" and "iPadOS 26.0 or later" separately, and they are the
   * same floor, so `iOS / iPadOS 26+` is derived from this single constant
   * rather than written out anywhere. If Apple ever splits them, this becomes
   * two constants and the consumers stop sharing one -- do not paper over a
   * split by hard-coding the second number at a call site.
   */
  MINIMUM_IOS: '26',
});

/**
 * The one clean, crawlable App Store URL for the listing: named slug, no
 * storefront segment, no query string. Everything else on this site links to
 * the store through `appStoreUrl()`, which pins `/au/` and appends a `ct`
 * campaign token; that is right for a CTA a person clicks and wrong for the
 * reference a crawler follows. Until 2026-08-16 the site had only the tagged
 * form, so no page offered an indexer a parameter-free URL for the listing at
 * all, while competitor listings sat in the index with theirs.
 *
 * Storefront-less on purpose. `/au/` is a real page, but it tells a crawler
 * this is the Australian edition of the listing rather than the listing, and
 * the audience is not only Australian. Apple resolves the bare form to the
 * viewer's own storefront.
 *
 * The slug is decorative to Apple: `id6784461990` alone resolves, and a
 * deliberately wrong slug still 200s. It is here because it carries the
 * product name, which is the part an indexer reads, and that is precisely why
 * it is derived from APP_STORE_NAME rather than frozen: the name changes at
 * 1.4, and a slug still saying `daily-persian-poetry` after that would be the
 * one part of the URL an indexer reads, saying the wrong thing.
 *
 * The note that used to sit here, that the slug is per storefront and that
 * `/us/` canonicalises to `hamdam-poetry-reflection`, is no longer true and is
 * removed rather than left to mislead. Re-checked 2026-09-07 against
 * `itunes.apple.com/lookup`: AU and US both return trackName "Hamdam: Daily
 * Persian Poetry" and both trackViewUrls carry
 * `hamdam-daily-persian-poetry`. The listing name no longer diverges by
 * storefront, so there is one right slug again.
 *
 * Never append parameters to this. The campaign-parameter rewriter in
 * BaseLayout skips it by attribute for that reason.
 */
export const APP_STORE_CANONICAL_URL =
  `https://apps.apple.com/app/${storeSlug(APP_STORE_NAME)}/id${APP_STORE.ID}`;

// The App Store Connect provider token, read from the build environment
// (`PUBLIC_ASC_PROVIDER_TOKEN`) rather than hard-coded, because it is an
// account-specific value only ASC can supply.
//
// It shipped as the literal string `[ASC_PROVIDER_TOKEN]` until 2026-08-04.
// That was recorded as safe ("an unresolved `pt` is just ignored"), and it
// was wrong in the way that mattered: every store link on the site carried
// `pt=%5BASC_PROVIDER_TOKEN%5D`, a visible junk parameter in a URL users can
// see and share, sitting next to the `ct` value that is the part actually
// doing the attribution work.
//
// So: no token, no parameter. `ct` is what App Store Connect groups the
// Sources report by and it works on its own, which means per-placement
// attribution (web-hero, web-nav, web-pricing...) is live either way; `pt`
// only adds the legacy provider dimension on top. Set the env var when the
// real token is read from ASC and every link picks it up on the next build,
// with no other change.
//
// Anything placeholder-shaped is rejected rather than propagated, so a
// half-finished value can never reach an href again.
const PROVIDER_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

/** @param {unknown} raw */
export function normalizeProviderToken(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return PROVIDER_TOKEN_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * `null` when unset or placeholder-shaped, which is the signal to omit `pt`
 * from the URL entirely.
 * @type {string | null}
 */
export const ASC_PROVIDER_TOKEN = normalizeProviderToken(
  typeof import.meta !== 'undefined' ? import.meta.env?.PUBLIC_ASC_PROVIDER_TOKEN : undefined
);

const CAMPAIGN_FALLBACK = 'website';

/**
 * Maps inbound campaign query params to Apple's `ct`/`pt` params
 * (conversion spec §11): `utm_campaign` -> `ct`, falling back to
 * `CAMPAIGN_FALLBACK` when absent. Pure function of a URLSearchParams-like
 * object (anything with `.get()`); no cookies, no client-side storage,
 * consistent with the site's "no tracking" claims.
 * `pt` is `null` whenever no real provider token is configured; callers omit
 * the parameter in that case rather than writing an empty or placeholder one.
 * @param {{ get(key: string): string | null } | null | undefined} searchParams
 */
export function campaignParamsFromSearch(searchParams) {
  const ct = searchParams?.get('utm_campaign') || CAMPAIGN_FALLBACK;
  return { ct, pt: ASC_PROVIDER_TOKEN };
}

/**
 * Builds the per-placement `ct` value baked in at build time (E2). Every App
 * Store link on the site previously pointed at the bare listing URL, so App
 * Store Connect bucketed website, Instagram and LinkedIn traffic together
 * under one Web Referrer row and there was no way to tell which channel or
 * which button actually worked.
 *
 * Locale is part of the value rather than a separate dimension because App
 * Store Connect Sources reports on `ct` alone; `?l=fa` is a display hint to
 * the store, not something the analytics can group by.
 *
 * This sets no cookie, loads no SDK and sends nothing about the visitor. It is
 * a static string in an href.
 * @param {'en' | 'fa'} lang
 * @param {string} placement
 */
export function campaignTokenFor(lang, placement) {
  return lang === 'fa' ? `web-fa-${placement}` : `web-${placement}`;
}

/**
 * @param {'en' | 'fa'} lang
 * @param {{ ct: string, pt?: string | null } | null} [campaignParams]
 * @param {string | null} [placement] Static placement token, e.g. 'hero'.
 *   Ignored when campaignParams is supplied, since an inbound utm_campaign is
 *   a real attributed visit and outranks the placement default.
 */
/**
 * Custom product pages, by placement. Added 2026-09-07 when Apple approved the
 * first two. A placement listed here sends its visitors to that page instead of
 * the default listing, via Apple's `ppid` parameter, so somebody who came from
 * the Fal-e Hafez article lands on the page whose first line is about the
 * Faal. Placements not listed keep the default page, deliberately: the default
 * page is where the "Reflection First" screenshot test runs until 25 October,
 * and its population should not be moved without meaning to.
 *
 * The ids are App Store Connect's own, read back from the API on 2026-09-07,
 * and the page's promotional text was confirmed rendering at these URLs before
 * they were written here. The calendar page exists but is hidden, so it is not
 * listed; a hidden page's ppid silently shows the default listing.
 */
export const CUSTOM_PRODUCT_PAGES = Object.freeze({
  fal: 'c17f1f9b-5632-49ee-a913-63e65c306ca9',
});

export function appStoreUrl(lang = 'en', campaignParams = null, placement = null) {
  const base = `https://apps.apple.com/${APP_STORE.COUNTRY}/app/id${APP_STORE.ID}`;
  const params = new URLSearchParams();
  if (lang === 'fa') params.set('l', 'fa');
  if (campaignParams) {
    params.set('ct', campaignParams.ct);
    if (campaignParams.pt) params.set('pt', campaignParams.pt);
  } else if (placement) {
    params.set('ct', campaignTokenFor(lang, placement));
    if (ASC_PROVIDER_TOKEN) params.set('pt', ASC_PROVIDER_TOKEN);
  }
  // ppid follows the placement whichever branch set ct above: an inbound
  // utm_campaign visitor on the Fal page still came for the Faal.
  if (placement && CUSTOM_PRODUCT_PAGES[placement]) {
    params.set('ppid', CUSTOM_PRODUCT_PAGES[placement]);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

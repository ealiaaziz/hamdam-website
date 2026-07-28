// App Store link/state logic. RELEASED is the launch-day switch: while
// false, CTAs render the approved "Coming soon" pill (Apple's badge
// guidelines only permit the official badge for available apps, and the
// store URL 404s pre-release). Flip to true on launch day.

export const APP_STORE = Object.freeze({
  ID: '6784461990',
  RELEASED: true,
  COUNTRY: 'au',
});

// Placeholder until read from App Store Connect (conversion spec §11 item
// 7 / claims-verification table item 7). Safe to ship as-is: an
// unresolved `pt` value is simply ignored by Apple's attribution system,
// never a broken link.
export const ASC_PROVIDER_TOKEN = '[ASC_PROVIDER_TOKEN]';

const CAMPAIGN_FALLBACK = 'website';

/**
 * Maps inbound campaign query params to Apple's `ct`/`pt` params
 * (conversion spec §11): `utm_campaign` -> `ct`, falling back to
 * `CAMPAIGN_FALLBACK` when absent. Pure function of a URLSearchParams-like
 * object (anything with `.get()`); no cookies, no client-side storage,
 * consistent with the site's "no tracking" claims.
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
 * @param {{ ct: string, pt: string } | null} [campaignParams]
 * @param {string | null} [placement] Static placement token, e.g. 'hero'.
 *   Ignored when campaignParams is supplied, since an inbound utm_campaign is
 *   a real attributed visit and outranks the placement default.
 */
export function appStoreUrl(lang = 'en', campaignParams = null, placement = null) {
  const base = `https://apps.apple.com/${APP_STORE.COUNTRY}/app/id${APP_STORE.ID}`;
  const params = new URLSearchParams();
  if (lang === 'fa') params.set('l', 'fa');
  if (campaignParams) {
    params.set('ct', campaignParams.ct);
    params.set('pt', campaignParams.pt);
  } else if (placement) {
    params.set('ct', campaignTokenFor(lang, placement));
    params.set('pt', ASC_PROVIDER_TOKEN);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

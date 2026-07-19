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
 * @param {'en' | 'fa'} lang
 * @param {{ ct: string, pt: string } | null} [campaignParams]
 */
export function appStoreUrl(lang = 'en', campaignParams = null) {
  const base = `https://apps.apple.com/${APP_STORE.COUNTRY}/app/id${APP_STORE.ID}`;
  const params = new URLSearchParams();
  if (lang === 'fa') params.set('l', 'fa');
  if (campaignParams) {
    params.set('ct', campaignParams.ct);
    params.set('pt', campaignParams.pt);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

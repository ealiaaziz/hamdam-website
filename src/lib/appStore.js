// App Store link/state logic. RELEASED is the launch-day switch: while
// false, CTAs render the approved "Coming soon" pill (Apple's badge
// guidelines only permit the official badge for available apps, and the
// store URL 404s pre-release). Flip to true on launch day.

export const APP_STORE = Object.freeze({
  ID: '6784461990',
  RELEASED: true,
  COUNTRY: 'au',
  /**
   * Minimum iOS, VERIFIED in FACTS.md on 2026-08-07 (Ealia). Lives here rather
   * than in either consumer because it has two: the structured data in
   * schema.js and the requirement line under the store badge. Those were about
   * to be two hand-maintained copies of one number, which is exactly how both
   * homepages came to publish an unverified `iOS 26+` in the first place.
   * Change it in FACTS.md first, here second, and nowhere else.
   */
  MINIMUM_IOS: '26.5',
});

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
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

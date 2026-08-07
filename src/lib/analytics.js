// Cloudflare Web Analytics, added 2026-08-07.
//
// The privacy policy has said "This website uses Cloudflare Web Analytics to
// count page views" since it was written (privacy.astro §2.1), and the CSP in
// public/_headers has carried `static.cloudflareinsights.com` in script-src and
// `cloudflareinsights.com` in connect-src the whole time. The beacon itself was
// never on the page: a check of the live site on 2026-08-07 found zero
// occurrences on /, /fa/, /poets/hafez/ and /privacy/. So the policy was
// describing something that was not happening, and a day spent trying to grow
// traffic had nothing measuring it.
//
// Why in code rather than the dashboard toggle: Cloudflare's automatic
// injection rewrites HTML on its way through the proxy, which is reliable for
// Pages and for a proxied origin. This site is a Worker serving static assets,
// where that rewrite is not something to depend on. A tag in the document is
// deterministic, versioned and reviewable. Use one or the other, never both, or
// every page view is counted twice.
//
// What this is allowed to be, per the policy it has to match: aggregate,
// cookieless page counts. No cookie, no cross-site tracking, no identification.
// The same section rules out Firebase, Mixpanel, Amplitude and Google
// Analytics by name, so adding any of those would need the policy changed
// first, which is Ealia's call and not a build-time one.
//
// The token is not a secret (it ships in the HTML of every page and is
// per-zone, not per-account), but it is environment-specific, so it comes from
// `PUBLIC_CF_BEACON_TOKEN` at build time rather than being hard-coded. Unset
// means no tag at all, which is what keeps local builds, previews and anyone
// else's checkout from writing into the production dataset.

/**
 * A Cloudflare Web Analytics site token is 32 hexadecimal characters.
 *
 * Anything else returns null and the tag is omitted entirely. That shape check
 * is deliberate and the reason is recorded in appStore.js: the App Store
 * provider token shipped as the literal string `[ASC_PROVIDER_TOKEN]` for
 * weeks, on the reasoning that an unresolved value would simply be ignored. It
 * was not ignored, it was rendered. A half-configured value must fail closed
 * rather than reach a page.
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeBeaconToken(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return /^[0-9a-f]{32}$/i.test(trimmed) ? trimmed : null;
}

/**
 * The token for this build, or null when unset or malformed.
 * @type {string | null}
 */
export const CF_BEACON_TOKEN = normalizeBeaconToken(
  typeof import.meta !== 'undefined' ? import.meta.env?.PUBLIC_CF_BEACON_TOKEN : undefined
);

/**
 * The value for the beacon's `data-cf-beacon` attribute.
 *
 * Built with JSON.stringify rather than a template literal so the token cannot
 * break out of the attribute even if the shape check above is ever loosened.
 * @param {string} token
 */
export function beaconConfig(token) {
  return JSON.stringify({ token });
}

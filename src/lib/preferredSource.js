// Google's "preferred sources" deep link, added 2026-09-06.
//
// Google added a publisher-facing control on 2026-08-20: a signed-in searcher
// can name sites they want to see more of, and Google then favours those sites
// in Top Stories, AI Mode and AI Overviews for that one person. Publishers are
// invited to put a button on their own pages that sends a reader into that
// setting with the site pre-filled.
//
// Read the honest assessment before extending this, because the ceiling on it
// is low and it is easy to mistake for an acquisition lever:
// docs/seo/2026-09-06-google-preferred-sources.md. The short version is that
// this cannot bring anyone to the site who is not already on it. Every click
// comes from a visitor who already arrived, so the most it can do is make a
// return visit slightly likelier for the subset of them who are signed into
// Google and who bother.
//
// Two implementation choices, and this file is the second one:
//
//   1. Google's own button, which is a script tag pointing at
//      news.google.com/swg/js/v1/publisher.js plus an empty div it fills in.
//      It renders a translated, themed button and would have handled Farsi for
//      free. It is refused here. The CSP in public/_headers is enforcing and
//      names one third-party script origin; that script injects its own markup
//      and styling, so admitting it means widening script-src and almost
//      certainly style-src and frame-src as well. That is a real, permanent
//      loosening of the site's security posture, bought for a feature whose
//      expected return is close to zero. The trade is not worth making.
//
//   2. The deep link Google documents alongside it, which is an ordinary
//      anchor to a Google URL. No script, no CSP change, no third-party code,
//      nothing to load. It renders Google's page in Google's own languages
//      because the destination is Google's, not ours.
//
// The URL shape comes from Google's Search Central page for the feature
// (developers.google.com/search/docs/appearance/preferred-sources), read
// 2026-09-06.

/**
 * @property {boolean} ENABLED The kill switch, and it is here because one
 *   precondition could not be checked from a build container. Google's
 *   documentation says a site has to already appear in the source preferences
 *   tool for any of this to work, and that tool is behind a Google sign-in and
 *   rendered by client-side JavaScript, so neither a fetch nor a curl can read
 *   it. Nobody has confirmed hamdam.com.au is listed. If it is not, this link
 *   lands a reader on a Google settings page that cannot find us, which is a
 *   worse outcome than no link at all: set this to false and the footer stops
 *   rendering it. See TODO-Ealia.md for the check itself, which takes about
 *   thirty seconds in a signed-in browser.
 * @property {string} DOMAIN The apex, matching the canonical host every page
 *   already declares. Google accepts a domain or a subdomain and rejects a
 *   subdirectory, so there is nothing finer-grained to point at even if a
 *   single page deserved it.
 */
export const PREFERRED_SOURCE = Object.freeze({
  ENABLED: true,
  DOMAIN: 'hamdam.com.au',
});

const HOSTNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

/**
 * A bare lowercase hostname, or null for anything that is not one.
 *
 * Fails closed, for the reason recorded at length in appStore.js: the App
 * Store provider token shipped to production as the literal string
 * `[ASC_PROVIDER_TOKEN]` on the reasoning that a value nobody had filled in
 * would simply be ignored. It was not ignored. It was rendered, in a URL
 * people could see. A half-configured value must produce no link rather than a
 * broken one.
 *
 * A scheme and a path are tolerated on input and stripped, because a hostname
 * is exactly the kind of constant somebody later pastes a full URL into.
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeSourceDomain(raw) {
  if (typeof raw !== 'string') return null;
  const host = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
  return HOSTNAME_PATTERN.test(host) ? host : null;
}

/**
 * The deep link into Google's source preferences for one site.
 *
 * @param {unknown} domain
 * @returns {string | null} null when the domain is unusable, which callers
 *   render as no link.
 */
export function preferredSourceUrl(domain) {
  const host = normalizeSourceDomain(domain);
  if (!host) return null;
  return `https://www.google.com/preferences/source?q=${encodeURIComponent(host)}`;
}

/**
 * What the footer actually renders, or null when the feature is switched off
 * or misconfigured.
 * @type {string | null}
 */
export const PREFERRED_SOURCE_URL = PREFERRED_SOURCE.ENABLED
  ? preferredSourceUrl(PREFERRED_SOURCE.DOMAIN)
  : null;

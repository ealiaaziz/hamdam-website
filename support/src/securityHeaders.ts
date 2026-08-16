// The response headers every page of this desk carries, kept out of index.ts
// so the list is a value a test can read rather than a sequence of calls on a
// Hono context. Same reasoning as urls.ts: the guarantee is worth asserting,
// and asserting it should not require standing up the whole app.
//
// The list is also the thing that drifted. The marketing site's headers live
// in `public/_headers` and this Worker's lived in a function, two files that
// nothing compares, and on 2026-08-16 a review found the desk missing the two
// cross-origin headers the site had carried since 2026-08-08 and running a
// Permissions-Policy naming four features against the site's twenty one. Each
// file read as deliberate on its own. The desk is the half of the estate
// holding other people's names, addresses and ticket text, so it was the
// weaker of the two in exactly the wrong direction.

/**
 * Every powerful browser feature, switched off.
 *
 * The four-entry version this replaces named geolocation, camera, microphone
 * and payment and stopped there, which left everything it had not thought of
 * enabled by default. The marketing site's list in `public/_headers` is the
 * complete one and this is it, with one deliberate difference: `fullscreen` is
 * denied here rather than allowed for same-origin. The site has a cinematic
 * hero that might one day want it; a ticket form has nothing to show
 * fullscreen and no reason to keep the door ajar.
 *
 * A deny list rather than a default, because Permissions-Policy has no "refuse
 * everything" wildcard: a feature nobody named is permitted, so the only way
 * to refuse one is to write it down. That makes this a list which goes stale
 * as browsers ship features, and that is an argument for revisiting it, not
 * for keeping it short.
 */
export const PERMISSIONS_POLICY = [
  'geolocation=()',
  'camera=()',
  'microphone=()',
  'payment=()',
  'usb=()',
  'serial=()',
  'bluetooth=()',
  'midi=()',
  'magnetometer=()',
  'gyroscope=()',
  'accelerometer=()',
  'ambient-light-sensor=()',
  'display-capture=()',
  'idle-detection=()',
  'local-fonts=()',
  'screen-wake-lock=()',
  'xr-spatial-tracking=()',
  'browsing-topics=()',
  'interest-cohort=()',
  'autoplay=()',
  'fullscreen=()',
].join(', ');

/**
 * No inline anything, no third-party anything, no framing.
 *
 * Stricter than the marketing site's, which allows Cloudflare's analytics
 * script. This desk has no analytics and no scripts at all: every page is
 * server-rendered HTML and one stylesheet, so `script-src 'self'` is already
 * more permission than anything here uses.
 */
export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

/**
 * What every response gets, whatever produced it.
 *
 * `Cross-Origin-Opener-Policy` severs `window.opener`. A ticket page is
 * reached from a link in an email, and a mail client that opens it in a new
 * tab leaves the opener holding a handle to it; same-origin means a
 * cross-origin opener gets a null reference rather than one it can navigate
 * or probe.
 *
 * `Cross-Origin-Resource-Policy` refuses cross-origin embedding of what this
 * Worker serves. Nothing here is meant to be embedded anywhere: the pages are
 * a ticket thread and the console, and the only subresource is one stylesheet.
 * It is browser-enforced and invisible to every other kind of client, so the
 * MTA-STS policy this Worker also serves is unaffected. That file is fetched
 * by mail servers, which send no Origin and read no CORP.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': PERMISSIONS_POLICY,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Nothing generated here is cacheable by anything in the middle.
 *
 * A ticket page carries a person's name, their email address and whatever they
 * pasted into a description, and it is reached by a URL that has the only
 * credential guarding it in the query string. Both halves of that make a
 * stored copy dangerous: a shared cache keyed on the URL is keyed on the
 * credential, and browser back-button restores put the thread on screen after
 * the tab was handed to someone else.
 */
export const DEFAULT_CACHE_CONTROL = 'private, no-store, max-age=0';

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

/**
 * The production site token, from Cloudflare Web Analytics.
 *
 * Committed rather than kept in an environment variable, which is safe because
 * it is not a secret: it ships in the HTML of every page, and it identifies a
 * zone rather than an account. Committing it removes the second dashboard trip
 * that a Workers Builds variable would need, and puts the value under review
 * like anything else.
 *
 * STILL NULL. Reading or creating the token goes through Cloudflare's
 * `rum/site_info` API, and the API token this repository deploys with is
 * refused there with a 403: it carries Workers and Zone scope but not Account
 * Analytics. Nothing else can derive it, so it has to be pasted in by someone
 * with dashboard access. Until then every branch below resolves to null and no
 * tag is emitted, which is a site with no analytics rather than a broken one.
 *
 * To finish: Cloudflare dashboard, Web Analytics, add a site for
 * hamdam.com.au, copy the 32-hex value out of the snippet's `data-cf-beacon`,
 * and replace the null here.
 *
 * Re-checked 2026-09-07, because "the API refuses this" is the kind of claim
 * that rots. It has not. Three probes from a fresh session, all recorded so
 * the next one does not repeat them:
 *
 *   1. `GET /accounts/{id}/rum/site_info/list` with the deploy token: 403,
 *      `Authentication error`. The token verifies fine (`/user/tokens/verify`
 *      returns 200 active), so this is scope, not a bad credential.
 *   2. The GraphQL analytics API, which would at least have given zone-level
 *      request counts with no beacon at all: refused too, naming the missing
 *      permission outright as `zone.analytics.read`.
 *   3. The live site, `/fa/` and support.hamdam.com.au were fetched and
 *      searched for an existing `data-cf-beacon`. Nothing. So no token exists
 *      anywhere to be copied, and nobody has switched on Cloudflare's
 *      automatic injection either.
 *
 * There is a second way out of this that is worth knowing about, because it
 * buys more than the paste does. Adding **Account Analytics (Edit)** and
 * **Zone Analytics (Read)** to the existing deploy API token would let a
 * session create the Web Analytics site, read its token back, and read the
 * traffic afterwards, without anyone opening a dashboard again. The paste
 * fixes the beacon and nothing else. Both are one dashboard trip; only one of
 * them is the last one.
 *
 * @type {string | null}
 */
export const PRODUCTION_BEACON_TOKEN = null;

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
 * Which token, if any, this build should emit.
 *
 * Pure, and takes its whole world as an argument, so the three cases can be
 * tested without a build. The rule:
 *
 *   1. An explicit PUBLIC_CF_BEACON_TOKEN always wins. That is the escape
 *      hatch for a staging zone or for testing the tag locally.
 *   2. Otherwise the committed production token, but only on a CI build.
 *   3. Otherwise nothing.
 *
 * Rule 2 is the point. Every push to this repository deploys, so a CI build is
 * a production build; a build on someone's laptop is not, and should not write
 * page views into the production dataset. This is what the environment
 * variable was protecting before the token was committed, kept intact.
 *
 * @param {{ explicit?: unknown, productionToken?: unknown, isCi?: boolean }} env
 * @returns {string | null}
 */
export function resolveBeaconToken({ explicit, productionToken, isCi } = {}) {
  const override = normalizeBeaconToken(explicit);
  if (override) return override;
  if (!isCi) return null;
  return normalizeBeaconToken(productionToken);
}

/**
 * The `PUBLIC_CF_BEACON_TOKEN` override, read from wherever this module has
 * been loaded.
 *
 * It has to look in two places, and until 2026-09-07 it looked in one. Astro
 * puts the variable on `import.meta.env` for anything Vite compiles, which is
 * how BaseLayout sees it. But `astro.config.mjs` imports this same file as a
 * plain Node module to print the build-log line, and there `import.meta.env`
 * does not exist, so the log read the override as unset every time.
 *
 * The symptom was not theoretical and it was measured: a build with the
 * variable set printed `analytics: beacon OFF, no production token committed
 * yet` while shipping the beacon tag on all 27 pages. A log line that exists
 * to say whether the beacon shipped, and says the opposite of what shipped, is
 * worse than no log line, because the whole design here leans on it.
 *
 * Static property access on both, never a computed key: Vite substitutes
 * `import.meta.env.PUBLIC_CF_BEACON_TOKEN` at build time by matching the
 * literal text, so `import.meta.env[name]` would quietly stop resolving in a
 * client bundle.
 */
export function pickExplicitToken(viteValue, processValue) {
  return typeof viteValue === 'string' && viteValue.trim() ? viteValue : processValue;
}

/** @type {unknown} */
const EXPLICIT_BEACON_TOKEN = pickExplicitToken(
  typeof import.meta !== 'undefined' ? import.meta.env?.PUBLIC_CF_BEACON_TOKEN : undefined,
  typeof process !== 'undefined' ? process.env?.PUBLIC_CF_BEACON_TOKEN : undefined
);

/**
 * True on Cloudflare Workers Builds, which injects WORKERS_CI=1 into every
 * build. Guarded because this module is imported from .astro frontmatter,
 * which runs in Node, but must not throw if it is ever pulled into a client
 * bundle where `process` does not exist.
 */
export function isWorkersCiBuild() {
  return typeof process !== 'undefined' && Boolean(process.env?.WORKERS_CI);
}

/** @type {string | null} */
export const CF_BEACON_TOKEN = resolveBeaconToken({
  explicit: EXPLICIT_BEACON_TOKEN,
  productionToken: PRODUCTION_BEACON_TOKEN,
  isCi: isWorkersCiBuild(),
});

/**
 * Whether a build with these inputs would actually put a beacon on the page.
 *
 * The same rule as resolveBeaconToken(), stated as a yes or no so the
 * pre-deploy check can ask the question without rebuilding, and so the answer
 * is covered by a test rather than by a condition written twice.
 *
 * @param {{ committed?: string | null, explicit?: string | null, isCi?: boolean }} inputs
 *   Both tokens already normalized, so a placeholder-shaped value counts as
 *   absent here exactly as it does at render time.
 */
export function beaconWouldShip({ committed, explicit, isCi } = {}) {
  return Boolean(explicit || (isCi && committed));
}

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

/**
 * One line in the build log saying whether the beacon shipped and why.
 *
 * Because the failure this design can have is silent. If WORKERS_CI is ever
 * renamed, or the token is left null, the build still succeeds and the pages
 * still render; the only symptom is a dashboard that stays empty, which is
 * exactly the state this whole change exists to get out of. Printing the
 * decision means the Workers Builds log answers the question directly instead
 * of it being inferred from missing data weeks later.
 */
export function describeBeaconDecision() {
  if (CF_BEACON_TOKEN) {
    return `analytics: beacon enabled (token ...${CF_BEACON_TOKEN.slice(-6)})`;
  }
  if (!PRODUCTION_BEACON_TOKEN) {
    return 'analytics: beacon OFF, no production token committed yet (see src/lib/analytics.js)';
  }
  if (!isWorkersCiBuild()) {
    return 'analytics: beacon off, not a Workers Builds run (local builds do not report)';
  }
  return 'analytics: beacon OFF, committed token failed the 32-hex shape check';
}

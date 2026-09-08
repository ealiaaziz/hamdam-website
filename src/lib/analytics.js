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
 * SET, and settled on 2026-09-08 after a wrong turn in each direction. Read
 * the hour table below before changing it, because both of the obvious moves
 * have already been made and measured.
 *
 * **This zone has two Web Analytics sites, and they do not run at once.**
 *
 *   fc0907d7213743e39c87fc821feee7ae  Cloudflare's automatic injection, token
 *                                     a3514c7052c648d985b8912603a2a7f8. Data
 *                                     from 2026-08-29 to 2026-09-07 11:00Z.
 *   aa50aecebb5643708676c003d943d076  this constant. Created 2026-09-07 by a
 *                                     session that believed there was no
 *                                     analytics at all. Data from 12:00Z that
 *                                     day, which is the hour the tag shipped.
 *
 * Automatic injection is invisible to a bare curl, because Cloudflare only
 * rewrites the HTML for a browser user agent. That is what fooled four
 * separate probes into reporting no analytics:
 *
 *   curl -sS https://hamdam.com.au/ | grep -c cloudflareinsights          -> 0
 *   curl -sS -A "Mozilla/5.0 ... Chrome/140.0 ..." ... | grep -c ...      -> 1
 *
 * Never conclude anything about analytics here from a request without a
 * browser UA.
 *
 * The panic that followed that discovery was that the two beacons were double
 * counting, and this constant was set back to null to stop it. The hourly
 * counts say otherwise, and they are the reason it is set again:
 *
 *   hour (UTC)          fc0907 (injected)   aa50ae (this tag)
 *   2026-09-07 10:00            4                  0
 *   2026-09-07 11:00            2                  0
 *   2026-09-07 12:00            0                  1     <- tag ships
 *   2026-09-07 19:00            0                  3
 *   2026-09-08 11:00            0                  3
 *
 * The injected site went to zero in the same hour this tag went live and has
 * had nothing since. So injection stands aside when the page already carries a
 * beacon: the two were never both counting, and the "double counting" was one
 * response caught mid-transition, not a state anything was in.
 *
 * Which leaves the real choice, and it is settled the deterministic way. This
 * tag is in the repository, visible to a plain curl, versioned, reviewable and
 * guarded by `scripts/predeploy-check.mjs`. Injection is a dashboard setting
 * nothing here can see, verify or protect, and it is what made a whole day of
 * work argue from a blind probe.
 *
 * Do NOT change this to a3514c... to reunite the history. If injection ever
 * does fire alongside this tag, pointing both at one site inflates that site;
 * pointing them at two merely splits it. Split is recoverable, inflated is
 * not. The pre-2026-09-07 history stays where it is, in the other site.
 *
 * What the API allows, all measured rather than assumed:
 *
 *   - `POST rum/site_info`             200, creates a site, returns its token
 *   - `GET  rum/site_info/list`        403 Authentication error
 *   - `GET  rum/site_info/{site_tag}`  403 Authentication error
 *   - `PATCH rum/site_info/{site_tag}` 405 Method not allowed for this scheme
 *   - GraphQL `rumPageloadEventsAdaptiveGroups`, account-scoped:  **200, works**
 *   - GraphQL zone analytics           refused, `zone.analytics.read` missing
 *
 * That fifth row is the one that finally answered this, and it had been missed
 * for weeks: the traffic is readable from a session even though the site list
 * is not. `docs/seo/2026-09-07-analytics-beacon.md` carries the query.
 *
 * Committed rather than kept in an environment variable, which is safe because
 * it is not a secret: it ships in the HTML of every page and identifies a zone
 * rather than an account.
 *
 * @type {string | null}
 */
export const PRODUCTION_BEACON_TOKEN = '307af77792884ee5bdfdcc1418ff0f19';

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
    // Null is NOT the intended state on this site: it means the in-code tag
    // is gone and the only thing that could still be counting is Cloudflare's
    // automatic injection, which nothing here can see or verify. Say so.
    return 'analytics: NO in-code beacon; counting depends entirely on Cloudflare injection (see src/lib/analytics.js)';
  }
  if (!isWorkersCiBuild()) {
    return 'analytics: beacon off, not a Workers Builds run (local builds do not report)';
  }
  return 'analytics: beacon OFF, committed token failed the 32-hex shape check';
}

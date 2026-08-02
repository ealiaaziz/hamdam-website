// URL construction, kept out of index.ts so the HTTPS guarantee below is
// unit-testable without standing up the whole Hono app.

/**
 * `wrangler dev` serves plain HTTP with no certificate to redirect to, so
 * local development is the one case where an http:// URL is correct.
 * Everything else is production or a preview deploy, both of which are
 * HTTPS-only.
 */
export function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

/**
 * The link a requester gets emailed to view their ticket.
 *
 * This is always https outside local dev, and deliberately does NOT mirror
 * the scheme of the request that triggered it. The tracking token is the
 * only credential guarding the ticket, and it travels in the query string:
 * minting an http:// link here would put a working credential into a
 * plaintext URL, email it, and have the requester's own click transmit it
 * in the clear. A request arriving over http is a reason to hand back an
 * https link, not to propagate the downgrade.
 */
export function trackingUrl(requestUrl: string, ticketId: number, token: string): string {
  const url = new URL(requestUrl);
  const protocol = isLocalHost(url.hostname) ? url.protocol : 'https:';
  return `${protocol}//${url.host}/tickets/${ticketId}?token=${encodeURIComponent(token)}`;
}

/**
 * Whether a state-changing request looks cross-site, for CSRF rejection.
 *
 * The console authenticates from Cloudflare Access, and Access presents its
 * assertion in the CF_Authorization cookie as well as a header. A cookie
 * rides along on a cross-site form POST automatically, so without this
 * check any page on the internet could submit a form to
 * /admin/tickets/1/status and have it execute with an agent's identity.
 * Access's own cookie carries SameSite, but that is a dashboard-configurable
 * attribute, and "a setting is currently correct" is the assumption this
 * codebase already got burned by once.
 *
 * Browsers have sent Origin on POST (including same-origin) for years, so a
 * missing Origin on a real edge request is treated as untrusted rather than
 * waved through.
 *
 * Enforced only for edge requests: `wrangler dev` rewrites Host to the
 * custom domain while the browser still sends its localhost Origin, so
 * comparing them locally would reject every local form submission.
 */
export function isCrossSiteRequest(requestUrl: string, origin: string | undefined, viaCloudflareEdge: boolean): boolean {
  if (!viaCloudflareEdge) return false;
  if (!origin) return true;
  try {
    return new URL(origin).host !== new URL(requestUrl).host;
  } catch {
    return true;
  }
}

/**
 * The https equivalent of an incoming http request, for the redirect in
 * index.ts. Returns null when the request needs no redirect: already
 * https, or not served through Cloudflare's edge at all.
 *
 * `viaCloudflareEdge` is deliberately a caller-supplied signal rather than
 * a hostname check. `wrangler dev` rewrites the request's Host to the
 * custom domain in wrangler.jsonc, so a running dev server sees
 * `http://support.hamdam.com.au/...`, not `http://localhost:8787/...` --
 * hostname-based local detection silently never fires, and local dev ends
 * up 301'd to the production domain. Callers pass the presence of the
 * CF-Ray header instead: Cloudflare sets it on every request it proxies
 * and overwrites any client-supplied value, so it cannot be stripped to
 * dodge the redirect in production, and it is simply absent under
 * wrangler dev.
 */
/**
 * Paths the /fa prefix is not an alias for.
 *
 * The console. It is not translated, and more to the point the Cloudflare
 * Access application in front of this Worker is scoped to the path
 * `support.hamdam.com.au/admin`. A prefix strip that turned /fa/admin into
 * /admin gave the console a second address that Access never saw, so the only
 * thing refusing those requests was the Worker's own JWT check. That check
 * did hold, which is the entire reason it exists rather than trusting the
 * proxy. It is still a door Access cannot log, cannot rate limit and cannot
 * attach a policy to, and one control quietly carrying two is how the next
 * change breaks something nobody was watching.
 */
export const UNPREFIXED_PATHS = ['/admin'] as const;

/**
 * A path reduced to the one spelling the router will see.
 *
 * This exists because the first version of the exclusion check below compared
 * the raw pathname, and the raw pathname is not what anything downstream
 * matches on. `/fa/%61dmin` is not the string `/fa/admin`, so it was rewritten
 * and served; Hono then decoded it and routed it to the console. The exclusion
 * list was intact and simply never consulted about the request that mattered.
 *
 * Decoding once mirrors the router. The rest is deliberately stricter than any
 * router is known to be: repeated slashes collapse, `.` segments vanish, `..`
 * pops, and the whole thing is lowercased. None of that is required by today's
 * behaviour, and that is the point. A comparison that is only correct while
 * Hono keeps matching case-sensitively and keeps treating `//admin` as
 * distinct from `/admin` is a comparison that a dependency upgrade can quietly
 * turn into a bypass, and this is the second time this exact door has been
 * found open.
 *
 * Null means the path could not be decoded, which the caller must treat as a
 * refusal to rewrite rather than as permission.
 */
function canonicalPath(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const segments: string[] = [];
  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return `/${segments.join('/')}`.toLowerCase();
}

/**
 * Where a /fa-prefixed path should actually be served from, or null to leave
 * the request exactly as it arrived.
 *
 * Null covers both "no prefix to strip" and "prefixed, but not a path the
 * prefix is allowed to reach". The second returns null rather than a 404
 * marker on purpose: an unrewritten /fa/admin matches no route and gets the
 * ordinary not-found, which is the honest answer for an address that was
 * never meant to exist.
 *
 * The returned path is the stripped *original*, not the canonical form. Only
 * the comparison is canonicalised; rewriting a request to a normalised path it
 * did not ask for would be a way of smuggling one route into another, which is
 * the shape of the bug this is here to prevent rather than a fix for it.
 */
export function localePrefixTarget(pathname: string): string | null {
  if (pathname !== '/fa' && !pathname.startsWith('/fa/')) return null;
  const stripped = pathname.slice(3) || '/';

  const canonical = canonicalPath(stripped);
  // Undecodable, so there is no way to know what the router will make of it.
  // Serve it unrewritten and let it match nothing.
  if (canonical === null) return null;

  if (UNPREFIXED_PATHS.some((p) => canonical === p || canonical.startsWith(`${p}/`))) return null;
  return stripped;
}

export function httpsRedirectTarget(requestUrl: string, viaCloudflareEdge: boolean): string | null {
  if (!viaCloudflareEdge) return null;
  const url = new URL(requestUrl);
  if (url.protocol !== 'http:') return null;
  url.protocol = 'https:';
  return url.toString();
}

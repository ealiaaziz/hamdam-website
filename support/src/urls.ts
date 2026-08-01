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
export function httpsRedirectTarget(requestUrl: string, viaCloudflareEdge: boolean): string | null {
  if (!viaCloudflareEdge) return null;
  const url = new URL(requestUrl);
  if (url.protocol !== 'http:') return null;
  url.protocol = 'https:';
  return url.toString();
}

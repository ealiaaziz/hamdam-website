// Where the desk will answer a web request from.
//
// The portal is the one part of this system reachable by anyone on the
// internet, and it is unauthenticated by design: someone who needs help
// should not need an account first. That openness is also the whole of its
// attack surface. Hamdam's customers are in Australia and New Zealand, so
// serving the rest of the world buys nothing and costs the exposure.
//
// This is a second lock, not the only one. The first is a Cloudflare WAF
// rule, which stops the request at the edge before a Worker runs at all and
// is what actually saves the money. A WAF rule is also one dashboard click
// from being deleted by someone tidying up, and the failure would be silent,
// so the same rule lives here in code with a test beside it. Same reasoning
// as the HTTPS redirect: the zone setting should catch it, and this is what
// still refuses when the zone setting is off.
//
// What this deliberately does not block: email. A customer travelling
// overseas can still reach the desk at developer@hamdam.com.au, which is
// read by the cron and creates a ticket exactly as the portal would. The
// blocked page says so, because a support desk that says "no" without saying
// "here is how instead" is just a wall.

export const DEFAULT_ALLOWED_COUNTRIES = ['AU', 'NZ', 'IR', 'AE', 'GB', 'US', 'NL'] as const;

/**
 * Parses the configured allow-list. Comma-separated ISO 3166-1 alpha-2, as
 * Cloudflare reports them.
 *
 * An empty or unparseable value falls back to the default rather than to
 * "allow everything": a typo in a config string should not quietly open the
 * site to the world.
 */
export function parseAllowedCountries(value: string | undefined): string[] {
  const parsed = (value ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_COUNTRIES];
}

/**
 * Whether to serve this request.
 *
 * Unknown origins are refused. Cloudflare reports `XX` when it cannot place
 * an address and `T1` for Tor, and both are exactly the traffic this rule
 * exists to keep out; treating "we do not know" as "probably fine" would
 * make the rule decorative. The cost is that a genuine customer behind an
 * unusual network is told to email instead, which still works.
 */
export function isAllowedCountry(country: string | undefined | null, allowed: readonly string[]): boolean {
  if (!country) return false;
  return allowed.includes(country.toUpperCase());
}

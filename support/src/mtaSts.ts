// MTA-STS: telling other mail servers that this domain expects TLS.
//
// The red team pass found inbound mail could be downgraded by an active
// network attacker sitting between a sending server and Exchange Online.
// SMTP's STARTTLS is opportunistic by design: strip the STARTTLS capability
// from the server's greeting and a well-behaved sender delivers in plaintext
// without complaint. There is nothing in the protocol that lets the receiving
// domain say "no, always encrypt".
//
// MTA-STS (RFC 8461) is that missing statement, and it is deliberately not a
// DNS record. DNS without DNSSEC is itself forgeable, so a policy published
// only in DNS could be forged by the same attacker. Instead the DNS record
// carries a version and an id, and the policy itself is fetched over HTTPS
// from a fixed hostname, where the certificate is what proves the policy is
// the domain owner's. That is why this file exists inside a Worker rather
// than being four more lines in the zone: the whole security property comes
// from it being served over a verified TLS connection.
//
// It lives with the support desk rather than in its own Worker because this
// is the codebase that owns the mail path -- Graph, ingestion, the outbound
// queue -- and because a third deploy target is a third thing to remember.
// It is mounted before the country check in index.ts, for the reason spelled
// out there: the senders who need this file are mail servers anywhere in the
// world, and refusing them the policy is refusing the mail.

/**
 * The one hostname a sender will ever fetch the policy from.
 *
 * Fixed by RFC 8461 as `mta-sts.<domain>`, which is the point: a sender does
 * not discover the location, it constructs it. Serving the policy anywhere
 * else has no effect, and serving the *portal* here would be an accidental
 * second copy of the desk on a hostname nobody audits, so the handler answers
 * on this host and nothing else.
 */
export const MTA_STS_HOSTNAME = 'mta-sts.hamdam.com.au';

/** The single path, also fixed by the RFC. */
export const MTA_STS_PATH = '/.well-known/mta-sts.txt';

/**
 * The one exception to "one file", added 2026-08-08.
 *
 * This hostname is not a website, but nothing told the crawlers that. It is a
 * real host with a real certificate, and a certificate is public: Google reads
 * Certificate Transparency logs, so a hostname is discovered the moment it is
 * issued one, with no link to it anywhere. Googlebot found this host that way,
 * requested `/`, got the deliberate 404 below, and Search Console reported
 * "Not found (404)" against the whole hamdam.com.au domain property on
 * 2026-08-08. Confirmed by URL inspection: crawled 2026-08-06 as MOBILE,
 * pageFetchState NOT_FOUND, robotsTxtState ALLOWED -- allowed because a 404 on
 * /robots.txt means "no restrictions", which is the opposite of what this host
 * wants to say.
 *
 * The 404 itself is correct and stays. What was missing is the instruction not
 * to ask in the first place.
 *
 * This cannot affect mail. RFC 8461 senders construct the policy URL and fetch
 * it directly; robots.txt is a crawler convention that no MTA consults. The
 * policy path keeps serving exactly as before, which the tests assert.
 */
export const MTA_STS_ROBOTS_PATH = '/robots.txt';

/** Disallow everything: there is nothing here for a search engine. */
export const MTA_STS_ROBOTS_BODY = 'User-agent: *\nDisallow: /\n';

/**
 * The mail exchangers a sender is permitted to deliver to.
 *
 * Both the exact host from the zone's MX record and Microsoft's wildcard.
 * The exact entry is the one that matters today; the wildcard is what stops
 * this becoming a mail outage the day Microsoft moves the tenant to a
 * different host under the same suffix, which they do without notice and
 * which is invisible until mail stops.
 *
 * A pattern that fails to cover the live MX is the one way this file can
 * break inbound mail, so it is written to be too generous rather than too
 * tight. `*.mail.protection.outlook.com` still says "Exchange Online, with a
 * certificate proving it" -- the attacker in the threat model above cannot
 * satisfy it.
 */
export const MTA_STS_MX = ['hamdam-com-au.mail.protection.outlook.com', '*.mail.protection.outlook.com'] as const;

/**
 * `testing` rather than `enforce`, for now.
 *
 * In testing mode a sender that cannot make a validated TLS connection
 * delivers anyway and files a TLS-RPT report about it. In enforce mode it
 * refuses to deliver at all. Enforce is the destination; testing is how you
 * find out, without any risk to real mail, whether the policy you just wrote
 * is correct.
 *
 * This is the discipline the DMARC change did not get. `p=reject` went live
 * the same day it was decided, and it can only ever affect mail claiming to
 * be from this domain. A wrong MTA-STS policy in enforce mode stops mail
 * arriving *at* the desk, which is the failure the whole build record warns
 * about: a support desk that no longer receives support requests, silently,
 * with the senders bouncing rather than telling us.
 *
 * TLS-RPT is already published to dmarc@hamdam.com.au, so the reports that
 * justify the promotion are already being collected. Promoting is this
 * constant, and bumping MTA_STS_POLICY_ID, and updating the TXT record to
 * match. See support/docs/build-record.md.
 */
export const MTA_STS_MODE: 'testing' | 'enforce' = 'testing';

/** A week, the shortest lifetime RFC 8461 recommends for a real policy. */
export const MTA_STS_MAX_AGE = 604800;

/**
 * The id published in the `_mta-sts` TXT record, which must match this.
 *
 * This is the cache key for the whole mechanism. A sender re-reads the cheap
 * TXT record often and only refetches the policy when the id has changed, so
 * an edited policy served under an unchanged id reaches nobody until their
 * cached copy expires, which is `max_age` away. Change the policy, change
 * this, change the TXT record: three edits, always together, and the DNS one
 * cannot be made from this repository.
 */
export const MTA_STS_POLICY_ID = '20260802a';

/**
 * The policy document.
 *
 * CRLF line endings because RFC 8461 says so. Nothing in the wild seems to
 * care, but a policy file is read by other people's mail servers and there is
 * no version of this worth being clever about.
 */
export function mtaStsPolicy(): string {
  const lines = [`version: STSv1`, `mode: ${MTA_STS_MODE}`, ...MTA_STS_MX.map((mx) => `mx: ${mx}`), `max_age: ${MTA_STS_MAX_AGE}`];
  return `${lines.join('\r\n')}\r\n`;
}

/** The TXT record this policy requires, for the runbook and for tests. */
export function mtaStsDnsRecord(): string {
  return `v=STSv1; id=${MTA_STS_POLICY_ID};`;
}

export type MtaStsResponse = { status: 200; body: string } | { status: 404 };

/**
 * What to serve for a request arriving on the MTA-STS hostname, or null when
 * the request is not on that hostname and the desk should handle it normally.
 *
 * Returning a 404 for every other path on that host is deliberate. The
 * hostname exists for one file. Letting it fall through to the portal would
 * publish the ticket form, and eventually the console, on an address that was
 * added for mail plumbing and that nobody would think to check.
 *
 * Two files now: the policy, and a robots.txt that says do not crawl any of
 * this. See MTA_STS_ROBOTS_PATH for why that stopped being optional.
 */
export function mtaStsResponseFor(requestUrl: string): MtaStsResponse | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (url.hostname.toLowerCase() !== MTA_STS_HOSTNAME) return null;
  if (url.pathname === MTA_STS_PATH) return { status: 200, body: mtaStsPolicy() };
  if (url.pathname === MTA_STS_ROBOTS_PATH) return { status: 200, body: MTA_STS_ROBOTS_BODY };
  return { status: 404 };
}

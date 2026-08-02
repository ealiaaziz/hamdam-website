// Whether the address in an email's From header is actually the sender's.
//
// This is the check the inbound ownership rule was missing. That rule says a
// message may only be appended to a ticket when the sender matches the
// requester, which reads as an identity check and is not one: `From:` is a
// line of text the sending client writes. For a requester whose domain
// publishes an enforcing DMARC policy it is as good as authenticated, because
// Exchange Online refuses the forgery before the desk ever sees it. For a
// requester on a domain without one it is a claim, and the desk was treating
// the claim as proof.
//
// The document in this repository says, in its own words, that inbound email
// is not an identity. It then used it as one. This closes that gap.
//
// Exchange Online has already done the work: it evaluates SPF, DKIM and DMARC
// on delivery and stamps the result into an `Authentication-Results` header.
// All that is needed here is to read its verdict rather than re-derive it,
// which is fortunate, because re-deriving it inside a Worker would mean
// implementing DKIM verification and would be a far worse idea than trusting
// the mail server that already did it.

/** One header as Microsoft Graph returns it. */
export interface MessageHeader {
  name?: string;
  value?: string;
}

/**
 * The domain part of an address, lowercased, or null.
 *
 * Deliberately naive: everything reaching here has already been through
 * Graph, which parsed the address properly.
 */
function domainOf(address: string): string | null {
  const at = address.lastIndexOf('@');
  if (at < 0 || at === address.length - 1) return null;
  return address.slice(at + 1).trim().toLowerCase();
}

/**
 * Relaxed DMARC alignment: same domain, or one a subdomain of the other.
 *
 * Real relaxed alignment compares *organizational* domains, which requires
 * the Public Suffix List, which is a megabyte of data that changes and would
 * have to be shipped into a Worker to answer a question that arises a few
 * times an hour. The approximation is strictly tighter than the real rule in
 * the one direction that matters: it can refuse an alignment DMARC would have
 * accepted, which downgrades a reply to a new ticket, and it cannot accept
 * one DMARC would have rejected, which is the direction that would matter.
 */
function aligned(claimed: string, fromDomain: string): boolean {
  const a = claimed.trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  const b = fromDomain;
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

/** `key=value` out of one Authentication-Results header, first occurrence. */
function field(header: string, key: string): string | null {
  const match = new RegExp(`\\b${key}=([^\\s;()]+)`, 'i').exec(header);
  return match ? match[1] : null;
}

/**
 * The header Exchange Online wrote, out of however many the message carries.
 *
 * This is the part that has to be right. `Authentication-Results` is an
 * ordinary header and the sender can put one in the message they compose,
 * saying whatever they like. A check that scanned all of them for a pass
 * would be asking the attacker whether the attacker is authentic.
 *
 * The receiving server prepends its own on delivery, so the genuine verdict
 * is above any the sender wrote. Microsoft always includes `compauth=` in
 * theirs and nothing else here does, which gives a second, independent way to
 * recognise it. Taking the first header that carries `compauth=` therefore
 * lands on Exchange's own even if the ordering assumption is ever wrong, and
 * on nothing at all if Exchange did not stamp one.
 */
export function exchangeAuthHeader(headers: readonly MessageHeader[]): string | null {
  for (const header of headers) {
    if ((header.name ?? '').toLowerCase() !== 'authentication-results') continue;
    const value = header.value ?? '';
    if (/\bcompauth=/i.test(value)) return value;
  }
  return null;
}

export type SenderVerdict = {
  /** Whether the From address may be treated as the sender's own. */
  authenticated: boolean;
  /** What decided it, for the ticket record and for debugging a refusal. */
  reason: string;
};

/**
 * Whether Exchange authenticated the From address on this message.
 *
 * Accepts three things, which are the three ways DMARC can be satisfied:
 *
 *  - `dmarc=pass`, which is Exchange saying the sender's own published policy
 *    was met. The strongest and the common case.
 *  - `dkim=pass` whose `header.d` aligns with the From domain. A valid
 *    signature by the domain in the From line is the claim being checked,
 *    whether or not that domain publishes DMARC.
 *  - `spf=pass` whose `smtp.mailfrom` aligns with the From domain. Weaker
 *    than DKIM and it does not survive forwarding, which is exactly why it is
 *    the third option rather than the first.
 *
 * Everything else is unauthenticated, including the absence of a verdict.
 * Absence is the important one: no header means no evidence, and "we could
 * not check" must never read as "it passed". A message that fails here is not
 * rejected, it simply does not get to write on somebody else's ticket.
 */
export function senderIsAuthenticated(headers: readonly MessageHeader[], fromEmail: string): SenderVerdict {
  const fromDomain = domainOf(fromEmail);
  if (!fromDomain) return { authenticated: false, reason: 'no sender domain' };

  const header = exchangeAuthHeader(headers);
  if (!header) return { authenticated: false, reason: 'no Authentication-Results from Exchange' };

  if (field(header, 'dmarc')?.toLowerCase() === 'pass') {
    return { authenticated: true, reason: 'dmarc=pass' };
  }

  const dkim = field(header, 'dkim')?.toLowerCase();
  const dkimDomain = field(header, 'header\\.d');
  if (dkim === 'pass' && dkimDomain && aligned(dkimDomain, fromDomain)) {
    return { authenticated: true, reason: `dkim=pass aligned to ${fromDomain}` };
  }

  const spf = field(header, 'spf')?.toLowerCase();
  const mailFrom = field(header, 'smtp\\.mailfrom');
  if (spf === 'pass' && mailFrom && aligned(domainOf(mailFrom) ?? mailFrom, fromDomain)) {
    return { authenticated: true, reason: `spf=pass aligned to ${fromDomain}` };
  }

  const summary = [
    dkim ? `dkim=${dkim}` : null,
    spf ? `spf=${spf}` : null,
    field(header, 'dmarc') ? `dmarc=${field(header, 'dmarc')}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  return { authenticated: false, reason: summary ? `unaligned or failing: ${summary}` : 'no usable verdict' };
}

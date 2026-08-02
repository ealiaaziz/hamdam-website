// How often one caller may use the portal.
//
// The portal takes no account and asks for no credential, which is right: a
// person with a problem should not have to sign up before describing it. The
// cost of that openness is that every control on it has to be a rate, not an
// identity.
//
// What is actually being protected is not the database. It is the mailbox.
// Submitting a ticket makes developer@hamdam.com.au deliver a message to an
// address the submitter typed, carrying a subject they wrote. Left
// unmetered, the form is a way to have this domain send arbitrary mail to
// arbitrary people, and the thing that breaks is not the Worker but the
// deliverability of every real reply the desk sends afterwards.
//
// The model budget in db.ts is a sibling of this and not a substitute: it
// caps spend and degrades to the keyword matcher, which is exactly the
// graceful outcome that would let an abusive burst continue quietly.

import { edgeClientIp } from './edge.js';

export interface RateLimitRule {
  /** Requests permitted inside one window. */
  limit: number;
  /** Window length. Fixed, not sliding. */
  windowSeconds: number;
}

/**
 * The ceilings, in one place so they read as a policy rather than as numbers
 * scattered through handlers.
 *
 * Set from what a real person does, with room to be flustered. Someone
 * raising a genuine problem submits one ticket, maybe two if they think the
 * first did not go through. Nobody submits six in an hour. Replies are looser
 * because the portal is a conversation and a fast back-and-forth is the
 * feature, not the abuse.
 */
export const RATE_LIMITS = {
  /** New tickets from one address at the edge. */
  ticket_create_ip: { limit: 5, windowSeconds: 3600 },
  /**
   * New tickets naming one recipient, whatever address they come from.
   *
   * The IP limit alone is the wrong shape for the attack that matters: a
   * caller with a pool of addresses can still aim every one of them at a
   * single victim's inbox. Counting the recipient too means the mail one
   * person can be sent is bounded no matter how the requests are spread.
   */
  ticket_create_email: { limit: 5, windowSeconds: 3600 },
  /** Replies on a ticket the caller already holds the token for. */
  ticket_reply: { limit: 60, windowSeconds: 3600 },
  /** "Email me this conversation", which sends mail on every press. */
  ticket_summary: { limit: 10, windowSeconds: 3600 },
  /**
   * Messages from one email sender that the desk will answer automatically.
   *
   * The portal got limits and the mailbox did not, which left the cheaper of
   * the two doors unlocked: anyone can send mail, every new email ticket
   * produces an acknowledgement and an assistant reply, and a subject with a
   * P1 word in it also produces an alert to the team's own addresses. Sixty
   * emails is sixty alerts, and an alert that arrives sixty times is one
   * nobody reads afterwards.
   *
   * Higher than the portal's, because a real thread genuinely goes back and
   * forth, and because the consequence of crossing it is gentler: over this
   * line the desk still files everything, it just stops replying by itself
   * until a person looks. Nothing is dropped.
   */
  inbound_sender: { limit: 20, windowSeconds: 3600 },
  /**
   * Mail the desk will send to one address, counted wherever it is sent from.
   *
   * The per-recipient ceiling on the portal was the right idea applied to one
   * door. The mailbox had no recipient ceiling at all, only a per-sender one,
   * and since an emailed ticket's acknowledgement goes back to the `From`
   * address, that door would push twenty tickets and roughly forty pieces of
   * mail an hour into an address of the sender's choosing. The channel
   * described as the gentler of the two was, measured at a stranger's inbox,
   * the more permissive one.
   *
   * So the ceiling moved to the only place that sees every path: the act of
   * sending. Ten is above what any real ticket generates, an acknowledgement
   * plus a reply plus a summary, and well below a useful volume of unwanted
   * mail.
   *
   * Escalation is exempt, deliberately and by address rather than by
   * accident: an alert to the team is the one message whose whole purpose is
   * to arrive, and metering it would let a busy hour silence the thing that
   * tells a person the hour is busy.
   */
  outbound_recipient: { limit: 10, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export interface RateLimitOutcome {
  allowed: boolean;
  /** Requests used inside the current window, including this one. */
  count: number;
  /** Seconds until the window rolls, for Retry-After. */
  retryAfterSeconds: number;
}

/**
 * Counts one request against a bucket and says whether to serve it.
 *
 * The increment and the read are a single statement, for the same reason
 * `claimModelCall` is: two requests arriving together must not both see the
 * last slot as free. Refused attempts still count, so a caller who is already
 * over the line does not get their window reset by continuing to hammer it.
 *
 * Fails open. If D1 is unavailable the choice is between refusing a person
 * with a real problem and letting an abusive burst through during an outage,
 * and a support desk that stops accepting support requests when its counter
 * table is unreachable has the failure the wrong way round. Every other guard
 * on the path, validation, the model budget, the country check, still holds.
 */
export async function consumeRateLimit(
  db: D1Database,
  bucket: RateLimitBucket,
  subject: string,
  now: Date = new Date(),
): Promise<RateLimitOutcome> {
  const rule = RATE_LIMITS[bucket];
  const nowIso = now.toISOString();
  const cutoffIso = new Date(now.getTime() - rule.windowSeconds * 1000).toISOString();

  try {
    const row = await db
      .prepare(
        `INSERT INTO rate_limits (bucket, subject, window_start, count)
         VALUES (?1, ?2, ?3, 1)
         ON CONFLICT(bucket, subject) DO UPDATE SET
           count = CASE WHEN rate_limits.window_start <= ?4 THEN 1 ELSE rate_limits.count + 1 END,
           window_start = CASE WHEN rate_limits.window_start <= ?4 THEN ?3 ELSE rate_limits.window_start END
         RETURNING count, window_start`,
      )
      .bind(bucket, subject, nowIso, cutoffIso)
      .first<{ count: number; window_start: string }>();

    const count = row?.count ?? 1;
    const startedAt = row?.window_start ? Date.parse(row.window_start) : now.getTime();
    const elapsed = Number.isFinite(startedAt) ? (now.getTime() - startedAt) / 1000 : 0;
    return {
      allowed: count <= rule.limit,
      count,
      retryAfterSeconds: Math.max(1, Math.ceil(rule.windowSeconds - elapsed)),
    };
  } catch (error) {
    console.warn('rate limit check failed, allowing:', error instanceof Error ? error.message : String(error));
    return { allowed: true, count: 0, retryAfterSeconds: 0 };
  }
}

/**
 * The caller, as well as this can be known, or null for "do not limit this".
 *
 * CF-Connecting-IP is the address: Cloudflare sets it and overwrites it on
 * every proxied request, so it cannot be forged the way an X-Forwarded-For
 * can. But it is not on its own the signal for whether to count at all, and
 * assuming it was is a mistake this caught in local testing: `wrangler dev`
 * supplies CF-Connecting-IP: 127.0.0.1, so every local request shared one
 * bucket and the sixth ticket of a dev session was refused.
 *
 * So the gate is CF-Ray, the same signal the HTTPS redirect and the country
 * check already use for exactly this question. Cloudflare sets it on every
 * request it proxies and overwrites any client value, so it cannot be
 * stripped to dodge the limit in production, and it is simply absent under
 * `wrangler dev`.
 */
export function callerKey(headers: { get(name: string): string | null }): string | null {
  const ip = edgeClientIp(headers);
  return ip === null ? null : networkKey(ip);
}

/**
 * The address, reduced to the network its owner controls.
 *
 * IPv4 is counted whole, because one address is roughly one caller. IPv6 is
 * not: the smallest allocation a residential connection receives is a /64,
 * which is eighteen quintillion addresses that one person can source traffic
 * from at will. Counting the full address there is counting nothing, and the
 * ceiling it appeared to enforce was decorative for any caller with a modern
 * connection.
 *
 * A /64 is the right granularity and not merely a convenient one: it is the
 * smallest block RFC 4291 lets a single subscriber be delegated, so folding
 * to it cannot merge two subscribers who were separately assigned.
 */
export function networkKey(ip: string): string {
  const address = ip.trim().toLowerCase();
  if (!address.includes(':')) return address;

  // Expand only as far as needed to take the first four groups. `::` in the
  // first half means the leading groups are zeros, which is already the
  // canonical prefix.
  const [head] = address.split('%');
  const groups = head.split(':');
  const doubleColon = head.includes('::');
  const prefix: string[] = [];
  for (const group of groups) {
    if (prefix.length === 4) break;
    if (group === '') {
      if (!doubleColon) continue;
      while (prefix.length < 4) prefix.push('0');
      break;
    }
    prefix.push(group.replace(/^0+(?=.)/, ''));
  }
  while (prefix.length < 4) prefix.push('0');
  return `${prefix.join(':')}::/64`;
}

/**
 * An email address reduced to the inbox it actually reaches.
 *
 * Metering and authorisation want opposite things from an address, and the
 * same literal comparison was doing both. Deciding whether a sender owns a
 * ticket must be literal: folding there would widen the set of people who
 * count as somebody else, which is why `sameAddress` in inbound.ts refuses to
 * do any of this and should carry on refusing.
 *
 * Counting how much mail one person can be sent is the opposite. Left
 * literal, `victim+1@gmail.com` and `victim+2@gmail.com` are two buckets
 * pointing at one inbox, and the per-recipient ceiling is a suggestion. Here,
 * being too generous about what counts as the same person is the safe
 * direction: the worst case is that two genuinely different addresses share a
 * ceiling and one of them waits.
 *
 * Plus-tagging is stripped for everyone because the convention is near
 * universal and, where a provider does not implement it, the address simply
 * does not exist and no real person is throttled. Dots are folded only for
 * Google's domains, because dot-insensitivity is specifically their behaviour
 * and folding it elsewhere would merge addresses that are genuinely different
 * people.
 */
const DOTLESS_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

export function meteringSubject(email: string): string {
  const address = email.trim().toLowerCase();
  const at = address.lastIndexOf('@');
  if (at <= 0) return address;

  let local = address.slice(0, at);
  const domain = address.slice(at + 1);

  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);
  if (DOTLESS_DOMAINS.has(domain)) local = local.replaceAll('.', '');

  return `${local}@${domain}`;
}

/**
 * Whether the desk may send one more email to this address right now.
 *
 * Called at the point of sending rather than at the point of accepting, which
 * is what makes it a single ceiling across the portal, the mailbox, and
 * anything added later: a new route that emails somebody inherits the limit
 * without having to remember it.
 *
 * `exempt` is the escalation list, passed in rather than read here so this
 * file keeps knowing nothing about who the team are. Matching folds the same
 * way the counting does, so an exemption cannot be dodged by spelling a team
 * address differently, and cannot be missed because it was.
 */
export async function mayEmailRecipient(
  db: D1Database,
  toEmail: string,
  exempt: readonly string[],
  now: Date = new Date(),
): Promise<RateLimitOutcome> {
  const subject = meteringSubject(toEmail);
  if (exempt.some((address) => meteringSubject(address) === subject)) {
    return { allowed: true, count: 0, retryAfterSeconds: 0 };
  }
  return consumeRateLimit(db, 'outbound_recipient', subject, now);
}

/**
 * Drops windows that have long since rolled.
 *
 * Called from the cron pass rather than from a request, because it is
 * housekeeping and nobody is waiting on it. Without it the table grows one
 * row per distinct caller forever, which is slow to matter and never stops
 * mattering once it does.
 */
export async function purgeRateLimits(db: D1Database, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  try {
    await db.prepare('DELETE FROM rate_limits WHERE window_start <= ?1').bind(cutoff).run();
  } catch (error) {
    console.warn('rate limit purge failed:', error instanceof Error ? error.message : String(error));
  }
}

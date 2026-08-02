import type { Env } from './types.js';

// Who counts as an agent, decided here as well as in Cloudflare Access.
//
// The JWT check in access.ts proves an assertion is genuine and was issued
// for this application, and then trusts whoever it names. That made a single
// Access policy the entire answer to "who may read every requester's name,
// address and ticket text", and a policy is one dashboard click from being
// different, in a place that leaves no trace in this repository and no line
// in a diff.
//
// This is the same argument the country check already won: the WAF rule is
// the real control and `geo.ts` checks the same list anyway, because a
// control that exists in exactly one place fails silently. The console was
// the one surface where that argument had not been applied, which is
// backwards, because it is the surface with the data on it.

/**
 * The addresses allowed into the console, or an empty list when none is set.
 *
 * A secret rather than a var in wrangler.jsonc: that file is public, and a
 * list of the people who can read the support queue is a list of the accounts
 * worth phishing. The same reasoning as ESCALATION_RECIPIENTS.
 */
export function adminAllowlist(env: Env): string[] {
  return (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((address) => address.trim().toLowerCase())
    .filter((address) => address.includes('@'));
}

/**
 * Whether this verified Access identity may use the console.
 *
 * Empty allowlist means "not configured", and that returns true. It is worth
 * being explicit about why, because a security check that defaults to
 * permitting looks like a mistake.
 *
 * This desk shipped without an allowlist and Access is genuinely enforcing in
 * front of it. Making an unset variable a hard refusal would therefore turn
 * the deploy that introduces this file into a lockout of the only two people
 * who can reach the console, with the fix requiring the console they can no
 * longer reach to diagnose. Failing closed is the right instinct and it is
 * the wrong trade when the thing being closed is the door you are standing
 * behind.
 *
 * The honest middle is to refuse quietly to nobody and loudly to everybody:
 * unset permits, and every page says the second lock is off. A control that
 * announces it is not running is not the same as one that pretends.
 *
 * Comparison is exact after lowercasing, and deliberately does not fold
 * plus-tags or dots the way the rate limiter does. Folding widens a set, and
 * widening is the wrong direction for a list of people who may read other
 * people's data.
 */
export function isAllowedAgent(email: string, env: Env): boolean {
  const allowed = adminAllowlist(env);
  if (allowed.length === 0) return true;
  return allowed.includes(email.trim().toLowerCase());
}

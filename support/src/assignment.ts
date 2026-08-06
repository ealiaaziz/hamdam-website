import type { Env } from './types.js';
import { adminAllowlist } from './adminAccess.js';
import { isValidEmail } from './validation.js';
import { SENDER } from './mailer.js';

// Who owns a ticket, and who is told when nobody does.
//
// The `assigned_to` column has been in the schema since the first migration
// and nothing ever wrote to it. That was survivable while every ticket the
// assistant could not finish went to a mailing list: somebody would pick it
// up, or somebody would assume somebody had. This file is what turns that
// assumption into a record.
//
// One thing here is a security boundary rather than bookkeeping, and it is
// worth saying before the code says it: `assigned_to` grants the right to
// write on a ticket by email, and to have those words sent to the requester
// under the desk's own domain. See `planInbound`. So the set of addresses it
// may ever hold has to be a configured set, checked here, and never an
// address that arrived in a request. Anything looser and "assign" becomes a
// way to hand a stranger the desk's outbound mail.

/**
 * The engineer escalations are allocated to.
 *
 * A secret set with `wrangler secret put L3_ENGINEER_EMAIL`, not a var in
 * wrangler.jsonc, and not a default in this file. Both of those are public,
 * and this is a named individual's personal address attached to a named
 * product, next to a sentence explaining that they are the person who answers
 * the escalations. That is a spearphishing target assembled and hosted for
 * free, which is exactly the mistake `escalationRecipients` was written to
 * undo.
 *
 * Unset returns null, which means escalations are still raised and still
 * emailed, they are simply not allocated to anybody. Loud rather than silent:
 * the console carries a banner while this is the case, for the same reason it
 * does for `ADMIN_EMAILS`.
 */
export function l3Engineer(env: Env): string | null {
  const configured = (env.L3_ENGINEER_EMAIL ?? '').trim().toLowerCase();
  return isValidEmail(configured) ? configured : null;
}

/**
 * Every address a ticket may be assigned to.
 *
 * The L3 engineer plus the console allowlist, which is the set of people who
 * can already read and answer any ticket. Nothing else, and in particular
 * nothing that came out of a form: assignment confers inbound write
 * authority, so this list is the whole of the answer to who can obtain it.
 *
 * An empty `ADMIN_EMAILS` does not widen this the way it widens the console.
 * There it had to permit, because a hard refusal on an unset variable would
 * have locked out the only people who could set it. Here refusing costs
 * nothing: a signed-in agent can still assign a ticket to themselves, which
 * `mayBeAssigned` allows through the caller rather than through this list.
 */
export function assignableAddresses(env: Env): string[] {
  const l3 = l3Engineer(env);
  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const candidate of [...(l3 ? [l3] : []), ...adminAllowlist(env)]) {
    const address = candidate.trim().toLowerCase();
    if (!address || seen.has(address)) continue;
    seen.add(address);
    addresses.push(address);
  }
  return addresses;
}

/**
 * Whether this address may be written into `assigned_to`.
 *
 * Exact after lowercasing, and deliberately not folded the way the rate
 * limiter folds addresses. Folding widens a set. Widening is right for
 * counting and wrong for deciding who somebody is, and this decides who
 * somebody is.
 */
export function mayBeAssigned(email: string, env: Env): boolean {
  const candidate = email.trim().toLowerCase();
  if (!candidate) return false;
  return assignableAddresses(env).includes(candidate);
}

/**
 * Who hears about tickets nobody has picked up.
 *
 * Comma-separated, a secret for the same reason as the L3 address, and
 * falling back to the desk's own monitored mailbox rather than to nobody. An
 * unset variable turning off the sweep's only output would make it a job that
 * runs, costs a query, and reports to no one, which is worse than not having
 * it: it looks like coverage.
 */
export function unassignedAlertRecipients(env: Env): string[] {
  const configured = (env.UNASSIGNED_ALERT_RECIPIENTS ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter((address) => isValidEmail(address));
  return configured.length > 0 ? configured : [SENDER];
}

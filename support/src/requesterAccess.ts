import type { Env } from './types.js';

// Who is allowed to open a ticket at all.
//
// Hamdam's desk answers the public, and should: somebody who bought the app
// has no account here and no reason to have one, so the portal takes no
// credential and the mailbox takes mail from anyone. Every control on that
// surface is a rate rather than an identity, which is the right shape for it.
//
// A desk that supports one business's staff is the opposite. There are five
// people who may raise a ticket and everyone else in the world is noise or
// worse: an open internal desk is a mailbox that opens tickets, spends a
// model budget and sends mail out over that customer's domain for anybody who
// finds the address.
//
// Both desks are the same code, so the difference is configuration. Unset
// means public, because that is Hamdam and changing it silently would be the
// worse failure. Set means only these people.

export type RequesterRule =
  | { kind: 'domain'; value: string }
  | { kind: 'address'; value: string };

/**
 * Parses the configured list into rules.
 *
 * Three accepted forms, because all three are what somebody writes without
 * being told: `example.org`, `@example.org`, and `person@example.org`. The
 * first two are the same rule; the third is one person, which is how a
 * contractor or an external bookkeeper gets in without their whole domain.
 */
export function parseRequesterRules(configured: string | undefined): RequesterRule[] {
  return (configured ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .map((entry): RequesterRule | null => {
      if (entry.startsWith('@')) {
        const domain = entry.slice(1);
        return domain.includes('.') ? { kind: 'domain', value: domain } : null;
      }
      const at = entry.indexOf('@');
      if (at > 0) return { kind: 'address', value: entry };
      // No local part and no leading @: a bare domain.
      return entry.includes('.') ? { kind: 'domain', value: entry } : null;
    })
    .filter((rule): rule is RequesterRule => rule !== null);
}

export function requesterRules(env: Env): RequesterRule[] {
  return parseRequesterRules(env.REQUESTER_ALLOWLIST);
}

/** True when this deployment restricts who may open a ticket. */
export function requesterAllowlistConfigured(env: Env): boolean {
  return requesterRules(env).length > 0;
}

/**
 * Whether this address may open a ticket on this desk.
 *
 * An empty list permits everyone. That is not a control failing open, it is
 * the public desk this code was written for, and the console says which mode
 * a deployment is in rather than leaving it to be inferred.
 *
 * Comparison is exact after lowercasing. No plus-tag stripping, no dot
 * folding, and no subdomain matching: `mail.example.org` does not satisfy a
 * rule for `example.org`. Every one of those would widen the set of people
 * who count as staff, and this is the check that decides exactly that. The
 * rate limiter folds addresses because counting wants a wide net; this is the
 * other kind of question, and it stays literal for the same reason
 * `sameAddress` and the ADMIN_EMAILS check do.
 */
export function isAllowedRequester(email: string, env: Env): boolean {
  const rules = requesterRules(env);
  if (rules.length === 0) return true;

  const candidate = email.trim().toLowerCase();
  const at = candidate.lastIndexOf('@');
  if (at <= 0 || at === candidate.length - 1) return false;
  const domain = candidate.slice(at + 1);

  return rules.some((rule) => (rule.kind === 'domain' ? rule.value === domain : rule.value === candidate));
}

/** How the console describes the current mode, in one line. */
export function describeRequesterAccess(env: Env): string {
  const rules = requesterRules(env);
  if (rules.length === 0) return 'Open to anyone: any address may raise a ticket.';
  const domains = rules.filter((r) => r.kind === 'domain').map((r) => `@${r.value}`);
  const addresses = rules.filter((r) => r.kind === 'address').map((r) => r.value);
  return `Restricted to ${[...domains, ...addresses].join(', ')}.`;
}

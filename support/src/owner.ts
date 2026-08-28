import type { Env } from './types.js';
import { sameAddress } from './inbound.js';

/**
 * Who the channel owner is, and who is copied on what the desk says to her.
 *
 * Both addresses are personal, and this repository is public. escalation.ts
 * records what writing two of them into a source file cost the last time: a
 * private Gmail and a private Outlook address, attached to a named product,
 * in a file that says out loud who reads the security reports. So they live
 * in secrets and this file only ever reads them.
 *
 *   npx wrangler secret put OWNER_EMAILS        # the channel owner
 *   npx wrangler secret put DEVELOPER_CC_EMAIL  # copied on her thread only
 */

/**
 * The owner's address, as configured. A list, because a person can have two.
 *
 * Compared literally, never folded. `meteringSubject` in rateLimit.ts strips
 * plus-tags and folds Google's dots, and that is right for counting, because
 * otherwise one inbox is unlimited buckets. It is wrong here for the reason
 * that file already gives: folding widens a set, which is right for counting
 * and wrong for deciding who somebody is.
 *
 * That has one practical consequence worth knowing before it puzzles someone.
 * Google treats `first.last@gmail.com` and `firstlast@gmail.com` as the same
 * mailbox, and this does not. If the owner ever sends from the other spelling
 * the gate fails closed: her mail becomes an ordinary ticket, nothing is
 * dispatched, and the effect is silence rather than a wrong action. The fix
 * is to list both spellings in the secret, which keeps the widening explicit
 * and reviewable instead of hidden in a comparison.
 */
export function ownerEmails(env: Env): string[] {
  return (env.OWNER_EMAILS ?? '')
    .split(',')
    .map((address) => address.trim().toLowerCase())
    .filter((address) => address.includes('@'));
}

/** Whether this address is the channel owner's. */
export function isOwner(env: Env, email: string): boolean {
  return ownerEmails(env).some((owner) => sameAddress(owner, email));
}

/**
 * The address to copy on a message, or null.
 *
 * Scoped to the owner's mail and nothing else, which is the whole point. The
 * developer wants to see the thread with her; copying him on every reply the
 * desk sends would publish his personal address to every stranger who ever
 * writes in, one message at a time, and there is no taking that back. A
 * requester who is not the owner is never copied to anyone.
 */
export function developerCc(env: Env, toEmail: string): string | null {
  const cc = (env.DEVELOPER_CC_EMAIL ?? '').trim();
  if (!cc.includes('@')) return null;
  if (!isOwner(env, toEmail)) return null;
  // Never copy someone on their own mail.
  if (sameAddress(cc, toEmail)) return null;
  return cc;
}

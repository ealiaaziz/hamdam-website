import { stripHtml, parseTicketPublicId } from './ids.js';
import { SENDER, type InboundMessage } from './mailer.js';

// Turning an email into a ticket, or into a reply on one.
//
// This was the hourly Routine's job, and the Routine was a Claude session
// holding database credentials and a mailbox, reading text written by
// strangers, on a schedule whose floor was one hour. It worked. It was also
// the slowest and least predictable thing in the system, and the only part
// where attacker-authored text met tools.
//
// Here the same work is a function. It cannot be talked into anything,
// because it does not read the email as instructions; it reads a sender, a
// subject and a body, and the only decisions it makes are which ticket this
// belongs to and what to store. The assistant that composes a reply runs
// afterwards, behind the same guards the portal uses.

/** The desk's own address, in every form it might appear. */
export function isFromTheDesk(fromEmail: string): boolean {
  return fromEmail.trim().toLowerCase() === SENDER.toLowerCase();
}

/**
 * The ticket a subject line refers to, if it names one.
 *
 * Replies come back as "RE: [HAM-14] ..." and that tag is the only reliable
 * thread key when a conversation id is missing, which happens whenever
 * someone forwards the mail or replies from a different client.
 */
export function ticketIdFromSubject(subject: string): number | null {
  const match = /\bHAM-(\d+)\b/i.exec(subject);
  return match ? parseTicketPublicId(`HAM-${match[1]}`) : null;
}

/**
 * The part of a reply the person actually typed.
 *
 * Without this, every reply on a thread re-ingests the entire history: the
 * assistant reads three copies of the original problem, the ticket fills with
 * quoted text, and the model's context is mostly its own previous answers
 * bounced back at it.
 *
 * Deliberately conservative. Cutting too little leaves some quoted text on
 * the ticket, which is untidy. Cutting too much loses what someone wrote,
 * which is the whole point of the message, so every marker here has to be
 * one that genuinely only appears above quoted history.
 */
const QUOTE_MARKERS = [
  /^\s*-{2,}\s*Original Message\s*-{2,}/im,
  /^\s*_{5,}\s*$/m,
  /^\s*On .{0,80}\bwrote:\s*$/im,
  /^\s*From:\s*.+\bSent:\s*/ims,
  /^\s*>{1,}\s/m,
  /^\s*Get Outlook for \w+/im,
];

export function stripQuotedReply(text: string): string {
  let cut = text.length;
  for (const marker of QUOTE_MARKERS) {
    const match = marker.exec(text);
    if (match && match.index < cut) cut = match.index;
  }
  const kept = text.slice(0, cut).trim();
  // If stripping took everything, the markers were wrong about this message
  // and the original is better than nothing.
  return kept.length > 0 ? kept : text.trim();
}

/** Email body as the plain text a ticket comment should hold. */
export function messageBodyText(message: InboundMessage): string {
  return stripQuotedReply(stripHtml(message.bodyHtml)).slice(0, 8000);
}

export type InboundPlan =
  | { action: 'skip'; reason: string }
  | { action: 'append'; ticketId: number; body: string }
  | { action: 'create'; body: string };

/**
 * What to do with one message, given what the database already knows.
 *
 * Pure, so the interesting cases are testable without a mailbox: mail from
 * the desk itself, mail already processed, a reply naming a ticket, a reply
 * carrying only a conversation id, and something genuinely new.
 */
export function planInbound(
  message: InboundMessage,
  known: { alreadyProcessed: boolean; ticketIdForConversation: number | null; ticketExists: (id: number) => boolean },
): InboundPlan {
  // The desk's own outgoing mail, and its own notifications to itself. Left
  // unchecked this is an infinite loop: the desk emails a requester, reads
  // its own message, files it as a ticket, and acknowledges it.
  if (isFromTheDesk(message.fromEmail)) return { action: 'skip', reason: 'from the desk itself' };
  if (!message.fromEmail) return { action: 'skip', reason: 'no sender address' };

  // The ledger is the guard against a retried run duplicating everything.
  if (known.alreadyProcessed) return { action: 'skip', reason: 'already processed' };

  const body = messageBodyText(message);
  if (!body) return { action: 'skip', reason: 'empty body' };

  // Subject tag first: it survives forwarding and client changes, whereas a
  // conversation id does not.
  const tagged = ticketIdFromSubject(message.subject);
  if (tagged !== null && known.ticketExists(tagged)) return { action: 'append', ticketId: tagged, body };

  if (known.ticketIdForConversation !== null) {
    return { action: 'append', ticketId: known.ticketIdForConversation, body };
  }

  return { action: 'create', body };
}

/** Subject with any [HAM-N] tag removed, for a ticket created from email. */
export function cleanSubject(subject: string): string {
  return (
    subject
      .replace(/\[?\bHAM-\d+\b\]?/gi, '')
      .replace(/^\s*(re|fw|fwd)\s*:\s*/gi, '')
      .trim() || '(no subject)'
  );
}

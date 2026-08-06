import type { Env } from './types.js';
import { escalationEmail } from './render/escalation.js';
import { requesterReplyNotification } from './render/email.js';
import { sendMail, SENDER } from './mailer.js';
import { l3Engineer, unassignedAlertRecipients } from './assignment.js';
import { addComment, assignTicket, getAgentState, getTicketById, listComments, markOutboundFailed, markOutboundSent, queueOutboundEmail } from './db.js';

// Telling a person that a ticket is now theirs.
//
// The assistant hands over often, and by design: every P1 and P2, anything
// it cannot source, anyone who asks for a human. Until now the handover was
// a status change in a database nobody was watching, which is the same as no
// handover at all. The requester was told "a person will pick this up" and
// that was, strictly, a hope.

/**
 * Where an alert goes when nothing has been configured.
 *
 * The desk's own mailbox, which is monitored and is already printed on every
 * page. It used to be the two team members' personal addresses, written into
 * this file, and this repository is public: that published a private Gmail
 * and a private Outlook address, attached to a named product, in a file that
 * says out loud that these are the people who read the security reports. That
 * is a spearphishing target list, assembled and hosted at no cost to whoever
 * wanted it.
 *
 * The real recipients now come from ESCALATION_RECIPIENTS, set with
 * `wrangler secret put`. A secret rather than a var in wrangler.jsonc for the
 * same reason: that file is public too.
 *
 * Falling back to the desk inbox rather than to nothing matters. An
 * escalation that reaches a monitored mailbox late is a delay; an escalation
 * that reaches nobody because a secret was not set is the alert that never
 * arrives, which is the failure this whole file exists to prevent.
 */
export const FALLBACK_ESCALATION_RECIPIENTS = ['developer@hamdam.com.au'];

/**
 * Addresses the outbound-recipient ceiling must never apply to.
 *
 * The ceiling exists to stop a stranger being mailed by this desk more than
 * they agreed to. It has no business throttling the desk's own mail to
 * itself, and applied there it becomes a mute button: the "requester replied"
 * notice goes to this mailbox, ten an hour is shared across every ticket, and
 * anyone could spend that budget on their own ticket in a couple of minutes
 * and silence the notifications for everybody else's.
 *
 * That is a hole this session opened, adding the ceiling this morning, and it
 * is the shape worth remembering: a control that bounds an attacker's reach
 * usually bounds the defender's too, and the defender is the one who notices
 * later.
 */
export function unmeteredRecipients(env: Env): string[] {
  const l3 = l3Engineer(env);
  return [
    ...escalationRecipients(env),
    // The allocated engineer and the people chased about unowned work, for
    // exactly the reason the escalation list is exempt: these are the
    // messages whose whole purpose is to arrive, and metering them lets a
    // busy hour silence the thing that says the hour is busy.
    ...(l3 ? [l3] : []),
    ...unassignedAlertRecipients(env),
    'developer@hamdam.com.au',
  ];
}

export function escalationRecipients(env: Env): string[] {
  const configured = (env.ESCALATION_RECIPIENTS ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter((address) => address.includes('@'));
  return configured.length > 0 ? configured : FALLBACK_ESCALATION_RECIPIENTS;
}

/**
 * Tells the ticket's owner that their requester has written again.
 *
 * Allocation without this is a one-off announcement: the engineer is emailed
 * the handover, and every message after it is visible only in a console they
 * were specifically given a way to avoid. They would find out that the
 * requester answered their question by going and looking, which is the habit
 * the whole allocation was meant to replace.
 *
 * Not metered at the recipient, for the same reason the handover is not: this
 * is mail to the person who has to act, and a busy hour must not be able to
 * silence it. What bounds it is upstream, where it should be, at the caller:
 * the portal's reply limit and the inbound sender limit both cap how fast one
 * requester can produce these.
 *
 * Does nothing when the ticket has no owner. That case is not silence, it is
 * the unassigned sweep's, and doubling it up here would mean two emails about
 * the same missing person.
 *
 * Never throws. The requester's message is already recorded; failing to
 * forward a notification must not undo that.
 */
export async function notifyAssignedAgent(
  env: Env,
  ticketId: number,
  message: string,
  via: 'portal' | 'email' = 'portal',
): Promise<void> {
  try {
    const ticket = await getTicketById(env.DB, ticketId);
    const assignee = ticket?.assigned_to?.trim();
    if (!ticket || !assignee) return;

    // A ticket assigned to the desk's own mailbox needs nothing from here. On
    // the portal path that mailbox already receives the "requester replied"
    // notice, and on the email path the requester's message is literally
    // sitting in it. Either way a second copy is the same information twice,
    // addressed to the same inbox.
    if (assignee.toLowerCase() === SENDER.toLowerCase()) return;

    const rendered = requesterReplyNotification({
      ticketId,
      subject: ticket.subject,
      requesterName: ticket.requester_name,
      requesterEmail: ticket.requester_email,
      message,
      adminUrl: `https://support.hamdam.com.au/admin/tickets/${ticketId}`,
      via,
      toAssignee: true,
    });

    const id = await queueOutboundEmail(env.DB, {
      ticketId,
      commentId: null,
      kind: 'requester_reply',
      toEmail: assignee,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      inReplyToMessageId: null,
    });
    const result = await sendMail(env, { toEmail: assignee, subject: rendered.subject, bodyHtml: rendered.html });
    if (result.sent) await markOutboundSent(env.DB, id);
    else await markOutboundFailed(env.DB, id, result.reason);
  } catch (error) {
    console.error(`assignee notice for ${ticketId} failed:`, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Everyone who should be told, with the allocated engineer first and nobody
 * told twice.
 *
 * The L3 address is almost certainly also on the escalation list, and two
 * copies of the same handover is how a person learns to skim them. Compared
 * case-insensitively, because "the same address in different case" is the
 * duplicate this actually has to catch.
 */
export function escalationAudience(env: Env, assignedTo: string | null): string[] {
  const seen = new Set<string>();
  const audience: string[] = [];
  for (const candidate of [...(assignedTo ? [assignedTo] : []), ...escalationRecipients(env)]) {
    const key = candidate.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    audience.push(candidate.trim());
  }
  return audience;
}

/**
 * Allocates a ticket to the L3 engineer and tells everyone who needs to know.
 *
 * Once per ticket, not once per escalated reply. The caller decides that by
 * only calling when the ticket was not already escalated, because a requester
 * adding three messages to a handed-over ticket should not produce three
 * identical alerts, and an alert that arrives repeatedly stops being read.
 *
 * The allocation is the part that was missing. Until now a handover was a
 * status change plus an email to a list, which is to say it was addressed to
 * whoever felt like it, and the file said as much: "a person will pick this
 * up" was, strictly, a hope. Now the ticket has a name on it before the alert
 * goes out, the alert says whose it is, and the sweep in sweep.ts can tell
 * the difference between work that has an owner and work that does not.
 *
 * Only into an empty slot, so a person who has already taken the ticket keeps
 * it. And only when `L3_ENGINEER_EMAIL` is set: unset means the alert still
 * goes out, unallocated, and the console says why.
 *
 * Never throws. A failure here must not roll back the reply the requester has
 * already been shown; the row is left in the queue with its reason attached,
 * which is what the console surfaces.
 */
export async function notifyEscalation(env: Env, ticketId: number, reason: string): Promise<void> {
  try {
    const ticket = await getTicketById(env.DB, ticketId);
    if (!ticket) return;

    // Allocate first, then read the ticket's owner back from what actually
    // happened rather than from what was intended. If somebody already owns
    // it, the email has to name them, not the person the update did not go to.
    const l3 = l3Engineer(env);
    let assignedTo = ticket.assigned_to?.trim() || null;
    if (l3 && !assignedTo) {
      const allocated = await assignTicket(env.DB, ticketId, l3, { onlyIfUnassigned: true });
      if (allocated) {
        assignedTo = l3;
        // On the ticket, not only in a log. Whoever opens this later needs to
        // see that the allocation was automatic and what triggered it.
        await addComment(env.DB, ticketId, 'system', null, `Escalated to L3 and allocated to ${l3}: ${reason}`);
      }
    }

    const [comments, state] = await Promise.all([listComments(env.DB, ticketId), getAgentState(env.DB, ticketId)]);
    const base = 'https://support.hamdam.com.au';

    const rendered = escalationEmail({
      ticket: { ...ticket, assigned_to: assignedTo },
      comments,
      reason,
      assignedTo,
      rejectedArticles: state.rejectedArticles,
      askedQuestions: state.askedQuestions,
      assistantTurns: state.assistantTurns,
      trackingUrl: `${base}/tickets/${ticketId}?token=${encodeURIComponent(ticket.tracking_token)}`,
      adminUrl: `${base}/admin/tickets/${ticketId}`,
    });

    // One row per recipient. They are different people who may act on it
    // separately, and a shared row would go 'failed' for both if one address
    // bounced.
    for (const toEmail of escalationAudience(env, assignedTo)) {
      const id = await queueOutboundEmail(env.DB, {
        ticketId,
        commentId: null,
        kind: 'status_change',
        toEmail,
        subject: rendered.subject,
        bodyHtml: rendered.html,
        inReplyToMessageId: null,
      });
      const result = await sendMail(env, { toEmail, subject: rendered.subject, bodyHtml: rendered.html });
      if (result.sent) await markOutboundSent(env.DB, id);
      else await markOutboundFailed(env.DB, id, result.reason);
    }
  } catch (error) {
    console.error(`escalation notice for ${ticketId} failed:`, error instanceof Error ? error.message : String(error));
  }
}

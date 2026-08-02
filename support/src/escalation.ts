import type { Env } from './types.js';
import { escalationEmail } from './render/escalation.js';
import { sendMail } from './mailer.js';
import { getAgentState, getTicketById, listComments, markOutboundFailed, markOutboundSent, queueOutboundEmail } from './db.js';

// Telling a person that a ticket is now theirs.
//
// The assistant hands over often, and by design: every P1 and P2, anything
// it cannot source, anyone who asks for a human. Until now the handover was
// a status change in a database nobody was watching, which is the same as no
// handover at all. The requester was told "a person will pick this up" and
// that was, strictly, a hope.

/** Who gets told. Overridable, because the team will change before the code does. */
export const DEFAULT_ESCALATION_RECIPIENTS = ['azizollahi@live.com', 'binesh.fce19@gmail.com'];

export function escalationRecipients(env: Env): string[] {
  const configured = (env.ESCALATION_RECIPIENTS ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter((address) => address.includes('@'));
  return configured.length > 0 ? configured : DEFAULT_ESCALATION_RECIPIENTS;
}

/**
 * Emails the team that a ticket needs them.
 *
 * Once per ticket, not once per escalated reply. The caller decides that by
 * only calling when the ticket was not already escalated, because a requester
 * adding three messages to a handed-over ticket should not produce three
 * identical alerts, and an alert that arrives repeatedly stops being read.
 *
 * Never throws. A failure here must not roll back the reply the requester has
 * already been shown; the row is left in the queue with its reason attached,
 * which is what the console surfaces.
 */
export async function notifyEscalation(env: Env, ticketId: number, reason: string): Promise<void> {
  try {
    const ticket = await getTicketById(env.DB, ticketId);
    if (!ticket) return;

    const [comments, state] = await Promise.all([listComments(env.DB, ticketId), getAgentState(env.DB, ticketId)]);
    const base = 'https://support.hamdam.com.au';

    const rendered = escalationEmail({
      ticket,
      comments,
      reason,
      rejectedArticles: state.rejectedArticles,
      askedQuestions: state.askedQuestions,
      assistantTurns: state.assistantTurns,
      trackingUrl: `${base}/tickets/${ticketId}?token=${encodeURIComponent(ticket.tracking_token)}`,
      adminUrl: `${base}/admin/tickets/${ticketId}`,
    });

    // One row per recipient. They are different people who may act on it
    // separately, and a shared row would go 'failed' for both if one address
    // bounced.
    for (const toEmail of escalationRecipients(env)) {
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

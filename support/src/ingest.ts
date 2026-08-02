import type { Env } from './types.js';
import { classifyTicket, slaDueDates } from './itil.js';
import { generateTrackingToken } from './ids.js';
import { fetchInbox, sendMail, canSendDirectly, SENDER, type InboundMessage } from './mailer.js';
import { cleanSubject, planInbound } from './inbound.js';
import { composeAssistantReplyLive, ASSISTANT_NAME } from './assistantReply.js';
import { requestedClosure } from './agentPolicy.js';
import { ackEmail } from './render/email.js';
import { assistantWrittenEmail } from './render/agentEmail.js';
import {
  addComment,
  claimModelCall,
  createTicket,
  DEFAULT_DAILY_CALL_LIMIT,
  getAgentState,
  getCheckpoint,
  getTicketById,
  listComments,
  markOutboundFailed,
  markOutboundSent,
  queueOutboundEmail,
  recordAssistantTurn,
  recordInbound,
  setCheckpoint,
  setLastInboundMessageId,
  setSyncState,
  ticketExists,
  ticketIdForConversation,
  updateTicketStatus,
  upsertRequester,
  wasProcessed,
  type NewOutboundEmail,
} from './db.js';

// The inbox, read by the Worker on a schedule it controls.
//
// This replaces the hourly Routine. Not because the Routine was broken --
// it ran clean -- but because of what it was: a Claude session holding
// database credentials and a mailbox, reading text written by strangers, on
// a cadence whose floor was one hour. Someone emailing this desk waited up
// to sixty minutes to learn their message had even arrived, and unlike the
// portal there was no page to reassure them in the meantime.
//
// A cron trigger every minute is not quite instant and is close enough that
// nobody will notice the difference. What it is, definitely, is boring:
// a function, with the same guards as the portal path, that cannot be
// argued out of anything by the contents of an email.

const BATCH_LIMIT = 25;

export interface IngestSummary {
  fetched: number;
  created: number;
  appended: number;
  skipped: number;
  failed: number;
}

function dailyCallLimit(env: Env): number {
  const configured = Number(env.ASSISTANT_DAILY_CALL_LIMIT);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_DAILY_CALL_LIMIT;
}

/** Queue a row, then try to deliver it now. Same contract as the portal's. */
async function queueAndSend(env: Env, email: NewOutboundEmail): Promise<void> {
  const id = await queueOutboundEmail(env.DB, email);
  const result = await sendMail(env, { toEmail: email.toEmail, subject: email.subject, bodyHtml: email.bodyHtml });
  if (result.sent) await markOutboundSent(env.DB, id);
  else await markOutboundFailed(env.DB, id, result.reason);
}

function ticketUrl(ticketId: number, token: string): string {
  return `https://support.hamdam.com.au/tickets/${ticketId}?token=${encodeURIComponent(token)}`;
}

/**
 * Runs the assistant on a ticket and emails what it says.
 *
 * Identical to the portal path in everything that matters: same guards, same
 * grounding, same refusal to answer a Hamdam question from general
 * knowledge. The one difference is that here the reply is also emailed,
 * because there is no page the requester is watching.
 *
 * Which makes this the place the earlier "draft first" decision would have
 * applied. It does not, any more, and the reason is that the same words now
 * go to the portal instantly with no review either. Holding the email while
 * publishing the identical text on a page would be theatre. What actually
 * protects the requester is upstream: P1 and P2 never reach the model, a
 * Hamdam answer must cite a source, and anything claiming a person acted is
 * thrown away.
 */
async function replyWithAssistant(env: Env, ticketId: number): Promise<void> {
  const ticket = await getTicketById(env.DB, ticketId);
  if (!ticket) return;

  const comments = await listComments(env.DB, ticketId);
  const state = await getAgentState(env.DB, ticketId);
  const conversationText = [ticket.subject, ...comments.filter((m) => m.author_type === 'requester').map((m) => m.body)].join('\n');

  const reply = await composeAssistantReplyLive(
    {
      priority: ticket.priority,
      conversationText,
      assistantTurns: state.assistantTurns,
      askedQuestions: state.askedQuestions,
      rejectedArticles: state.rejectedArticles,
      alreadyEscalated: state.escalated,
      topic: ticket.topic,
    },
    {
      ai: env.AI,
      ticketSubject: ticket.subject,
      turns: comments
        .filter((m) => m.author_type === 'requester' || m.author_type === 'agent')
        .map((m) => ({ author: m.author_type === 'requester' ? ('requester' as const) : ('assistant' as const), body: m.body })),
      claim: () => claimModelCall(env.DB, dailyCallLimit(env)),
    },
  );

  const commentId = await addComment(env.DB, ticketId, 'agent', ASSISTANT_NAME, reply.body);
  await recordAssistantTurn(env.DB, ticketId, {
    question: reply.question,
    action: reply.action,
    articleId: reply.articleId,
    reason: reply.reason,
    escalated: reply.escalated,
  });
  if (reply.escalated && ticket.status === 'new') await updateTicketStatus(env.DB, ticketId, 'open');

  const rendered = assistantWrittenEmail({
    ticketId,
    subject: ticket.subject,
    body: reply.body,
    requesterName: ticket.requester_name,
    trackingUrl: ticketUrl(ticketId, ticket.tracking_token),
  });
  await queueAndSend(env, {
    ticketId,
    commentId,
    kind: 'agent_reply',
    toEmail: ticket.requester_email,
    subject: rendered.subject,
    bodyHtml: rendered.html,
    inReplyToMessageId: ticket.last_inbound_message_id,
  });
}

async function handleMessage(env: Env, message: InboundMessage): Promise<'created' | 'appended' | 'skipped'> {
  const plan = planInbound(message, {
    alreadyProcessed: await wasProcessed(env.DB, message.internetMessageId),
    ticketIdForConversation: await ticketIdForConversation(env.DB, message.conversationId),
    ticketExists: () => true,
  });

  // planInbound asks whether a tagged ticket exists; resolve it for real
  // rather than assuming, so a subject naming HAM-999 does not append to
  // nothing and silently vanish.
  if (plan.action === 'append' && !(await ticketExists(env.DB, plan.ticketId))) {
    return handleAsNew(env, message, plan.body);
  }

  if (plan.action === 'skip') {
    await recordInbound(env.DB, {
      internetMessageId: message.internetMessageId,
      conversationId: message.conversationId,
      ticketId: null,
      fromEmail: message.fromEmail,
      subject: message.subject,
    });
    return 'skipped';
  }

  if (plan.action === 'append') {
    await addComment(env.DB, plan.ticketId, 'requester', message.fromName, plan.body);
    await setLastInboundMessageId(env.DB, plan.ticketId, message.internetMessageId);
    await recordInbound(env.DB, {
      internetMessageId: message.internetMessageId,
      conversationId: message.conversationId,
      ticketId: plan.ticketId,
      fromEmail: message.fromEmail,
      subject: message.subject,
    });

    // Same rule as the portal: a request to close is carried out, not
    // described. An assistant that says "closing that for you" and leaves it
    // open is worse than one that says nothing.
    if (requestedClosure(plan.body)) {
      await updateTicketStatus(env.DB, plan.ticketId, 'closed');
      await addComment(env.DB, plan.ticketId, 'agent', ASSISTANT_NAME, 'Closed, as you asked. Reply to this email if it comes up again and the ticket reopens.');
      return 'appended';
    }

    await replyWithAssistant(env, plan.ticketId);
    return 'appended';
  }

  return handleAsNew(env, message, plan.body);
}

async function handleAsNew(env: Env, message: InboundMessage, body: string): Promise<'created'> {
  const subject = cleanSubject(message.subject);
  const requester = await upsertRequester(env.DB, message.fromEmail, message.fromName);

  // Email carries no impact/urgency picker, so the matrix gets the neutral
  // reading and the keywords do the rest. A Hamdam ticket still cannot fall
  // below P3, and a security report still reads as P1, exactly as from the
  // portal.
  const { priority, topic } = classifyTicket('medium', 'medium', `${subject}\n${body}`);
  const now = new Date();
  const { firstResponseDue, resolveDue } = slaDueDates(priority, now);
  const trackingToken = generateTrackingToken();

  const ticketId = await createTicket(env.DB, {
    requesterId: requester.id,
    subject,
    priority,
    impact: null,
    urgency: null,
    category: null,
    channel: 'email',
    topic,
    trackingToken,
    sourceConversationId: message.conversationId,
    lastInboundMessageId: message.internetMessageId,
    createdAt: now.toISOString(),
    slaFirstResponseDue: firstResponseDue,
    slaResolveDue: resolveDue,
  });

  await addComment(env.DB, ticketId, 'requester', message.fromName, body);
  await recordInbound(env.DB, {
    internetMessageId: message.internetMessageId,
    conversationId: message.conversationId,
    ticketId,
    fromEmail: message.fromEmail,
    subject: message.subject,
  });

  const ack = ackEmail({
    ticketId,
    subject,
    priority,
    trackingUrl: ticketUrl(ticketId, trackingToken),
    requesterName: requester.name,
  });
  await queueAndSend(env, {
    ticketId,
    commentId: null,
    kind: 'ack',
    toEmail: requester.email,
    subject: ack.subject,
    bodyHtml: ack.html,
    inReplyToMessageId: message.internetMessageId,
  });

  await replyWithAssistant(env, ticketId);
  return 'created';
}

/**
 * One pass over the inbox.
 *
 * The checkpoint moves only after the batch is done, and only to the newest
 * message actually processed. Advancing it optimistically would turn a
 * single failed run into permanently unread mail, which is the failure that
 * goes unnoticed until someone asks why they were ignored.
 *
 * One message failing does not stop the others, for the same reason.
 */
export async function ingestInbox(env: Env): Promise<IngestSummary> {
  const summary: IngestSummary = { fetched: 0, created: 0, appended: 0, skipped: 0, failed: 0 };
  if (!canSendDirectly(env)) return summary;

  const since = await getCheckpoint(env.DB);
  const messages = await fetchInbox(env, since, BATCH_LIMIT);
  summary.fetched = messages.length;
  if (messages.length === 0) return summary;

  let highWater = since;
  for (const message of messages) {
    try {
      const outcome = await handleMessage(env, message);
      summary[outcome === 'created' ? 'created' : outcome === 'appended' ? 'appended' : 'skipped']++;
      if (message.receivedAt > highWater) highWater = message.receivedAt;
    } catch (error) {
      summary.failed++;
      console.error(`ingest ${message.internetMessageId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Only past messages that worked. A failure holds the line so the next run
  // sees the same message again, and the ledger stops the successful ones
  // from being handled twice.
  if (summary.failed === 0) await setCheckpoint(env.DB, highWater);
  await setSyncState(env.DB, 'last_ingest_summary', JSON.stringify(summary));
  return summary;
}

export { SENDER };

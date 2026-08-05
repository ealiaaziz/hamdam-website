import type { Env } from './types.js';
import { classifyTicket, slaDueDates } from './itil.js';
import { generateTrackingToken } from './ids.js';
import { fetchInbox, fetchMessageHeaders, markRead, sendMail, canSendDirectly, SENDER, type InboundMessage } from './mailer.js';
import { cleanSubject, planInbound, sameAddress, ticketIdFromSubject, type KnownThread } from './inbound.js';
import { consumeRateLimit, mayEmailRecipient, meteringSubject } from './rateLimit.js';
import { senderIsAuthenticated } from './authResults.js';
import { unmeteredRecipients } from './escalation.js';
import { detectLocale, strings } from './i18n.js';
import { HEARTBEAT_KEY } from './heartbeat.js';
import { composeAssistantReplyLive, ASSISTANT_NAME } from './assistantReply.js';
import { requestedClosure } from './agentPolicy.js';
import { notifyEscalation } from './escalation.js';
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
  clearInboundFailure,
  markOutboundFailed,
  markOutboundSent,
  recordInboundFailure,
  queueOutboundEmail,
  recordAssistantTurn,
  recordInbound,
  setCheckpoint,
  setLastInboundMessageId,
  setSyncState,
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
  /** Handled, but the read flag would not stick. Usually a missing permission. */
  unread: number;
  /** Failed too many times and given up on, so the rest of the queue can move. */
  abandoned: number;
}

/**
 * How many times one message is retried before the desk moves past it.
 *
 * Three, which at a one minute cron is three minutes of retrying. Long enough
 * for a blip in D1 or Graph, short enough that a message which will never
 * work does not hold three minutes of mail hostage, let alone all of it.
 */
const MAX_MESSAGE_ATTEMPTS = 3;

function dailyCallLimit(env: Env): number {
  const configured = Number(env.ASSISTANT_DAILY_CALL_LIMIT);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_DAILY_CALL_LIMIT;
}

/** Queue a row, then try to deliver it now. Same contract as the portal's. */
async function queueAndSend(env: Env, email: NewOutboundEmail): Promise<void> {
  const id = await queueOutboundEmail(env.DB, email);

  // How much mail one address may receive from this desk, counted here
  // because here is the one place every path passes through. The row is
  // still written and still visible in the console: what stops is delivery,
  // and it stops with a reason attached rather than disappearing.
  const allowance = await mayEmailRecipient(env.DB, email.toEmail, unmeteredRecipients(env));
  if (!allowance.allowed) {
    await markOutboundFailed(env.DB, id, `recipient hourly limit reached (${allowance.count})`);
    return;
  }

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
      locale: ticket.locale,
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
  // Only on the transition, same as the portal: state was read before the
  // reply, so this is the ticket's first handover and not a repeat.
  if (reply.escalated && !state.escalated) await notifyEscalation(env, ticketId, reply.reason);

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

/** The ticket a candidate id names, with the one fact routing needs about it. */
async function knownThread(env: Env, id: number | null): Promise<KnownThread | null> {
  if (id === null) return null;
  const ticket = await getTicketById(env.DB, id);
  return ticket ? { id: ticket.id, requesterEmail: ticket.requester_email } : null;
}

async function handleMessage(env: Env, message: InboundMessage): Promise<'created' | 'appended' | 'skipped'> {
  // Both candidate threads are resolved for real before routing, rather than
  // assumed and re-checked afterwards. planInbound needs to know who owns
  // each one to decide whether this sender may write to it, and a lookup that
  // returns null also answers the older question of whether it exists at all:
  // a subject naming HAM-999 now falls through to a new ticket instead of
  // appending to nothing.
  const [taggedTicket, conversationTicket] = await Promise.all([
    knownThread(env, ticketIdFromSubject(message.subject)),
    knownThread(env, await ticketIdForConversation(env.DB, message.conversationId)),
  ]);

  // Authentication costs a Graph call, so it is only paid where it changes
  // the answer: when some existing thread would otherwise accept this
  // message. Everything else opens a new ticket, where the From address is
  // recorded rather than believed and proving it establishes nothing.
  const claimsAThread = [taggedTicket, conversationTicket].some(
    (thread) => thread && sameAddress(thread.requesterEmail, message.fromEmail),
  );
  let senderAuthenticated = false;
  if (claimsAThread) {
    const verdict = senderIsAuthenticated(await fetchMessageHeaders(env, message.id), message.fromEmail);
    senderAuthenticated = verdict.authenticated;
    if (!verdict.authenticated) {
      console.warn(`inbound ${message.internetMessageId}: not appending, sender unauthenticated (${verdict.reason})`);
    }
  }

  const plan = planInbound(message, {
    // Scoped to this sender. The id is the sender's own Message-ID, so an
    // unscoped ledger lets anyone insert a row under an id somebody else
    // will later use and have that message silently skipped.
    alreadyProcessed: await wasProcessed(env.DB, message.internetMessageId, message.fromEmail),
    taggedTicket,
    conversationTicket,
    senderAuthenticated,
  });

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

  // Everything below files the message either way. What this decides is
  // whether the desk also answers by itself, which is the part that costs a
  // model call and puts mail in somebody's inbox.
  //
  // Anything found in the junk folder is filed and never answered, and that
  // asymmetry is the whole reason reading junk is safe.
  //
  // Not reading it gave Exchange's spam filter a silent veto over which
  // customers get support: a misclassified email was not delayed or flagged,
  // it was invisible, permanently. Reading it and replying normally would be
  // the opposite mistake and a worse one, because the desk would answer
  // spam from an address that passes SPF, DKIM and DMARC for this domain,
  // confirm the mailbox is live to whoever sent it, and spend the day's model
  // budget doing it.
  //
  // Filed-but-silent is the honest middle. The message becomes a ticket a
  // person can see and act on in the console, the requester gets nothing
  // automatic, and if it turns out to be a real customer a human replies and
  // the thread works normally from there.
  const fromJunk = message.folder === 'junk';
  const quiet = fromJunk || !(await automatedRepliesAllowed(env, message.fromEmail));

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
      const closing = await getTicketById(env.DB, plan.ticketId);
      await addComment(env.DB, plan.ticketId, 'agent', ASSISTANT_NAME, strings(closing?.locale ?? 'en').replyClosed);
      return 'appended';
    }

    if (quiet) await noteSuppressed(env, plan.ticketId, fromJunk);
    else await replyWithAssistant(env, plan.ticketId);
    return 'appended';
  }

  return handleAsNew(env, message, plan.body, quiet, fromJunk);
}

/**
 * Whether the desk should answer this sender by itself right now.
 *
 * False is not a refusal to help. The message is still read, still filed,
 * still in the queue, and still in the mailbox. All that stops is the desk
 * generating outbound mail in response, which is the only part an unmetered
 * sender can turn into volume.
 */
async function automatedRepliesAllowed(env: Env, fromEmail: string): Promise<boolean> {
  const outcome = await consumeRateLimit(env.DB, 'inbound_sender', meteringSubject(fromEmail));
  return outcome.allowed;
}

/**
 * Records, on the ticket, that the desk deliberately said nothing.
 *
 * Written as a system note rather than only logged, because the alternative
 * is a ticket that looks like the assistant simply failed. Whoever opens it
 * needs to know the silence was a decision and roughly why.
 */
async function noteSuppressed(env: Env, ticketId: number, fromJunk = false): Promise<void> {
  const reason = fromJunk
    ? 'This arrived in the junk folder, so the desk filed it without replying. That is deliberate: answering a message the spam filter rejected would confirm this mailbox to whoever sent it. If it is a real request, replying here works normally and the thread continues as usual.'
    : 'Automatic replies are paused for this sender: more messages arrived in the last hour than the desk answers by itself. Nothing has been lost, and a person replying here works normally.';
  await addComment(env.DB, ticketId, 'system', null, reason);
}

async function handleAsNew(env: Env, message: InboundMessage, body: string, quiet = false, fromJunk = false): Promise<'created'> {
  const subject = cleanSubject(message.subject);
  const requester = await upsertRequester(env.DB, message.fromEmail, message.fromName);

  // Email carries no impact/urgency picker, so the matrix gets the neutral
  // reading and the keywords do the rest. A Hamdam ticket still cannot fall
  // below P3, and a security report still reads as P1, exactly as from the
  // portal.
  const { priority, topic } = classifyTicket('medium', 'medium', `${subject}\n${body}`);
  // Answer people in the language they wrote in. Email carries no locale, so
  // the text is the only signal there is.
  const locale = detectLocale(`${subject}\n${body}`);
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
    locale,
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

  if (quiet) {
    await noteSuppressed(env, ticketId, fromJunk);
    return 'created';
  }

  const ack = ackEmail({
    ticketId,
    subject,
    priority,
    trackingUrl: ticketUrl(ticketId, trackingToken),
    requesterName: requester.name,
    locale,
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
  const summary: IngestSummary = { fetched: 0, created: 0, appended: 0, skipped: 0, failed: 0, unread: 0, abandoned: 0 };
  if (!canSendDirectly(env)) return summary;

  const since = await getCheckpoint(env.DB);

  // Why a run failed is written to the database, not only to the log.
  // Worker logs need a websocket to tail, which is exactly the thing that is
  // unavailable when you most want it, and "the inbox is not being read" is
  // otherwise indistinguishable from "nobody has emailed".
  let messages: Awaited<ReturnType<typeof fetchInbox>>;
  try {
    messages = await fetchInbox(env, since, BATCH_LIMIT);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await setSyncState(env.DB, 'last_ingest_error', `${new Date().toISOString()} ${reason}`.slice(0, 400));
    throw error;
  }
  await setSyncState(env.DB, 'last_ingest_error', '');

  // The heartbeat, written here and not at the end.
  //
  // Here is the moment the desk has demonstrably read its mailbox: the
  // credentials worked, Graph answered, and whatever it said is the truth
  // about the inbox. What happens to the messages afterwards is a separate
  // question with its own signals.
  //
  // It has to be before the empty-inbox return below, because that return is
  // the whole bug. On a quiet mailbox this function used to write nothing at
  // all, so a desk with no mail and a desk with a dead cron left identical
  // traces, and the difference between them is the difference between a quiet
  // week and customers being ignored.
  await setSyncState(env.DB, HEARTBEAT_KEY, new Date().toISOString());

  summary.fetched = messages.length;
  if (messages.length === 0) return summary;

  let highWater = since;
  for (const message of messages) {
    try {
      const outcome = await handleMessage(env, message);
      summary[outcome === 'created' ? 'created' : outcome === 'appended' ? 'appended' : 'skipped']++;
      await clearInboundFailure(env.DB, message.internetMessageId);
      if (message.receivedAt > highWater) highWater = message.receivedAt;

      // Only now, and for skips too. A bounce or a piece of the desk's own
      // mail has been dealt with just as much as a real ticket has, and
      // leaving those unread would fill the mailbox with exactly the traffic
      // nobody needs to look at.
      //
      // Failing to mark read is untidy, not broken. The work is already done
      // and recorded, so it is logged and the run continues rather than
      // being rolled back over a flag.
      const marked = await markRead(env, message.id);
      if (!marked.sent) {
        summary.unread++;
        console.warn(`ingest: could not mark ${message.internetMessageId} read: ${marked.reason}`);
      }
    } catch (error) {
      // Retry a few times, then stop letting one message hold the queue.
      //
      // The checkpoint advancing only on a clean pass is deliberate and
      // right: a transient failure must be seen again rather than skipped.
      // Read literally it also means a message that fails *every* time holds
      // the line forever, and since the batch is ordered oldest first from
      // the checkpoint, that message is in every batch and nothing behind it
      // is ever processed. One crafted email stops the desk receiving mail,
      // and the mailbox looks entirely normal while it happens.
      //
      // Three attempts is three minutes. After that the message is left
      // unread, in the mailbox, with the reason recorded, and the queue moves.
      // Giving up loudly on one message beats going quiet on all of them.
      const reason = error instanceof Error ? error.message : String(error);
      const attempts = await recordInboundFailure(env.DB, message.internetMessageId, reason);
      console.error(`ingest ${message.internetMessageId} (attempt ${attempts}): ${reason}`);

      if (attempts < MAX_MESSAGE_ATTEMPTS) {
        summary.failed++;
      } else {
        summary.abandoned++;
        if (message.receivedAt > highWater) highWater = message.receivedAt;
      }
    }
  }

  // Surfaced in the database, because the likely cause is a missing
  // permission rather than a transient error, and a permission does not fix
  // itself while nobody is looking.
  if (summary.abandoned > 0) {
    await setSyncState(
      env.DB,
      'last_ingest_error',
      `${new Date().toISOString()} gave up on ${summary.abandoned} message(s) after ${MAX_MESSAGE_ATTEMPTS} attempts, see inbound_failures`,
    );
  }

  if (summary.unread > 0) {
    await setSyncState(env.DB, 'last_ingest_error', `${new Date().toISOString()} could not mark ${summary.unread} message(s) read, check Mail.ReadWrite`);
  }

  // Only past messages that worked. A failure holds the line so the next run
  // sees the same message again, and the ledger stops the successful ones
  // from being handled twice.
  if (summary.failed === 0) await setCheckpoint(env.DB, highWater);
  await setSyncState(env.DB, 'last_ingest_summary', JSON.stringify(summary));
  return summary;
}

export { SENDER };

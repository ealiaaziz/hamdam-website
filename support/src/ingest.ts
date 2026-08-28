import type { Env } from './types.js';
import { classifyTicket, slaDueDates } from './itil.js';
import { generateTrackingToken } from './ids.js';
import { fetchInbox, fetchMessageHeaders, markRead, sendMail, canSendDirectly, SENDER, type InboundMessage } from './mailer.js';
import { cleanSubject, planInbound, ticketIdFromSubject, type KnownThread } from './inbound.js';
import { consumeRateLimit, mayEmailRecipient, meteringSubject } from './rateLimit.js';
import { senderIsAuthenticated } from './authResults.js';
import { unmeteredRecipients } from './escalation.js';
import { detectLocale, strings } from './i18n.js';
import { HEARTBEAT_KEY } from './heartbeat.js';
import { composeAssistantReplyLive, ASSISTANT_NAME } from './assistantReply.js';
import { requestedClosure } from './agentPolicy.js';
import { maybeDispatch, relayReply } from './botDispatch.js';
import { developerCc } from './owner.js';
import { notifyEscalation } from './escalation.js';
import { ackEmail } from './render/email.js';
import { assistantWrittenEmail } from './render/agentEmail.js';
import {
  acquireIngestLock,
  addComment,
  claimModelCall,
  createTicket,
  releaseIngestLock,
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
// The same cleaners the portal applies to a stranger's form input. Email is
// also a stranger's input, and until 2026-08-07 it reached storage without
// them: nothing under inbound.ts or ingest.ts imported validation.ts, so a
// subject or a display name arriving by mail kept its control characters, its
// bidi overrides and its unbounded length. The build record's bidi note
// described the portal only, and email is the channel that is not
// geo-restricted and needs no browser.
import { cleanLine, cleanText, MAX_BODY_CHARS, MAX_NAME_CHARS, MAX_SUBJECT_CHARS } from './validation.js';

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
  /**
   * Filed, but answered by nobody: junk, an unauthenticated sender, or a
   * ceiling reached.
   *
   * Counted because the alternative was a `console.warn` and a comment on a
   * ticket, and neither of those adds up to a number anyone will ever look at.
   * Suppression is the quietest thing this desk does, and the sender
   * authentication gate added on 2026-08-08 can raise it without any other
   * symptom: the mailbox looks normal, the queue fills normally, and the only
   * visible difference is that requesters stop being answered. That is the
   * exact shape of the failures `heartbeat.ts` exists to make visible, so it
   * gets a counter, and the counter lands in `last_ingest_summary` where the
   * console already reads it.
   */
  suppressed: number;
  /** Of those, the ones the sending domain could not be authenticated for. */
  unauthenticated: number;
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

/**
 * Queue a row, then try to deliver it now. Same contract as the portal's.
 *
 * Exported because the bot follow-up pass sends through it too. It is the one
 * place the recipient ceiling, the copy to the developer and the failure
 * bookkeeping all live, and a second sender that skipped them would be the one
 * outbound path with no limit on it.
 */
export async function queueAndSend(env: Env, email: NewOutboundEmail): Promise<void> {
  // Decided here rather than at each call site, because here is the one place
  // every outbound path already passes through, and a copy that depends on a
  // caller remembering is a copy that is missing from whichever path is added
  // next. developerCc returns null for everyone who is not the owner.
  const withCopy = { ...email, ccEmail: email.ccEmail ?? developerCc(env, email.toEmail) };
  const id = await queueOutboundEmail(env.DB, withCopy);

  // How much mail one address may receive from this desk, counted here
  // because here is the one place every path passes through. The row is
  // still written and still visible in the console: what stops is delivery,
  // and it stops with a reason attached rather than disappearing.
  const allowance = await mayEmailRecipient(env.DB, withCopy.toEmail, unmeteredRecipients(env));
  if (!allowance.allowed) {
    await markOutboundFailed(env.DB, id, `recipient hourly limit reached (${allowance.count})`);
    return;
  }

  // The copy rides along with the message and is deliberately not metered
  // separately. The ceiling above exists to stop a stranger being mailed more
  // than they agreed to; the developer copied on his own desk's mail is not
  // that, and counting him would make the ceiling a mute button on the trail
  // he is copied in to read, which is the same mistake unmeteredRecipients
  // exists to prevent.
  const result = await sendMail(env, {
    toEmail: withCopy.toEmail,
    ccEmail: withCopy.ccEmail,
    subject: withCopy.subject,
    bodyHtml: withCopy.bodyHtml,
  });
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
      // Same pair as the portal path, and it matters more here: the caller is
      // an email address nobody has to prove they own, so without a
      // per-ticket bound one thread is an unbounded claim on a shared daily
      // budget. Per-ticket first, so a ticket over its own limit does not
      // also spend a call off the day's to discover that.
      claim: async () =>
        (await consumeRateLimit(env.DB, 'model_call_ticket', String(ticketId))).allowed &&
        (await claimModelCall(env.DB, dailyCallLimit(env))),
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

async function handleMessage(env: Env, message: InboundMessage, summary: IngestSummary): Promise<'created' | 'appended' | 'skipped'> {
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

  // Every message pays for the verdict now, not only the ones that claim an
  // existing thread.
  //
  // The old rule paid for it when some thread would otherwise accept the
  // message, on the reasoning that a new ticket merely *records* the From
  // address rather than believing it, so proving it establishes nothing. That
  // reasoning was true about filing and wrong about everything the desk does
  // next. A brand new ticket also produces an acknowledgement and, straight
  // after it, a model-written reply, and both are sent automatically to
  // whatever address the From header names, from developer@hamdam.com.au,
  // over a connection that DKIM-signs them as this domain. So anyone able to
  // write a From line could point two pieces of mail this domain vouches for
  // at an inbox of their choosing, and have a language model compose the
  // second one. The From address was not believed; it was replied to, which
  // is the same thing with a stamp on it.
  //
  // One extra Graph call per message is a small price against that, and the
  // verdict is wanted on both paths anyway: appending needs it to decide
  // ownership, and creating needs it to decide whether to answer.
  //
  // "Exchange says no" and "we could not ask Exchange" are different answers,
  // and this used to conflate them. `fetchMessageHeaders` returns an empty
  // array on a 401, a 429, a timeout or any other throw; it never raises. Fed
  // straight into `senderIsAuthenticated` that reads as "no
  // Authentication-Results", which reads as unauthenticated, which suppressed
  // the reply and wrote a note on the ticket stating as fact that the sending
  // domain had failed authentication. On a ten second Graph timeout that
  // sentence is simply untrue, and it is untrue permanently, on a ticket an
  // agent will read and repeat to a customer.
  //
  // So an empty header list is treated as a transient failure of this pass
  // rather than as a verdict about the sender. It is raised below, once the
  // cheap skips have run, and the existing three-attempt retry loop deals with
  // it: three passes is three minutes, which comfortably outlasts a Graph
  // blip. A message that never yields headers is abandoned loudly into
  // `inbound_failures` with the reason attached, which is this file's
  // preference throughout: give up in a way somebody notices, rather than
  // carry on in a way nobody does.
  const headers = await fetchMessageHeaders(env, message.id);
  const headersAvailable = headers.length > 0;
  const verdict = headersAvailable
    ? senderIsAuthenticated(headers, message.fromEmail)
    : { authenticated: false, reason: 'Graph returned no headers for this message' };
  const senderAuthenticated = verdict.authenticated;
  if (!senderAuthenticated && headersAvailable) {
    console.warn(
      `inbound ${message.internetMessageId}: sender unauthenticated (${verdict.reason}); filing without an automated reply`,
    );
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

  // Raised here and not thirty lines earlier, deliberately.
  //
  // A great deal of what arrives never needed a verdict at all: the desk's own
  // outbound mail bouncing back into the inbox, delivery notifications, and
  // messages the ledger has already seen. Throwing before the skip would put
  // every one of those into `inbound_failures`, retry each three times, and
  // leave the mailbox filling with unread machine mail, which would be a new
  // failure invented to protect against an old one. Skipping is the right
  // answer for them whether or not Graph was reachable.
  //
  // Nothing has been written for this message at this point, so raising here
  // costs the pass and nothing else. The Graph call itself has already been
  // paid for, which is the one piece of waste in this ordering and is the
  // price of `planInbound` needing the verdict to decide routing.
  if (!headersAvailable) {
    throw new Error(
      `could not read Authentication-Results for ${message.internetMessageId}: Graph returned no headers, so whether the sender is authentic is unknown`,
    );
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
  //
  // A sender the domain could not authenticate gets the same treatment, and
  // for a closely related reason. The desk's automatic mail is signed as
  // hamdam.com.au and arrives with this domain's reputation behind it, so
  // sending it to an address nobody has proved control of is lending that
  // reputation to a stranger's choice of recipient. Filing costs nothing and
  // loses nothing; replying is the part that has to be earned.
  const fromJunk = message.folder === 'junk';
  const quiet = fromJunk || !senderAuthenticated || !(await automatedRepliesAllowed(env, message.fromEmail));
  const suppression: SuppressionReason = fromJunk ? 'junk' : !senderAuthenticated ? 'unauthenticated' : 'rate';

  if (plan.action === 'append') {
    // Cleaned on this path too. An append has already proved the sender is the
    // ticket's owner, but ownership is not a reason to trust the bytes: the
    // comment is rendered in the console and quoted back into email.
    await addComment(
      env.DB,
      plan.ticketId,
      'requester',
      cleanLine(message.fromName, MAX_NAME_CHARS) || null,
      cleanText(plan.body, MAX_BODY_CHARS),
    );
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

    // A reply on a ticket that has already dispatched may answer the change
    // last put to her, and may tell the agent something it needs. Both are
    // handled inside, and neither depends on the assistant having run.
    const botFlowOwns = await relayReply(env, {
      ticketId: plan.ticketId,
      subject: message.subject,
      body: plan.body,
      fromEmail: message.fromEmail,
      senderAuthenticated,
    });

    // One voice per ticket. The assistant answers from articles about the app
    // and holds none about the bot, so on a ticket the change flow owns it can
    // only produce something generic or a handover to a person who is not
    // coming, on top of the desk's own reply. Both are noise, and the second
    // is worse than noise because it is untrue.
    if (quiet) await noteSuppressed(env, plan.ticketId, summary, suppression, verdict.reason);
    else if (!botFlowOwns) await replyWithAssistant(env, plan.ticketId);
    return 'appended';
  }

  return handleAsNew(env, message, plan.body, summary, quiet, suppression, verdict.reason, senderAuthenticated);
}

/**
 * Whether the desk should answer this sender by itself right now.
 *
 * False is not a refusal to help. The message is still read, still filed,
 * still in the queue, and still in the mailbox. All that stops is the desk
 * generating outbound mail in response, which is the only part an unmetered
 * sender can turn into volume.
 *
 * Both buckets have to agree, and the global one is the load-bearing half.
 *
 * The per-sender ceiling reads like the real control and is not one. Its key
 * is `meteringSubject(fromEmail)`, and `fromEmail` here is an unauthenticated
 * `From` header: a line of text the sending client writes, which an attacker
 * changes between messages at no cost. Twenty per sender is therefore twenty
 * multiplied by however many addresses somebody feels like typing, which is
 * not a ceiling, it is a unit of measurement. Every per-key limit on an
 * attacker-chosen key has this shape, and the only fix is a limit with no
 * key in it.
 *
 * So the global bucket bounds the desk's automated mail as a whole, and the
 * per-sender one stays because it still does the job it was written for:
 * stopping one genuine, correctly-authenticated correspondent in a loop from
 * consuming the global allowance that everybody else shares.
 *
 * The global one is consumed first and deliberately so. Both are consumed on
 * every call whatever the outcome, which is the same "refused attempts still
 * count" rule the rest of the limiter follows, and it is what stops a caller
 * already over the line from resetting a window by continuing to hammer it.
 *
 * Worth knowing when reading the counters back: this is not called at all for
 * a message from the junk folder or from a sender Exchange could not
 * authenticate, because the caller short-circuits before it. Those are
 * suppressed without spending anything, so `automated_reply_global` counts the
 * messages the desk was willing to answer rather than every message it
 * declined to. `summary.suppressed` is the number that counts all of them.
 */
async function automatedRepliesAllowed(env: Env, fromEmail: string): Promise<boolean> {
  const global = await consumeRateLimit(env.DB, 'automated_reply_global', 'desk');
  const sender = await consumeRateLimit(env.DB, 'inbound_sender', meteringSubject(fromEmail));
  if (!global.allowed) {
    console.warn(`ingest: automated replies paused, the desk is over its hourly ceiling (${global.count})`);
  }
  return global.allowed && sender.allowed;
}

/** Why the desk filed a message without answering it. */
type SuppressionReason = 'junk' | 'unauthenticated' | 'rate';

/**
 * The note itself, as a function of what actually happened.
 *
 * The unauthenticated one takes Exchange's own words rather than paraphrasing
 * them, and that is a correction rather than a flourish. It used to state
 * flatly that "there was no aligned SPF or DKIM result on it", which is one
 * of several things that can be true when the verdict comes back negative and
 * is not true at all when it came back `dmarc=fail` or `unaligned or failing:
 * dkim=fail spf=softfail`. An agent reads this note and repeats it to a
 * customer, so it has to say what happened rather than the most likely thing
 * that happened.
 */
const SUPPRESSION_NOTES: Record<SuppressionReason, (detail: string) => string> = {
  junk: () =>
    'This arrived in the junk folder, so the desk filed it without replying. That is deliberate: answering a message the spam filter rejected would confirm this mailbox to whoever sent it. If it is a real request, replying here works normally and the thread continues as usual.',
  unauthenticated: (detail) =>
    `Exchange could not confirm that this message really came from the address in its From line, so the desk filed the ticket and deliberately did not reply automatically. Its verdict was: ${detail}. The reason the desk stays quiet is that an automatic reply is signed as hamdam.com.au and would be going to an address a stranger could have chosen. Replying here by hand works normally and the thread continues as usual.`,
  rate: () =>
    'Automatic replies are paused: more mail arrived in the last hour than the desk answers by itself, either from this sender or across the desk as a whole. Nothing has been lost, and a person replying here works normally.',
};

/**
 * Records, on the ticket, that the desk deliberately said nothing.
 *
 * Written as a system note rather than only logged, because the alternative
 * is a ticket that looks like the assistant simply failed. Whoever opens it
 * needs to know the silence was a decision and roughly why.
 */
async function noteSuppressed(
  env: Env,
  ticketId: number,
  summary: IngestSummary,
  reason: SuppressionReason = 'rate',
  detail = '',
): Promise<void> {
  // Counted here rather than where `quiet` is decided, so the counter and the
  // note cannot disagree. Deciding to be quiet is not the same as being quiet:
  // an appended message asking the desk to close the ticket is answered with
  // `replyClosed` and never reaches this function, so counting it at the
  // decision would have reported a suppression that visibly did not happen.
  summary.suppressed++;
  if (reason === 'unauthenticated') summary.unauthenticated++;
  await addComment(env.DB, ticketId, 'system', null, SUPPRESSION_NOTES[reason](detail));
}

async function handleAsNew(
  env: Env,
  message: InboundMessage,
  rawBody: string,
  summary: IngestSummary,
  quiet = false,
  suppression: SuppressionReason = 'rate',
  suppressionDetail = '',
  senderAuthenticated = false,
): Promise<'created'> {
  // cleanSubject strips the [HAM-N] tag and the Re:/Fwd: prefix; cleanLine is
  // what makes the result safe to display, and the display is the point: the
  // subject and the sender's name are what an agent reads in the console queue
  // and in the escalation email when deciding what a ticket is.
  // Clean first, strip the tag second. The other order has a trap: a zero-width
  // character inside a "[HAM-42]" tag breaks cleanSubject's \bHAM-\d+\b match so
  // the tag survives, and cleanLine then removes the zero-width, leaving a
  // stored subject that reads "[HAM-42]" on a ticket with no relation to
  // HAM-42. Cosmetic rather than a routing bug, because ticketIdFromSubject
  // always parses the live inbound header and never a stored subject, but it
  // puts a false tag in front of the agent reading the queue.
  const subject = cleanSubject(cleanLine(message.subject, MAX_SUBJECT_CHARS));
  const fromName = cleanLine(message.fromName, MAX_NAME_CHARS) || null;
  const body = cleanText(rawBody, MAX_BODY_CHARS);
  const requester = await upsertRequester(env.DB, message.fromEmail, fromName);

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

  // The ledger row goes in the moment the ticket exists, before anything
  // else on this path can throw.
  //
  // It used to be written after the first comment, which reads as tidier and
  // is the wrong order. `wasProcessed` at the top of handleMessage is what
  // stops a message being handled twice, and it only knows what the ledger
  // has been told. A crash anywhere between createTicket and the write left
  // a real ticket in the database and no ledger row against it, so the retry
  // loop saw a fresh message, made a second ticket, and on the third attempt
  // a third: one email, three tickets, and the requester's history split
  // across them. Recording first means a retry appends nothing and skips,
  // which is the outcome a duplicate should have.
  await recordInbound(env.DB, {
    internetMessageId: message.internetMessageId,
    conversationId: message.conversationId,
    ticketId,
    fromEmail: message.fromEmail,
    subject: message.subject,
  });

  await addComment(env.DB, ticketId, 'requester', fromName, body);

  if (quiet) {
    await noteSuppressed(env, ticketId, summary, suppression, suppressionDetail);
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

  // After the acknowledgement, so she is answered whatever happens here, and
  // before the assistant, so the console shows the dispatch above the reply
  // that talks about it.
  const botFlowOwns = await maybeDispatch(env, {
    ticketId,
    subject,
    body,
    fromEmail: message.fromEmail,
    senderAuthenticated,
  });

  // See the same decision on the reply path: the acknowledgement above already
  // told her the desk has it, and the next thing she should hear is the change
  // itself, in Farsi, rather than an article about the app.
  if (!botFlowOwns) await replyWithAssistant(env, ticketId);
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
 *
 * One pass at a time, too. The cron fires every sixty seconds and a full
 * batch takes minutes, so without the lock the normal case is several passes
 * running at once over the same checkpoint, duplicating tickets,
 * acknowledgements, model calls and outbound mail. See `acquireIngestLock`
 * for why it expires rather than being held.
 */
export async function ingestInbox(env: Env): Promise<IngestSummary> {
  const summary: IngestSummary = {
    fetched: 0,
    created: 0,
    appended: 0,
    skipped: 0,
    failed: 0,
    unread: 0,
    abandoned: 0,
    suppressed: 0,
    unauthenticated: 0,
  };
  if (!canSendDirectly(env)) return summary;

  // Losing the race is a normal outcome, not an error. The mail is still
  // there, the pass that holds the lock is reading it, and if that pass dies
  // the lock expires and the next cron takes over. So: the empty summary and
  // nothing written anywhere that would make a healthy desk look broken. An
  // acquire that fails because D1 could not answer is a different thing and
  // does write `last_ingest_error`; that happens inside `acquireIngestLock`,
  // which is the only place that can tell the two apart.
  const holding = await acquireIngestLock(env.DB);
  if (!holding) return summary;

  try {
    return await ingestPass(env, summary);
  } finally {
    // Handing the holding back is what makes this a release rather than a
    // clear. A pass that overran its TTL no longer owns the lock, and must
    // not free the one the next cron is holding.
    await releaseIngestLock(env.DB, holding);
  }
}

/** The pass itself, with the lock already held. */
async function ingestPass(env: Env, summary: IngestSummary): Promise<IngestSummary> {
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
      const outcome = await handleMessage(env, message, summary);
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

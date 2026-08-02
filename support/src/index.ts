import { Hono } from 'hono';
import type { Env } from './types.js';
import { APP_CSS } from './render/styles.js';
import { submitFormPage, trackLookupPage } from './render/portal.js';
import { ticketStatusPage } from './render/status.js';
import { adminQueuePage, adminTicketPage } from './render/admin.js';
import { classifyTicket, parsePriority, slaDueDates, type Impact, type Urgency } from './itil.js';
import { ackEmail, agentReplyEmail, conversationSummaryEmail, requesterReplyNotification, resolvedEmail } from './render/email.js';
import { assistantWrittenEmail } from './render/agentEmail.js';
import { generateTrackingToken, parseTicketPublicId, stripHtml, ticketPublicId } from './ids.js';
import { httpsRedirectTarget, isCrossSiteRequest, isLocalHost, trackingUrl } from './urls.js';
import { extractAccessToken, fetchAccessKeys, verifyAccessJwt } from './access.js';
import { KB_ARTICLES } from './kb.js';
import { suggestionBlock } from './render/agentSuggestion.js';

import { composeAssistantReplyLive, ASSISTANT_NAME } from './assistantReply.js';
import {
  addComment,
  approveDraft,
  claimModelCall,
  DEFAULT_DAILY_CALL_LIMIT,
  getAgentState,
  recordAssistantTurn,
  recordRejectedArticle,
  discardDraft,
  listDrafts,
  queueAssistantDraft,
  createTicket,
  getTicketById,
  listComments,
  listQueue,
  markFirstResponse,
  queueOutboundEmail,
  updateTicketPriority,
  updateTicketStatus,
  upsertRequester,
} from './db.js';
import { parseTicketStatus, type CommentRow, type TicketWithRequester } from './types.js';

// The desk's own mailbox. Notifications about ticket activity go here, and
// the routine must ignore inbound mail from this address so the desk does
// not ingest its own outgoing email as requester replies.
const SUPPORT_INBOX = 'developer@hamdam.com.au';

/**
 * The thread as the assistant should see it: what the requester wrote and
 * what has been written back, in order.
 *
 * System notes are dropped. They are the desk talking to itself ("requester
 * reported that article X did not help") and feeding them in as dialogue
 * would have the assistant answering its own bookkeeping. The rejection they
 * record still reaches the model, as state rather than as conversation.
 */
function threadTurns(comments: readonly CommentRow[]): { author: 'requester' | 'assistant'; body: string }[] {
  return comments
    .filter((m) => m.author_type === 'requester' || m.author_type === 'agent')
    .map((m) => ({ author: m.author_type === 'requester' ? ('requester' as const) : ('assistant' as const), body: m.body }));
}

/**
 * How many model calls the desk may make today. Configurable because the
 * right number is a spending decision, not an engineering one; the default
 * is a day of ordinary traffic with headroom, not a day of abuse.
 */
function dailyCallLimit(env: Env): number {
  const configured = Number(env.ASSISTANT_DAILY_CALL_LIMIT);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_DAILY_CALL_LIMIT;
}

/**
 * Queues the one outbound update this desk sends a requester mid-ticket.
 *
 * Called at the points where the conversation has actually settled: they
 * said it worked, a person took it over, or they asked for it. Not on every
 * turn. The portal is where the fast back-and-forth happens and they are
 * watching it; an email per turn would be a pile of half-finished threads
 * about a problem that has since moved on.
 */
async function queueConversationSummary(
  db: D1Database,
  ticket: TicketWithRequester,
  comments: readonly CommentRow[],
  status: 'resolved' | 'with_a_person' | 'in_progress',
  requestUrl: string,
): Promise<void> {
  const turns = comments
    .filter((m) => m.author_type === 'requester' || m.author_type === 'agent')
    .map((m) => ({ who: m.author_type === 'requester' ? ('you' as const) : ('support' as const), body: m.body }));

  const rendered = conversationSummaryEmail({
    ticketId: ticket.id,
    subject: ticket.subject,
    priority: ticket.priority,
    requesterName: ticket.requester_name,
    trackingUrl: trackingUrl(requestUrl, ticket.id, ticket.tracking_token),
    status,
    turns,
  });

  await queueOutboundEmail(db, {
    ticketId: ticket.id,
    commentId: null,
    kind: 'status_change',
    toEmail: ticket.requester_email,
    subject: rendered.subject,
    bodyHtml: rendered.html,
    inReplyToMessageId: ticket.last_inbound_message_id,
  });
}

const app = new Hono<{ Bindings: Env; Variables: { agentEmail: string } }>();

// Redirect http to https before anything else runs, and never serve a
// ticket over plaintext.
//
// Cloudflare's "Always Use HTTPS" zone setting should catch this at the
// edge (README covers turning it on) and Universal SSL provisions the
// certificate automatically, but a zone setting is one dashboard toggle
// away from being off. This Worker is the last thing that can still
// refuse, and the stakes here are higher than on the marketing site: the
// tracking token in /tickets/:id?token=... is the only credential guarding
// a ticket, so one plaintext request leaks a working credential.
//
// HSTS below is not a substitute. Browsers ignore a Strict-Transport-Security
// header delivered over plaintext http, and it does nothing on a first-ever
// visit -- the redirect is what makes that first request safe.
//
// CF-Ray, not the hostname, is what tells us this is a real edge request:
// `wrangler dev` reports the custom domain as the Host, so a hostname check
// would 301 local development to production. See httpsRedirectTarget.
app.use('*', async (c, next) => {
  const target = httpsRedirectTarget(c.req.url, c.req.header('cf-ray') !== undefined);
  if (target) return c.redirect(target, 301);

  await next();
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
});

// ---- static -----------------------------------------------------------

app.get('/static/app.css', (c) => c.text(APP_CSS, 200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=3600' }));

// ---- public portal ------------------------------------------------------

app.get('/', (c) => c.html(submitFormPage()));

app.post('/tickets', async (c) => {
  const form = await c.req.formData();
  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const subject = String(form.get('subject') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const impact = (String(form.get('impact') ?? 'medium') as Impact) || 'medium';
  const urgency = (String(form.get('urgency') ?? 'medium') as Urgency) || 'medium';

  if (!name || !email || !subject || !description) {
    return c.html(
      submitFormPage({
        error: 'Please fill in every field.',
        values: { name, email, subject, description },
      }),
      400,
    );
  }

  const requester = await upsertRequester(c.env.DB, email, name);
  // The form's impact and urgency set the base rating; what the ticket is
  // about can only raise it. A Hamdam problem never sits in the "whenever we
  // get to it" band, however mildly the person described it, because they
  // are having trouble with the thing they paid for.
  const { priority, topic } = classifyTicket(impact, urgency, `${subject}\n${description}`);
  const now = new Date();
  const { firstResponseDue, resolveDue } = slaDueDates(priority, now);
  const trackingToken = generateTrackingToken();

  const ticketId = await createTicket(c.env.DB, {
    requesterId: requester.id,
    subject,
    priority,
    impact,
    urgency,
    category: null,
    channel: 'portal',
    topic,
    trackingToken,
    sourceConversationId: null,
    lastInboundMessageId: null,
    createdAt: now.toISOString(),
    slaFirstResponseDue: firstResponseDue,
    slaResolveDue: resolveDue,
  });

  await addComment(c.env.DB, ticketId, 'requester', name, description);

  const email_ = ackEmail({
    ticketId,
    subject,
    priority,
    trackingUrl: trackingUrl(c.req.url, ticketId, trackingToken),
    requesterName: name,
  });
  await queueOutboundEmail(c.env.DB, {
    ticketId,
    commentId: null,
    kind: 'ack',
    toEmail: requester.email,
    subject: email_.subject,
    bodyHtml: email_.html,
    inReplyToMessageId: null,
  });

  // Answer them before they leave the page. A new ticket used to land on a
  // status page that said "we have got this" and nothing else, so the first
  // real response was however long the queue took. The whole argument for an
  // interactive desk is that the person who has just described their problem
  // is still sitting there: this is the one moment where a fast answer costs
  // them nothing to read.
  const first = await composeAssistantReplyLive(
    {
      priority,
      conversationText: `${subject}\n${description}`,
      assistantTurns: 0,
      askedQuestions: [],
      rejectedArticles: [],
    },
    {
      ai: c.env.AI,
      ticketSubject: subject,
      turns: [{ author: 'requester', body: description }],
      claim: () => claimModelCall(c.env.DB, dailyCallLimit(c.env)),
    },
  );
  await addComment(c.env.DB, ticketId, 'agent', ASSISTANT_NAME, first.body);
  await recordAssistantTurn(c.env.DB, ticketId, {
    question: first.question,
    action: first.action,
    articleId: first.articleId,
    reason: first.reason,
    escalated: first.escalated,
  });

  return c.redirect(`/tickets/${ticketId}?token=${trackingToken}&submitted=1`, 303);
});

app.get('/track', (c) => c.html(trackLookupPage()));

app.get('/tickets/lookup', (c) => {
  const id = parseTicketPublicId(String(c.req.query('id') ?? ''));
  const token = String(c.req.query('token') ?? '').trim();
  if (!id || !token) return c.html(trackLookupPage({ error: 'That ticket ID or tracking code looks wrong.' }), 400);
  return c.redirect(`/tickets/${id}?token=${encodeURIComponent(token)}`, 303);
});

app.get('/tickets/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const token = String(c.req.query('token') ?? '');
  if (!Number.isInteger(id) || !token) return c.notFound();

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket || ticket.tracking_token !== token) return c.notFound();

  const comments = await listComments(c.env.DB, id);

  // The card under the thread asks "did that help?", and it has to be about
  // the answer the assistant actually gave. It used to re-derive a match on
  // every page load, which meant the card could offer one article while the
  // reply above it discussed another, and pressing "this did not help"
  // rejected whichever one the matcher happened to like at that moment.
  //
  // So: read what was cited, do not guess at it. Answers drawn from general
  // knowledge cite nothing and get no card; replying in the thread is the
  // way to say it did not work, which is the more useful signal anyway.
  const state = await getAgentState(c.env.DB, id);
  const citedArticle =
    state.lastArticleId && !state.rejectedArticles.includes(state.lastArticleId)
      ? KB_ARTICLES.find((a) => a.id === state.lastArticleId)
      : undefined;
  const suggestion = citedArticle
    ? suggestionBlock({ article: citedArticle, ticketId: id, token, confidence: 'confident' })
    : undefined;

  return c.html(ticketStatusPage({ ticket, comments, justSubmitted: c.req.query('submitted') === '1', justEmailed: c.req.query('emailed') === '1', suggestion }));
});

// Feedback on a suggestion. Recorded either way: "this did not help" is the
// signal that tells the desk an article is wrong or missing, and it is worth
// more than the resolutions.
app.post('/tickets/:id/feedback', async (c) => {
  const id = Number(c.req.param('id'));
  const token = String(c.req.query('token') ?? '');
  if (!Number.isInteger(id) || !token) return c.notFound();

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket || ticket.tracking_token !== token) return c.notFound();

  const form = await c.req.formData();
  const outcome = String(form.get('outcome') ?? '');
  const articleId = String(form.get('article') ?? '');

  if (outcome === 'solved') {
    await addComment(c.env.DB, id, 'system', null, `Requester reported that the suggested article "${articleId}" resolved this.`);
    await updateTicketStatus(c.env.DB, id, 'resolved');
    // They have agreed it is fixed. That is the settled state worth putting
    // in their inbox, and the only thing in it is what they already read.
    await queueConversationSummary(c.env.DB, ticket, await listComments(c.env.DB, id), 'resolved', c.req.url);
  } else if (outcome === 'unresolved') {
    await addComment(c.env.DB, id, 'system', null, `Requester reported that the suggested article "${articleId}" did not help. Needs a person.`);
    // Remember it, so nothing offers this article again on this ticket.
    if (articleId) await recordRejectedArticle(c.env.DB, id, articleId);
    if (ticket.status === 'new') await updateTicketStatus(c.env.DB, id, 'open');
  }

  return c.redirect(`/tickets/${id}?token=${encodeURIComponent(token)}`, 303);
});

// "Email me where this got to."
//
// The requester decides when the conversation has reached a state worth
// keeping, which is the case the automatic triggers cannot read: they have
// what they need, they are done reading, and they want it in writing. No
// approval step, because every word of it is already on their screen.
app.post('/tickets/:id/summary', async (c) => {
  const id = Number(c.req.param('id'));
  const token = String(c.req.query('token') ?? '');
  if (!Number.isInteger(id) || !token) return c.notFound();

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket || ticket.tracking_token !== token) return c.notFound();

  const comments = await listComments(c.env.DB, id);
  const state = await getAgentState(c.env.DB, id);
  const status = ticket.status === 'resolved' ? 'resolved' : state.escalated ? 'with_a_person' : 'in_progress';
  await queueConversationSummary(c.env.DB, ticket, comments, status, c.req.url);
  await addComment(c.env.DB, id, 'system', null, 'Requester asked for the conversation by email.');

  return c.redirect(`/tickets/${id}?token=${encodeURIComponent(token)}&emailed=1`, 303);
});

app.post('/tickets/:id/reply', async (c) => {
  const id = Number(c.req.param('id'));
  const token = String(c.req.query('token') ?? '');
  if (!Number.isInteger(id) || !token) return c.notFound();

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket || ticket.tracking_token !== token) return c.notFound();

  const form = await c.req.formData();
  const body = String(form.get('body') ?? '').trim();
  if (body) {
    const commentId = await addComment(c.env.DB, id, 'requester', ticket.requester_name, body);
    if (ticket.status === 'pending' || ticket.status === 'resolved') {
      await updateTicketStatus(c.env.DB, id, 'open');
    }

    // Tell the desk. A portal reply used to land silently: the comment was
    // stored and nothing surfaced it, so an agent found out only by opening
    // the ticket speculatively, while the requester reasonably assumed
    // someone had been told.
    const url = new URL(c.req.url);
    const adminUrl = `${isLocalHost(url.hostname) ? url.protocol : 'https:'}//${url.host}/admin/tickets/${id}`;
    const rendered = requesterReplyNotification({
      ticketId: id,
      subject: ticket.subject,
      requesterName: ticket.requester_name,
      requesterEmail: ticket.requester_email,
      message: body,
      adminUrl,
    });
    await queueOutboundEmail(c.env.DB, {
      ticketId: id,
      commentId,
      kind: 'requester_reply',
      toEmail: SUPPORT_INBOX,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      inReplyToMessageId: null,
    });

    // Answer them now, in the thread. This is what was missing: the engine
    // was matching, drafting and notifying, but every output went somewhere
    // the requester could not see, so from their side the desk was silent.
    const allComments = await listComments(c.env.DB, id);
    const conversationText = [ticket.subject, ...allComments.filter((m) => m.author_type === 'requester').map((m) => m.body)].join('\n');
    const state = await getAgentState(c.env.DB, id);
    const reply = await composeAssistantReplyLive(
      {
        priority: ticket.priority,
        conversationText,
        assistantTurns: state.assistantTurns,
        askedQuestions: state.askedQuestions,
        rejectedArticles: state.rejectedArticles,
        alreadyEscalated: state.escalated,
      },
      {
        ai: c.env.AI,
        ticketSubject: ticket.subject,
        turns: threadTurns(allComments),
        claim: () => claimModelCall(c.env.DB, dailyCallLimit(c.env)),
      },
    );
    await addComment(c.env.DB, id, 'agent', ASSISTANT_NAME, reply.body);
    await recordAssistantTurn(c.env.DB, id, {
      question: reply.question,
      action: reply.action,
      articleId: reply.articleId,
      reason: reply.reason,
      escalated: reply.escalated,
    });
    if (reply.escalated && ticket.status === 'new') {
      await updateTicketStatus(c.env.DB, id, 'open');
    }

    // No email per turn. The portal already answered them, instantly, and
    // they are looking at it. An email now would describe a conversation
    // that is still moving.
    //
    // The exception is a handover: once a person owns the ticket the fast
    // loop is over, the requester may well close the tab, and "a human has
    // this and can see everything you wrote" is exactly the thing worth
    // having in their inbox.
    if (reply.escalated) {
      await queueConversationSummary(c.env.DB, ticket, await listComments(c.env.DB, id), 'with_a_person', c.req.url);
    }
  }
  return c.redirect(`/tickets/${id}?token=${encodeURIComponent(token)}`, 303);
});

// ---- admin console --------------------------------------------------------
//
// Authentication is Cloudflare Access, verified here rather than assumed.
// The console proves identity from the signed Cf-Access-Jwt-Assertion, not
// from Cf-Access-Authenticated-User-Email: that header is only meaningful
// while an Access policy actually fronts this path, and is otherwise
// client-settable. See src/access.ts for the full reasoning.
//
// Unconfigured means closed. If ACCESS_TEAM_DOMAIN/ACCESS_AUD are unset
// there is no way to verify anything, so the console refuses rather than
// falling back to a weaker check -- the fallback is exactly the state an
// attacker would want to induce.

app.use('/admin/*', async (c, next) => {
  // CSRF: the Access assertion travels in a cookie, which a cross-site form
  // POST would send for free. See isCrossSiteRequest.
  if (
    c.req.method !== 'GET' &&
    c.req.method !== 'HEAD' &&
    isCrossSiteRequest(c.req.url, c.req.header('origin'), c.req.header('cf-ray') !== undefined)
  ) {
    return c.text('Forbidden: cross-site request rejected.', 403);
  }

  const teamDomain = c.env.ACCESS_TEAM_DOMAIN;
  const aud = c.env.ACCESS_AUD;

  // Local development: `wrangler dev` never carries CF-Ray (only Cloudflare's
  // edge sets it, and it overwrites any client value), so this cannot be
  // reached in production no matter what a client sends. Still opt-in via a
  // .dev.vars value that is never deployed.
  if (!c.req.header('cf-ray') && c.env.DEV_ADMIN_EMAIL) {
    c.set('agentEmail', c.env.DEV_ADMIN_EMAIL);
    await next();
    return;
  }

  if (!teamDomain || !aud) {
    return c.text(
      'The agent console is not configured yet: set ACCESS_TEAM_DOMAIN and ACCESS_AUD, then redeploy. See support/README.md.',
      503,
    );
  }

  const token = extractAccessToken(c.req.header('cf-access-jwt-assertion'), c.req.header('cookie'));
  if (!token) return c.text('Forbidden: no Cloudflare Access assertion on this request.', 403);

  const identity = await verifyAccessJwt(token, { teamDomain, aud }, fetchAccessKeys);
  if (!identity) return c.text('Forbidden: Cloudflare Access assertion failed verification.', 403);

  c.set('agentEmail', identity.email);
  await next();
});

app.get('/admin', async (c) => {
  const agentEmail = c.get('agentEmail');
  const statusParam = parseTicketStatus(c.req.query('status'));
  const priorityParam = parsePriority(c.req.query('priority'));
  const tickets = await listQueue(c.env.DB, { status: statusParam, priority: priorityParam });
  return c.html(adminQueuePage({ tickets, filterStatus: statusParam, filterPriority: priorityParam, agentEmail }));
});

app.get('/admin/tickets/:id', async (c) => {
  const agentEmail = c.get('agentEmail');
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();
  const comments = await listComments(c.env.DB, id);
  const drafts = await listDrafts(c.env.DB, id);
  return c.html(adminTicketPage({ ticket, comments, agentEmail, drafts }));
});

app.post('/admin/tickets/:id/reply', async (c) => {
  const agentEmail = c.get('agentEmail');
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();

  const form = await c.req.formData();
  const body = String(form.get('body') ?? '').trim();
  if (body) {
    const commentId = await addComment(c.env.DB, id, 'agent', agentEmail, body);
    await markFirstResponse(c.env.DB, id);
    if (ticket.status === 'new') await updateTicketStatus(c.env.DB, id, 'open');

    const rendered = agentReplyEmail({ ticketId: id, subject: ticket.subject, agentName: agentEmail, message: body });
    await queueOutboundEmail(c.env.DB, {
      ticketId: id,
      commentId,
      kind: 'agent_reply',
      toEmail: ticket.requester_email,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      inReplyToMessageId: ticket.last_inbound_message_id,
    });
  }
  return c.redirect(`/admin/tickets/${id}`, 303);
});

// Ask the assistant for a reply to a ticket it has not touched.
//
// Email-created tickets never pass through the portal, so nothing has run
// the assistant on them: the routine writes them straight to D1. Rather than
// give a scheduled job an API key and let it email strangers unattended,
// the button lives here, behind Access, and produces a draft. An agent looks
// at the ticket, asks for a first pass, reads it, and sends it or does not.
app.post('/admin/tickets/:id/assistant-draft', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();

  const comments = await listComments(c.env.DB, id);
  const state = await getAgentState(c.env.DB, id);
  const conversationText = [ticket.subject, ...comments.filter((m) => m.author_type === 'requester').map((m) => m.body)].join('\n');

  const reply = await composeAssistantReplyLive(
    {
      priority: ticket.priority,
      conversationText,
      assistantTurns: state.assistantTurns,
      askedQuestions: state.askedQuestions,
      rejectedArticles: state.rejectedArticles,
      alreadyEscalated: state.escalated,
    },
    {
      ai: c.env.AI,
      ticketSubject: ticket.subject,
      turns: threadTurns(comments),
      claim: () => claimModelCall(c.env.DB, dailyCallLimit(c.env)),
    },
  );

  // An escalation is the assistant saying this one is yours. Queuing that as
  // an email to the requester would tell them a person is picking it up in
  // the same breath as the person asking for help writing to them.
  if (!reply.escalated) {
    const rendered = assistantWrittenEmail({
      ticketId: id,
      subject: ticket.subject,
      body: reply.body,
      requesterName: ticket.requester_name,
      trackingUrl: trackingUrl(c.req.url, id, ticket.tracking_token),
    });
    await queueAssistantDraft(c.env.DB, {
      ticketId: id,
      commentId: null,
      kind: 'assistant_draft',
      toEmail: ticket.requester_email,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      inReplyToMessageId: ticket.last_inbound_message_id,
      assistantReason: reply.reason,
      assistantArticleId: reply.articleId ?? null,
    });
  } else {
    await addComment(c.env.DB, id, 'system', null, `Assistant declined to draft a reply: ${reply.reason}`);
  }

  return c.redirect(`/admin/tickets/${id}`, 303);
});

app.post('/admin/tickets/:id/status', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();

  const form = await c.req.formData();
  const status = parseTicketStatus(String(form.get('status') ?? '')) ?? ticket.status;
  const priority = parsePriority(String(form.get('priority') ?? '')) ?? ticket.priority;

  if (priority !== ticket.priority) {
    const { firstResponseDue, resolveDue } = slaDueDates(priority, new Date(ticket.created_at));
    await updateTicketPriority(c.env.DB, id, priority, firstResponseDue, resolveDue);
  }
  if (status !== ticket.status) {
    await updateTicketStatus(c.env.DB, id, status);
    if (status === 'resolved') {
      const trackingUrlStr = trackingUrl(c.req.url, id, ticket.tracking_token);
      const rendered = resolvedEmail({ ticketId: id, subject: ticket.subject, trackingUrl: trackingUrlStr });
      await queueOutboundEmail(c.env.DB, {
        ticketId: id,
        commentId: null,
        kind: 'status_change',
        toEmail: ticket.requester_email,
        subject: rendered.subject,
        bodyHtml: rendered.html,
        inReplyToMessageId: ticket.last_inbound_message_id,
      });
    }
  }
  return c.redirect(`/admin/tickets/${id}`, 303);
});

app.post('/admin/tickets/:id/drafts/:draftId/approve', async (c) => {
  const agentEmail = c.get('agentEmail');
  const id = Number(c.req.param('id'));
  const draftId = Number(c.req.param('draftId'));
  if (!Number.isInteger(id) || !Number.isInteger(draftId)) return c.notFound();

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();

  const draft = await approveDraft(c.env.DB, draftId, id, agentEmail);
  if (draft) {
    // The approver owns the words from here. Recording the reply under their
    // name, not the assistant's, is the honest account: they read it and
    // chose to send it, which is the whole point of drafting first.
    await addComment(c.env.DB, id, 'agent', agentEmail, stripHtml(draft.body_html));
    await markFirstResponse(c.env.DB, id);
    if (ticket.status === 'new') await updateTicketStatus(c.env.DB, id, 'open');
  }
  return c.redirect(`/admin/tickets/${id}`, 303);
});

app.post('/admin/tickets/:id/drafts/:draftId/discard', async (c) => {
  const agentEmail = c.get('agentEmail');
  const id = Number(c.req.param('id'));
  const draftId = Number(c.req.param('draftId'));
  if (!Number.isInteger(id) || !Number.isInteger(draftId)) return c.notFound();

  const discarded = await discardDraft(c.env.DB, draftId, id);
  if (discarded) {
    // Worth a system note: a discarded draft is the signal that an article
    // was wrong for this ticket, and that is what improves the knowledge
    // base. Silently dropping it loses the only record that it happened.
    await addComment(c.env.DB, id, 'system', null, `${agentEmail} discarded a suggested reply.`);
  }
  return c.redirect(`/admin/tickets/${id}`, 303);
});

app.notFound((c) => c.text('Not found', 404));

export default app;

// Also exported for the ITIL prompt / email-routine docs to link back to
// concrete public IDs without re-deriving the format.
export { ticketPublicId };

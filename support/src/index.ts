import { Hono } from 'hono';
import type { Env } from './types.js';
import { APP_CSS } from './render/styles.js';
import { submitFormPage, trackLookupPage } from './render/portal.js';
import { ticketStatusPage } from './render/status.js';
import { adminQueuePage, adminTicketPage } from './render/admin.js';
import { classifyFromMatrix, slaDueDates, type Impact, type Priority, type Urgency } from './itil.js';
import { ackEmail, agentReplyEmail, resolvedEmail } from './render/email.js';
import { generateTrackingToken, parseTicketPublicId, ticketPublicId } from './ids.js';
import {
  addComment,
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
import type { TicketStatus } from './types.js';

const app = new Hono<{ Bindings: Env }>();

function trackingUrl(req: Request, id: number, token: string): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}/tickets/${id}?token=${token}`;
}

// Same CSP discipline as the main site (see public/_headers there): no
// inline scripts or styles anywhere in this codebase, so a strict policy
// with no 'unsafe-inline' costs nothing and closes off XSS from any
// requester-authored text that slips past escaping.
app.use('*', async (c, next) => {
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
  const priority = classifyFromMatrix(impact, urgency);
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
    trackingUrl: trackingUrl(c.req.raw, ticketId, trackingToken),
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
  return c.html(ticketStatusPage({ ticket, comments, justSubmitted: c.req.query('submitted') === '1' }));
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
    await addComment(c.env.DB, id, 'requester', ticket.requester_name, body);
    if (ticket.status === 'pending' || ticket.status === 'resolved') {
      await updateTicketStatus(c.env.DB, id, 'open');
    }
  }
  return c.redirect(`/tickets/${id}?token=${encodeURIComponent(token)}`, 303);
});

// ---- admin console --------------------------------------------------------
//
// Authentication is Cloudflare Access at the edge (see support/README.md):
// the route is bound to a Cloudflare Access application, so an
// unauthenticated request never reaches this Worker at all. The header
// check below is defence-in-depth, not the primary control -- if this
// header is ever missing in production it means Access is misconfigured,
// and refusing is the only safe response.

app.use('/admin/*', async (c, next) => {
  const agentEmail = c.req.header('Cf-Access-Authenticated-User-Email');
  if (!agentEmail) {
    return c.text('Forbidden: this route must be served behind Cloudflare Access.', 403);
  }
  await next();
});

app.get('/admin', async (c) => {
  const agentEmail = c.req.header('Cf-Access-Authenticated-User-Email') ?? 'unknown';
  const statusParam = c.req.query('status') as TicketStatus | undefined;
  const priorityParam = c.req.query('priority') as Priority | undefined;
  const tickets = await listQueue(c.env.DB, { status: statusParam, priority: priorityParam });
  return c.html(adminQueuePage({ tickets, filterStatus: statusParam, filterPriority: priorityParam, agentEmail }));
});

app.get('/admin/tickets/:id', async (c) => {
  const agentEmail = c.req.header('Cf-Access-Authenticated-User-Email') ?? 'unknown';
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();
  const comments = await listComments(c.env.DB, id);
  return c.html(adminTicketPage({ ticket, comments, agentEmail }));
});

app.post('/admin/tickets/:id/reply', async (c) => {
  const agentEmail = c.req.header('Cf-Access-Authenticated-User-Email') ?? 'unknown';
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

app.post('/admin/tickets/:id/status', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();

  const form = await c.req.formData();
  const status = String(form.get('status') ?? ticket.status) as TicketStatus;
  const priority = String(form.get('priority') ?? ticket.priority) as Priority;

  if (priority !== ticket.priority) {
    const { firstResponseDue, resolveDue } = slaDueDates(priority, new Date(ticket.created_at));
    await updateTicketPriority(c.env.DB, id, priority, firstResponseDue, resolveDue);
  }
  if (status !== ticket.status) {
    await updateTicketStatus(c.env.DB, id, status);
    if (status === 'resolved') {
      const trackingUrlStr = trackingUrl(c.req.raw, id, ticket.tracking_token);
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

app.notFound((c) => c.text('Not found', 404));

export default app;

// Also exported for the ITIL prompt / email-routine docs to link back to
// concrete public IDs without re-deriving the format.
export { ticketPublicId };

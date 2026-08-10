import { page, priorityBadge, statusBadge, formatDateTime, isOverdue } from './layout.js';
import { describeAge, type Heartbeat } from '../heartbeat.js';
import { escapeHtml, stripHtml, textToSafeHtml, ticketPublicId } from '../ids.js';
import { PRIORITY_LABEL, SLA_POLICY, type Priority } from '../itil.js';
import type { CommentRow, TicketStatus, TicketWithRequester } from '../types.js';
import type { DraftRow, UndeliveredOutbound } from '../db.js';

const ADMIN_NAV = [
  { href: '/admin', label: 'Queue' },
  { href: '/admin?status=resolved', label: 'Resolved' },
  { href: '/admin?status=closed', label: 'Closed' },
];

/**
 * Says out loud when the console's second lock is not configured.
 *
 * `ADMIN_EMAILS` unset means the Worker admits anyone Cloudflare Access
 * admits, which is how this shipped and is not by itself a hole. It is a
 * single point of control for the surface holding every requester's data,
 * and the failure mode of a single point of control is that nobody notices
 * it is the only one.
 *
 * On the page rather than only in a log, because the log needs a websocket to
 * tail and nobody tails it. Whoever opens the console is exactly the person
 * who can fix this, and they are looking right at it.
 */
/**
 * Says out loud when the desk has stopped reading its mail.
 *
 * The console is where this belongs, because whoever has it open is the
 * person who can do something, and because the alternative is finding out
 * from a customer who thinks they were ignored. `/health` carries the same
 * fact to an external monitor, which is the half that still works when the
 * Worker is the thing that broke.
 *
 * "Never" is shown as its own case rather than folded into "stale". On a
 * fresh deploy it means the cron has not had its first minute yet, which is
 * fine and passes; on a desk that has been up for a day it means ingest has
 * never once succeeded, which is not.
 */
function ingestNotice(beat: Heartbeat): string {
  if (beat.state === 'ok') return '';
  const when = describeAge(beat.ageMs);
  return `<div class="notice notice--error">The desk last read its mailbox <strong>${escapeHtml(when)}</strong>.
  Email is not being turned into tickets while this says so. Check
  <code>last_ingest_error</code> in <code>sync_state</code>, and the Graph credentials.</div>`;
}

function allowlistNotice(configured: boolean): string {
  if (configured) return '';
  return `<div class="notice notice--error">This console is protected by Cloudflare Access alone:
  <code>ADMIN_EMAILS</code> is not set, so the Worker admits any account Access lets through.
  Set it with <code>npx wrangler secret put ADMIN_EMAILS</code> and redeploy.</div>`;
}

export function adminQueuePage(opts: {
  tickets: TicketWithRequester[];
  filterStatus?: TicketStatus;
  filterPriority?: Priority;
  agentEmail: string;
  /** Whether ADMIN_EMAILS is set. False means the console's second lock is off. */
  allowlistConfigured: boolean;
  /** When the desk last successfully read its mailbox. */
  ingest: Heartbeat;
}): string {
  const priorities: Priority[] = ['P1', 'P2', 'P3', 'P4'];
  // Encoded even though index.ts now validates this against a fixed set:
  // the raw interpolation here is what turned an unvalidated `?status=`
  // into HTML injection, and a renderer should not depend on every caller
  // upstream having got its parsing right.
  const statusQuery = opts.filterStatus ? `status=${encodeURIComponent(opts.filterStatus)}` : '';

  const rows = opts.tickets
    .map((t) => {
      const overdue = isOverdue(t.sla_first_response_due, t.first_response_at) && !t.first_response_at;
      return `<tr>
  <td>${priorityBadge(t.priority)}</td>
  <td><a class="subject" href="/admin/tickets/${t.id}">${escapeHtml(t.subject)}</a><br>
      <span class="queue-sub">${ticketPublicId(t.id)} &middot; ${escapeHtml(t.requester_email)}</span></td>
  <td>${statusBadge(t.status)}</td>
  <td>${overdue ? '<span class="badge badge--breach">Overdue</span>' : formatDateTime(t.sla_first_response_due)}</td>
  <td>${formatDateTime(t.updated_at)}</td>
</tr>`;
    })
    .join('\n');

  const body = `
${ingestNotice(opts.ingest)}
${allowlistNotice(opts.allowlistConfigured)}
<div class="page-head">
  <h1>Support queue</h1>
  <p class="lede flush">Signed in as ${escapeHtml(opts.agentEmail)}</p>
</div>
<div class="filters">
  <a class="${!opts.filterPriority ? 'active' : ''}" href="/admin?${statusQuery}">All priorities</a>
  ${priorities
    .map(
      (p) =>
        `<a class="${opts.filterPriority === p ? 'active' : ''}" href="/admin?${statusQuery}${statusQuery ? '&' : ''}priority=${p}">${escapeHtml(PRIORITY_LABEL[p])}</a>`,
    )
    .join('')}
</div>
<div class="card">
  <table class="queue">
    <thead><tr><th>Priority</th><th>Ticket</th><th>Status</th><th>First response due</th><th>Updated</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="queue-empty">Nothing here.</td></tr>`}</tbody>
  </table>
</div>
`;
  return page({ title: 'Queue', wide: true, nav: ADMIN_NAV }, body);
}

/**
 * A draft, as the approver reads it before deciding.
 *
 * The body is shown as text, not as markup. It is assembled from escaped
 * pieces upstream, so today there is nothing dangerous in it, but this is the
 * one place in the console where a stored string was written into the page
 * unescaped, and "the only thing that writes this column is careful" is a
 * property of the current code rather than of the renderer. The console's CSP
 * would stop a script; it would not stop a convincing fake button. Rendering
 * through the same path as every other stored string costs nothing here,
 * because what the approver needs is the words.
 */
function draftsBlock(drafts: DraftRow[], ticketId: number): string {
  if (drafts.length === 0) return '';
  return drafts
    .map(
      (d) => `
<div class="draft">
  <div class="draft-head">
    <span class="badge badge--draft">Suggested reply</span>
    <span class="draft-why">${escapeHtml(d.assistant_reason ?? '')}</span>
  </div>
  <p class="draft-meta">To ${escapeHtml(d.to_email)} &middot; subject ${escapeHtml(d.subject)}
  &middot; ${d.assistant_article_id ? `from article <code>${escapeHtml(d.assistant_article_id)}</code>` : 'not from a knowledge base article'}</p>
  <div class="draft-body">${textToSafeHtml(stripHtml(d.body_html))}</div>
  <form method="post" action="/admin/tickets/${ticketId}/drafts/${d.id}/approve" class="inline-form">
    <button class="btn" type="submit">Approve and send</button>
  </form>
  <form method="post" action="/admin/tickets/${ticketId}/drafts/${d.id}/discard" class="inline-form">
    <button class="btn btn--ghost" type="submit">Discard</button>
  </form>
  <p class="hint">Nothing has been sent. Approving queues it for the next
  delivery run; discarding leaves no trace with the requester.</p>
</div>`,
    )
    .join('\n');
}

/**
 * Says out loud that mail on this ticket did not go out.
 *
 * The gap this closes is that an agent's only feedback after pressing send
 * is a 303 back to this page, and that redirect looks the same whether the
 * message was delivered or refused, because the send happens after the
 * response. Nothing retries a `failed` row and nothing else mentions it, so
 * without this the first person to notice is the customer, and what they
 * notice is silence.
 *
 * Rendered at the top with the other notices rather than beside the thread,
 * because the thread already shows the agent's comment as posted: the
 * comment row is written before the send is attempted, so the reply is
 * sitting there in the history looking exactly like one that went. The
 * correction has to be somewhere the eye lands first.
 *
 * `failure_reason` comes from `sendMail` or from the rate limiter, so it is
 * ours rather than a requester's, but it is escaped anyway. It is a string
 * that reaches a page, and the rule that makes that safe is that it is
 * applied without asking where the string came from.
 *
 * The wording names the address and stops there. An earlier draft said "the
 * requester has not seen this" and "resend by posting the reply again
 * below", which is right for `agent_reply` and wrong for the rest: a
 * `requester_reply` notification goes to the desk's own inbox and a
 * `status_change` queued by an escalation goes to the team, so on those rows
 * both sentences would have sent a reader to comfort the wrong person and
 * fix it the wrong way. Saying who it was for and letting them decide is
 * both shorter and true of every kind.
 */
function undeliveredMailNotice(undelivered: readonly UndeliveredOutbound[]): string {
  if (undelivered.length === 0) return '';
  const items = undelivered
    .map((f) => {
      // 'pending' here has already passed the staleness threshold in the
      // query, so it means nothing ever picked it up rather than in flight.
      const state = f.status === 'pending' ? 'never attempted' : escapeHtml(f.failure_reason ?? 'no reason recorded');
      return `<li><strong>${escapeHtml(f.kind.replace(/_/g, ' '))}</strong> to ${escapeHtml(f.to_email)},
      queued ${formatDateTime(f.created_at)} &mdash; ${state}</li>`;
    })
    .join('\n');
  const one = undelivered.length === 1;
  const count = one ? 'One email' : `${undelivered.length} emails`;
  return `<div class="notice notice--error">${count} on this ticket ${one ? 'has' : 'have'} not been delivered,
  and nothing will retry ${one ? 'it' : 'them'} automatically. Check who ${one ? 'it was' : 'they were'} for
  before assuming anyone has seen ${one ? 'it' : 'them'}.
  <ul>${items}</ul></div>`;
}

export function adminTicketPage(opts: {
  ticket: TicketWithRequester;
  comments: CommentRow[];
  agentEmail: string;
  drafts?: DraftRow[];
  undeliveredOutbound?: UndeliveredOutbound[];
  allowlistConfigured: boolean;
}): string {
  const { ticket, comments } = opts;
  const publicId = ticketPublicId(ticket.id);
  const policy = SLA_POLICY[ticket.priority];
  const overdue = isOverdue(ticket.sla_first_response_due, ticket.first_response_at) && !ticket.first_response_at;

  const thread = comments
    .map((c) => {
      const roleClass = c.author_type === 'requester' ? 'msg--requester' : c.author_type === 'agent' ? 'msg--agent' : 'msg--system';
      const who = c.author_type === 'agent' ? escapeHtml(c.author_name ?? 'Agent') : c.author_type === 'system' ? 'System' : escapeHtml(ticket.requester_name ?? ticket.requester_email);
      return `<div class="msg ${roleClass}">
  <div class="meta"><span>${who}</span><span>${formatDateTime(c.created_at)}</span></div>
  <div class="body">${textToSafeHtml(c.body)}</div>
</div>`;
    })
    .join('\n');

  const statusOptions: TicketStatus[] = ['new', 'open', 'pending', 'resolved', 'closed'];
  const priorityOptions: Priority[] = ['P1', 'P2', 'P3', 'P4'];

  const body = `
${allowlistNotice(opts.allowlistConfigured)}
${undeliveredMailNotice(opts.undeliveredOutbound ?? [])}
<p class="lede"><a href="/admin">&larr; Queue</a></p>
<h1>${escapeHtml(ticket.subject)}</h1>
<p class="lede">${publicId} &middot; ${escapeHtml(ticket.requester_name ?? ticket.requester_email)} &lt;${escapeHtml(ticket.requester_email)}&gt;
&middot; opened ${formatDateTime(ticket.created_at)} &middot; via ${ticket.channel === 'email' ? 'email' : 'portal'}
&middot; ${ticket.topic === 'hamdam' ? 'Hamdam app' : 'general IT'}</p>

<div class="grid-2">
  <div class="card">
    <div class="badge-row">
      ${priorityBadge(ticket.priority)}
      ${statusBadge(ticket.status)}
      ${overdue ? '<span class="badge badge--breach">First response overdue</span>' : ''}
    </div>
    <div class="sla-line">
      <span>First response target: <strong>${escapeHtml(policy.firstResponseLabel)}</strong></span>
      <span>Resolution target: <strong>${escapeHtml(policy.resolveLabel)}</strong></span>
    </div>
    <div class="thread">${thread}</div>
    ${draftsBlock(opts.drafts ?? [], ticket.id)}
    <form method="post" action="/admin/tickets/${ticket.id}/assistant-draft">
      <button class="btn btn--ghost" type="submit">Ask the assistant for a draft</button>
      <p class="hint">Writes a suggested reply above for you to read. Nothing
      reaches the requester until you approve it.</p>
    </form>
    <form method="post" action="/admin/tickets/${ticket.id}/reply">
      <div class="field">
        <label for="body">Reply to requester</label>
        <textarea id="body" name="body" required placeholder="This is emailed to ${escapeHtml(ticket.requester_email)}"></textarea>
      </div>
      <button class="btn" type="submit">Send reply</button>
    </form>
  </div>
  <div class="card card--fit">
    <h2 class="flush-top">Update</h2>
    <form method="post" action="/admin/tickets/${ticket.id}/status">
      <div class="field">
        <label for="status">Status</label>
        <select id="status" name="status">
          ${statusOptions.map((s) => `<option value="${s}" ${s === ticket.status ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="priority">Priority</label>
        <select id="priority" name="priority">
          ${priorityOptions.map((p) => `<option value="${p}" ${p === ticket.priority ? 'selected' : ''}>${escapeHtml(PRIORITY_LABEL[p])}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn--ghost" type="submit">Save</button>
    </form>
    <p class="hint hint--spaced">Marking resolved emails the requester automatically. Signed in as ${escapeHtml(opts.agentEmail)}.</p>
  </div>
</div>
`;
  return page({ title: `${publicId} · ${ticket.subject}`, wide: true, nav: ADMIN_NAV }, body);
}

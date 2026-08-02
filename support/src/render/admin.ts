import { page, priorityBadge, statusBadge, formatDateTime, isOverdue } from './layout.js';
import { escapeHtml, stripHtml, textToSafeHtml, ticketPublicId } from '../ids.js';
import { PRIORITY_LABEL, SLA_POLICY, type Priority } from '../itil.js';
import type { CommentRow, TicketStatus, TicketWithRequester } from '../types.js';
import type { DraftRow } from '../db.js';

const ADMIN_NAV = [
  { href: '/admin', label: 'Queue' },
  { href: '/admin?status=resolved', label: 'Resolved' },
  { href: '/admin?status=closed', label: 'Closed' },
];

export function adminQueuePage(opts: {
  tickets: TicketWithRequester[];
  filterStatus?: TicketStatus;
  filterPriority?: Priority;
  agentEmail: string;
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
      <span style="font-size:0.78rem;color:var(--text-soft)">${ticketPublicId(t.id)} &middot; ${escapeHtml(t.requester_email)}</span></td>
  <td>${statusBadge(t.status)}</td>
  <td>${overdue ? '<span class="badge badge--breach">Overdue</span>' : formatDateTime(t.sla_first_response_due)}</td>
  <td>${formatDateTime(t.updated_at)}</td>
</tr>`;
    })
    .join('\n');

  const body = `
<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:0.5rem">
  <h1>Support queue</h1>
  <p class="lede" style="margin:0">Signed in as ${escapeHtml(opts.agentEmail)}</p>
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
    <tbody>${rows || `<tr><td colspan="5" style="color:var(--text-soft)">Nothing here.</td></tr>`}</tbody>
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
  <form method="post" action="/admin/tickets/${ticketId}/drafts/${d.id}/approve" style="display:inline">
    <button class="btn" type="submit">Approve and send</button>
  </form>
  <form method="post" action="/admin/tickets/${ticketId}/drafts/${d.id}/discard" style="display:inline">
    <button class="btn btn--ghost" type="submit">Discard</button>
  </form>
  <p class="hint">Nothing has been sent. Approving queues it for the next
  delivery run; discarding leaves no trace with the requester.</p>
</div>`,
    )
    .join('\n');
}

export function adminTicketPage(opts: { ticket: TicketWithRequester; comments: CommentRow[]; agentEmail: string; drafts?: DraftRow[] }): string {
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
<p class="lede"><a href="/admin">&larr; Queue</a></p>
<h1>${escapeHtml(ticket.subject)}</h1>
<p class="lede">${publicId} &middot; ${escapeHtml(ticket.requester_name ?? ticket.requester_email)} &lt;${escapeHtml(ticket.requester_email)}&gt;
&middot; opened ${formatDateTime(ticket.created_at)} &middot; via ${ticket.channel === 'email' ? 'email' : 'portal'}
&middot; ${ticket.topic === 'hamdam' ? 'Hamdam app' : 'general IT'}</p>

<div class="grid-2">
  <div class="card">
    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem">
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
  <div class="card" style="height:fit-content">
    <h2 style="margin-top:0">Update</h2>
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
    <p class="hint" style="margin-top:1rem">Marking resolved emails the requester automatically. Signed in as ${escapeHtml(opts.agentEmail)}.</p>
  </div>
</div>
`;
  return page({ title: `${publicId} · ${ticket.subject}`, wide: true, nav: ADMIN_NAV }, body);
}

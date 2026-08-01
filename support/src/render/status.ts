import { page, priorityBadge, statusBadge, formatDateTime, isOverdue } from './layout.js';
import { escapeHtml, textToSafeHtml, ticketPublicId } from '../ids.js';
import { SLA_POLICY } from '../itil.js';
import type { CommentRow, TicketWithRequester } from '../types.js';

export function ticketStatusPage(opts: {
  ticket: TicketWithRequester;
  comments: CommentRow[];
  justSubmitted?: boolean;
  /** Pre-rendered suggestion block, or empty when nothing matched. */
  suggestion?: string;
}): string {
  const { ticket, comments } = opts;
  const publicId = ticketPublicId(ticket.id);
  const policy = SLA_POLICY[ticket.priority];
  const overdue = isOverdue(ticket.sla_first_response_due, ticket.first_response_at) && !ticket.first_response_at;

  const thread = comments
    .map((c) => {
      const roleClass = c.author_type === 'requester' ? 'msg--requester' : c.author_type === 'agent' ? 'msg--agent' : 'msg--system';
      const who = c.author_type === 'agent' ? escapeHtml(c.author_name ?? 'Hamdam Support') : c.author_type === 'system' ? 'System' : 'You';
      return `<div class="msg ${roleClass}">
  <div class="meta"><span>${who}</span><span>${formatDateTime(c.created_at)}</span></div>
  <div class="body">${textToSafeHtml(c.body)}</div>
</div>`;
    })
    .join('\n');

  const body = `
${opts.justSubmitted ? `<div class="notice notice--ok">Ticket created. A confirmation email is on its way to ${escapeHtml(ticket.requester_email)}.</div>` : ''}
<h1>${escapeHtml(ticket.subject)}</h1>
<p class="lede">${escapeHtml(publicId)} &middot; opened ${formatDateTime(ticket.created_at)}</p>
${opts.suggestion ?? ''}
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
  <div class="thread">${thread || '<p class="lede">No messages yet.</p>'}</div>
  ${
    ticket.status !== 'closed'
      ? `<form method="post" action="/tickets/${ticket.id}/reply?token=${encodeURIComponent(ticket.tracking_token)}">
    <div class="field">
      <label for="body">Add a reply</label>
      <textarea id="body" name="body" required></textarea>
    </div>
    <button class="btn" type="submit">Send</button>
  </form>`
      : '<p class="lede">This ticket is closed. Email developer@hamdam.com.au to reopen it.</p>'
  }
</div>
`;
  return page({ title: `${publicId} · ${ticket.subject}` }, body);
}

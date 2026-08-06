import { page, priorityBadge, statusBadge, formatDateTime, isOverdue } from './layout.js';
import { escapeHtml, textToSafeHtml, ticketPublicId } from '../ids.js';
import { SLA_POLICY } from '../itil.js';
import { localePath, parseLocale, strings } from '../i18n.js';
import type { CommentRow, TicketWithRequester } from '../types.js';
import { identity } from '../identity.js';

export function ticketStatusPage(opts: {
  ticket: TicketWithRequester;
  comments: CommentRow[];
  justSubmitted?: boolean;
  justEmailed?: boolean;
  /** Pre-rendered suggestion block, or empty when nothing matched. */
  suggestion?: string;
}): string {
  const { ticket, comments } = opts;
  // The ticket's own language, not the browser's. Someone who opened this in
  // Persian and later follows a link from an English email should still find
  // their own conversation in the language they started it in.
  const locale = parseLocale(ticket.locale);
  const t = strings(locale);
  const publicId = ticketPublicId(ticket.id);
  const policy = SLA_POLICY[ticket.priority];
  const overdue = isOverdue(ticket.sla_first_response_due, ticket.first_response_at) && !ticket.first_response_at;

  const thread = comments
    .map((c) => {
      const roleClass = c.author_type === 'requester' ? 'msg--requester' : c.author_type === 'agent' ? 'msg--agent' : 'msg--system';
      const who =
        c.author_type === 'agent'
          ? escapeHtml(c.author_name ?? (identity().brandConfigured ? identity().brandName : t.supportAuthor))
          : c.author_type === 'system'
            ? escapeHtml(t.systemAuthor)
            : escapeHtml(t.you);
      return `<div class="msg ${roleClass}">
  <div class="meta"><span>${who}</span><span>${formatDateTime(c.created_at)}</span></div>
  <div class="body">${textToSafeHtml(c.body)}</div>
</div>`;
    })
    .join('\n');

  const token = encodeURIComponent(ticket.tracking_token);
  const body = `
${opts.justSubmitted ? `<div class="notice notice--ok">${escapeHtml(t.statusNoticeCreated)} ${escapeHtml(ticket.requester_email)}.</div>` : ''}
${opts.justEmailed ? `<div class="notice notice--ok">${escapeHtml(t.statusNoticeEmailed)} ${escapeHtml(ticket.requester_email)}.</div>` : ''}
<h1>${escapeHtml(ticket.subject)}</h1>
<p class="lede">${escapeHtml(publicId)} &middot; ${escapeHtml(t.openedAt)} ${formatDateTime(ticket.created_at)}</p>
${opts.suggestion ?? ''}
<div class="card">
  <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem">
    ${priorityBadge(ticket.priority)}
    ${statusBadge(ticket.status, locale)}
    ${overdue ? `<span class="badge badge--breach">${escapeHtml(t.overdue)}</span>` : ''}
  </div>
  <div class="sla-line">
    <span>${escapeHtml(t.firstResponseTarget)}: <strong>${escapeHtml(policy.firstResponseLabel)}</strong></span>
    <span>${escapeHtml(t.resolutionTarget)}: <strong>${escapeHtml(policy.resolveLabel)}</strong></span>
  </div>
  <div class="thread">${thread || `<p class="lede">${escapeHtml(t.noMessages)}</p>`}</div>
  ${
    ticket.status !== 'closed'
      ? `<form method="post" action="${localePath(locale, `/tickets/${ticket.id}/reply`)}?token=${token}">
    <div class="field">
      <label for="body">${escapeHtml(t.addReply)}</label>
      <textarea id="body" name="body" required></textarea>
    </div>
    <button class="btn" type="submit">${escapeHtml(t.sendButton)}</button>
  </form>
  <form method="post" action="${localePath(locale, `/tickets/${ticket.id}/summary`)}?token=${token}">
    <button class="btn btn--ghost" type="submit">${escapeHtml(t.emailMeButton)}</button>
    <p class="hint">${escapeHtml(t.emailMeHint)}</p>
  </form>`
      : `<p class="lede">${escapeHtml(t.closedNotice)}</p>`
  }
</div>
`;
  return page({ title: `${publicId} · ${ticket.subject}`, locale }, body);
}

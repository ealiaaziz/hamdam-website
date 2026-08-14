import { page, priorityBadge, statusBadge, formatDateTime, isOverdue } from './layout.js';
import { agentDisplayName, escapeHtml, textToSafeHtml, ticketPublicId } from '../ids.js';
import { SLA_POLICY } from '../itil.js';
import { localePath, parseLocale, strings } from '../i18n.js';
import type { CommentRow, TicketWithRequester } from '../types.js';

export function ticketStatusPage(opts: {
  ticket: TicketWithRequester;
  comments: CommentRow[];
  justSubmitted?: boolean;
  justEmailed?: boolean;
  /**
   * Render the conversation without handing over the tracking token.
   *
   * Used for the page the portal shows immediately after a ticket is filed.
   * The submitter reads the desk's first answer here and gets no durable key
   * to the thread; the key is in the acknowledgement email, which only the
   * mailbox owner receives. See `POST /tickets` in index.ts for why that
   * distinction is the whole point.
   */
  continueByEmail?: boolean;
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

  // System notes are the desk talking to itself, and this page is not where
  // that conversation belongs.
  //
  // They read as internal bookkeeping and some of them are worse than that.
  // "someone@hamdam.com.au discarded a suggested reply" puts an agent's
  // Cloudflare Access address on a page reachable by anyone holding a
  // tracking token, which includes anyone the requester ever forwarded one of
  // the desk's emails to. The assistant's declined reasons are the same shape
  // of leak in the other direction: "model answered a Hamdam question from
  // general knowledge; refused" describes how the desk's guards work to the
  // one audience with a reason to probe them.
  //
  // The same filter `queueConversationSummary` already applies before mailing
  // a thread, which is the same content going to the same person. Having the
  // page and the email disagree about what the requester may see was the
  // actual bug: one of them was wrong and it was not the email.
  const thread = comments
    .filter((c) => c.author_type === 'requester' || c.author_type === 'agent')
    .map((c) => {
      const roleClass = c.author_type === 'requester' ? 'msg--requester' : 'msg--agent';
      // The filter above drops system notes for a reason it spells out at
      // length: an agent's Cloudflare Access address does not belong on a page
      // anyone holding a tracking link can open. And then this line printed it
      // anyway, from the other direction. A human reply stores `author_name`
      // as `identity.email` (see the two addComment calls on the admin routes
      // in index.ts), so every agent reply put a real staff address in front
      // of the requester and anyone they ever forwarded the link to. Those are
      // the addresses worth phishing.
      //
      // The assistant's name is a display name and stays: "Hamdam Assistant"
      // is information the requester should have. An address is not. Testing
      // for the `@` rather than for a known name means a new author, or one
      // stored by some path added later, fails safe.
      const who =
        c.author_type === 'agent' ? escapeHtml(agentDisplayName(c.author_name, t.supportAuthor)) : escapeHtml(t.you);
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
  <div class="badge-row">
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
    opts.continueByEmail
      ? // No forms, because both of them carry the token in their action and
        // the token is exactly what this page must not hand out.
        `<p class="lede">${escapeHtml(t.statusContinueByEmail)}</p>`
      : ticket.status !== 'closed'
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

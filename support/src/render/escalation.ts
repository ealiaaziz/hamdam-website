import { escapeHtml, textToSafeHtml, ticketPublicId } from '../ids.js';
import { PRIORITY_LABEL, SLA_POLICY, type Priority, type Topic } from '../itil.js';
import type { CommentRow, TicketWithRequester } from '../types.js';

// The handover email, to the people who will actually pick the ticket up.
//
// Written to be answerable from a phone without opening anything else. The
// failure this is guarding against is not "nobody was told"; it is being
// told, on a Saturday, that HAM-31 needs attention, and having to open a
// laptop and sign in through Access to find out whether it can wait.
//
// So: everything is in the body. The whole conversation, what the assistant
// tried and why it gave up, when the clock runs out, and who is waiting.
// Long emails are usually a failure of editing. This one is long because the
// alternative is a round trip.

const WRAP = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#241E15;max-width:40rem;margin:0 auto;line-height:1.5">`;
const RULE = `<hr style="border:none;border-top:1px solid #241E15;opacity:0.15;margin:1.1rem 0">`;
const LABEL = `style="font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;color:#8A7A63;margin:0 0 0.15rem 0"`;

const PRIORITY_COLOUR: Record<Priority, string> = {
  P1: '#B3402B',
  P2: '#C4682F',
  P3: '#7C6A4F',
  P4: '#8A7A63',
};

export interface EscalationInput {
  ticket: TicketWithRequester;
  comments: readonly CommentRow[];
  /** Why the assistant stopped, in its own words. */
  reason: string;
  /**
   * The engineer this ticket now belongs to, if it belongs to anyone.
   *
   * Named in the body rather than left to the recipient list, because the
   * recipient list is several people and only one of them owns it. "Somebody
   * should look at this" is how a ticket sits for a day with three people
   * each assuming one of the other two has it.
   */
  assignedTo?: string | null;
  /** Articles the requester explicitly said did not help. */
  rejectedArticles: readonly string[];
  /** Clarifying questions already put to them. */
  askedQuestions: readonly string[];
  assistantTurns: number;
  trackingUrl: string;
  adminUrl: string;
  now?: Date;
}

function field(label: string, value: string): string {
  return `<div style="margin:0 0 0.7rem 0"><p ${LABEL}>${escapeHtml(label)}</p><div>${value}</div></div>`;
}

/** "in 3 hours" / "2 hours ago", because a timestamp alone needs arithmetic. */
function relative(iso: string, now: Date): string {
  const delta = new Date(iso).getTime() - now.getTime();
  const mins = Math.round(Math.abs(delta) / 60_000);
  const text = mins < 60 ? `${mins} minute${mins === 1 ? '' : 's'}` : mins < 1440 ? `${Math.round(mins / 60)} hour${Math.round(mins / 60) === 1 ? '' : 's'}` : `${Math.round(mins / 1440)} day${Math.round(mins / 1440) === 1 ? '' : 's'}`;
  return delta >= 0 ? `in ${text}` : `${text} ago`;
}

export function escalationEmail(input: EscalationInput): { subject: string; html: string } {
  const { ticket, comments } = input;
  const now = input.now ?? new Date();
  const publicId = ticketPublicId(ticket.id);
  const policy = SLA_POLICY[ticket.priority];
  const overdue = new Date(ticket.sla_first_response_due).getTime() < now.getTime() && !ticket.first_response_at;

  const thread = comments
    .map((c) => {
      const who =
        c.author_type === 'requester'
          ? escapeHtml(ticket.requester_name ?? ticket.requester_email)
          : c.author_type === 'system'
            ? 'System note'
            : escapeHtml(c.author_name ?? 'Support');
      const tint = c.author_type === 'requester' ? '#D07B3F' : c.author_type === 'system' ? '#C9BBA6' : '#8A9A7B';
      return `<div style="margin:0 0 0.8rem 0;padding:0 0 0 0.8rem;border-left:3px solid ${tint}">
  <p style="margin:0 0 0.2rem 0;font-size:0.74rem;color:#574A38">${who} &middot; ${escapeHtml(c.created_at.replace('T', ' ').slice(0, 16))}</p>
  <div style="margin:0;font-size:0.94rem">${textToSafeHtml(c.body)}</div>
</div>`;
    })
    .join('\n');

  const tried = [
    `The assistant replied ${input.assistantTurns} time${input.assistantTurns === 1 ? '' : 's'} before stopping.`,
    input.askedQuestions.length > 0
      ? `It asked: ${input.askedQuestions.map((q) => `"${escapeHtml(q)}"`).join('; ')}`
      : 'It asked no clarifying questions.',
    input.rejectedArticles.length > 0
      ? `The requester said these did not help: ${input.rejectedArticles.map((a) => `<code>${escapeHtml(a)}</code>`).join(', ')}`
      : 'Nothing was offered and rejected.',
  ]
    .map((line) => `<p style="margin:0 0 0.3rem 0;font-size:0.9rem">${line}</p>`)
    .join('');

  const topicLabel: Record<Topic, string> = {
    hamdam: 'Hamdam app',
    general_it: 'General IT',
  };

  const assignedTo = input.assignedTo?.trim() || null;

  // What the allocated engineer can do without opening anything, and it is
  // worth being precise about it in the email itself: the reply they are most
  // likely to write is a reply to this message, from a phone, and whether
  // that reaches the requester is exactly the thing they cannot find out by
  // guessing. See planInbound for why only this address can do it.
  const allocation = assignedTo
    ? `<div style="margin:0 0 1rem 0;padding:0.6rem 0.8rem;background:#F3EFE7;border-left:3px solid #8A9A7B">
  <p style="margin:0 0 0.3rem 0;font-size:0.9rem"><strong>Allocated to ${escapeHtml(assignedTo)}.</strong></p>
  <p style="margin:0;font-size:0.88rem;color:#574A38">If that is you, replying to this email works: your reply is added to
  ${escapeHtml(publicId)} as your own message and sent on to ${escapeHtml(ticket.requester_email)}. Keep
  <strong>${escapeHtml(publicId)}</strong> in the subject line, and reply from this address, because that pair is what
  authorises it. Writing "close this ticket" closes it.</p>
</div>`
    : `<div style="margin:0 0 1rem 0;padding:0.6rem 0.8rem;background:#FBEAE5;border-left:3px solid #B3402B">
  <p style="margin:0;font-size:0.9rem"><strong>Not allocated to anyone.</strong> No L3 engineer is configured
  (<code>L3_ENGINEER_EMAIL</code>), so this ticket has no owner and will be listed in the unassigned sweep until
  somebody takes it in the console.</p>
</div>`;

  const html = `${WRAP}
<p style="margin:0 0 0.2rem 0;font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;color:#8A7A63">Needs a person</p>
<h1 style="margin:0 0 0.15rem 0;font-size:1.35rem">${escapeHtml(publicId)} &middot; ${escapeHtml(ticket.subject)}</h1>
<p style="margin:0 0 1rem 0">
  <span style="display:inline-block;padding:0.12rem 0.5rem;border-radius:0.2rem;background:${PRIORITY_COLOUR[ticket.priority]};color:#fff;font-size:0.78rem;font-weight:600">${escapeHtml(PRIORITY_LABEL[ticket.priority])}</span>
  <span style="color:#574A38;font-size:0.86rem">&nbsp;${escapeHtml(topicLabel[ticket.topic])} &middot; via ${ticket.channel === 'email' ? 'email' : 'the portal'} &middot; opened ${escapeHtml(relative(ticket.created_at, now))}</span>
</p>

${allocation}

${overdue ? `<p style="margin:0 0 1rem 0;padding:0.5rem 0.7rem;background:#FBEAE5;border-left:3px solid #B3402B;font-size:0.9rem"><strong>First response is overdue.</strong> Target was ${escapeHtml(policy.firstResponseLabel)} from opening.</p>` : ''}

${field('Who is waiting', `${escapeHtml(ticket.requester_name ?? 'Name not given')}<br><a href="mailto:${escapeHtml(ticket.requester_email)}" style="color:#D07B3F">${escapeHtml(ticket.requester_email)}</a>`)}
${field('Why it stopped', escapeHtml(input.reason))}
${field(
    'Clock',
    `First response ${escapeHtml(policy.firstResponseLabel)}, due ${escapeHtml(relative(ticket.sla_first_response_due, now))}.<br>Resolution ${escapeHtml(policy.resolveLabel)}, due ${escapeHtml(relative(ticket.sla_resolve_due, now))}.`,
  )}
${field('What the assistant already tried', tried)}
${RULE}
<p ${LABEL}>The conversation so far</p>
${thread}
${RULE}
<p style="margin:0 0 0.4rem 0">
  <a href="${input.adminUrl}" style="display:inline-block;padding:0.5rem 0.9rem;background:#241E15;color:#fff;text-decoration:none;border-radius:0.25rem;font-size:0.9rem">Open in the console</a>
</p>
<p style="margin:0 0 0.8rem 0;font-size:0.84rem;color:#574A38">Replying in the console emails ${escapeHtml(ticket.requester_email)} directly.
The requester's own view is <a href="${input.trackingUrl}" style="color:#D07B3F">here</a>.</p>
<p style="font-size:0.78rem;color:#8A7A63">Hamdam Support &middot; this is an internal handover, the requester has not seen it.</p>
</div>`;

  const urgency = ticket.priority === 'P1' || ticket.priority === 'P2' ? `${ticket.priority} ` : '';
  return { subject: `[${publicId}] ${urgency}needs a person: ${ticket.subject}`, html };
}

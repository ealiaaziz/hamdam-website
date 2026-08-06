import { escapeHtml, ticketPublicId } from '../ids.js';
import { PRIORITY_LABEL, type Priority } from '../itil.js';
import type { TicketWithRequester } from '../types.js';

// The email nobody wants to receive, which is the point.
//
// A ticket with no owner is the failure this desk is most likely to have and
// least likely to notice. Everything else announces itself: a requester waits
// and then writes again, a bounced email fails visibly, a dead cron shows in
// the console banner and on /health. Work that simply sits there looks exactly
// like work that is being handled, from every angle except opening it.
//
// Written to be actionable from the notification itself: which tickets, how
// old, how urgent, and a link straight to each one. The recipient should be
// able to decide whether to get up without opening a laptop first.

const WRAP = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#241E15;max-width:40rem;margin:0 auto;line-height:1.5">`;
const RULE = `<hr style="border:none;border-top:1px solid #241E15;opacity:0.15;margin:1.1rem 0">`;

const PRIORITY_COLOUR: Record<Priority, string> = {
  P1: '#B3402B',
  P2: '#C4682F',
  P3: '#7C6A4F',
  P4: '#8A7A63',
};

export interface UnassignedInput {
  tickets: readonly TicketWithRequester[];
  /** The true count, which can exceed `tickets.length` when the list was cut. */
  total: number;
  adminBaseUrl: string;
  now?: Date;
}

/** "3 hours", plainly, because an ISO timestamp needs arithmetic to read. */
function age(iso: string, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function unassignedDigestEmail(input: UnassignedInput): { subject: string; html: string } {
  const now = input.now ?? new Date();
  const shown = input.tickets.length;
  const hidden = Math.max(0, input.total - shown);

  const rows = input.tickets
    .map((t) => {
      const publicId = ticketPublicId(t.id);
      const overdue = new Date(t.sla_first_response_due).getTime() < now.getTime() && !t.first_response_at;
      return `<tr>
  <td style="padding:0.45rem 0.6rem 0.45rem 0;vertical-align:top">
    <span style="display:inline-block;padding:0.1rem 0.45rem;border-radius:0.2rem;background:${PRIORITY_COLOUR[t.priority]};color:#fff;font-size:0.74rem;font-weight:600">${escapeHtml(PRIORITY_LABEL[t.priority])}</span>
  </td>
  <td style="padding:0.45rem 0;vertical-align:top">
    <a href="${input.adminBaseUrl}/admin/tickets/${t.id}" style="color:#241E15;font-weight:600;text-decoration:none">${escapeHtml(publicId)} &middot; ${escapeHtml(t.subject)}</a><br>
    <span style="font-size:0.82rem;color:#574A38">${escapeHtml(t.requester_email)} &middot; open ${escapeHtml(age(t.created_at, now))} &middot; ${escapeHtml(t.status)}${overdue ? ' &middot; <strong style="color:#B3402B">first response overdue</strong>' : ''}</span>
  </td>
</tr>`;
    })
    .join('\n');

  const html = `${WRAP}
<p style="margin:0 0 0.2rem 0;font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;color:#8A7A63">Nobody owns these</p>
<h1 style="margin:0 0 0.6rem 0;font-size:1.3rem">${input.total} unassigned ticket${input.total === 1 ? '' : 's'}</h1>
<p style="margin:0 0 1rem 0;font-size:0.92rem;color:#574A38">These are open and have no assignee. The desk checks every two hours and
only writes when something new turns up, or once a day while the list is not empty.</p>
${RULE}
<table style="width:100%;border-collapse:collapse">${rows}</table>
${hidden > 0 ? `<p style="margin:0.8rem 0 0 0;font-size:0.88rem;color:#574A38">And ${hidden} more not listed here.</p>` : ''}
${RULE}
<p style="margin:0 0 0.4rem 0">
  <a href="${input.adminBaseUrl}/admin" style="display:inline-block;padding:0.5rem 0.9rem;background:#241E15;color:#fff;text-decoration:none;border-radius:0.25rem;font-size:0.9rem">Open the queue</a>
</p>
<p style="font-size:0.78rem;color:#8A7A63">Hamdam Support &middot; assigning a ticket in the console takes it off this list.</p>
</div>`;

  return { subject: `[Hamdam Support] ${input.total} unassigned ticket${input.total === 1 ? '' : 's'}`, html };
}

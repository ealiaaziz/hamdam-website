// Outbound email bodies. These render as inline-styled HTML because email
// clients ignore <link>/external stylesheets and most strip <style> blocks
// -- this is the one place in the codebase inline styling is correct, not a
// CSP violation, because it never goes through the Worker's own CSP'd
// response path (Composio/Outlook sends it, not this Worker).

import { PRIORITY_LABEL, SLA_POLICY, type Priority } from '../itil.js';
import { escapeHtml, textToSafeHtml, ticketPublicId } from '../ids.js';

const WRAP_OPEN = `<div style="font-family:Georgia,'Times New Roman',serif;color:#241E15;max-width:34rem;margin:0 auto;line-height:1.55">`;
const WRAP_CLOSE = `</div>`;
const RULE = `<hr style="border:none;border-top:1px solid #241E15;opacity:0.15;margin:1.25rem 0">`;
const FOOTER = `<p style="font-size:0.8rem;color:#574A38">Hamdam Support &middot; developer@hamdam.com.au &middot; hamdam.com.au</p>`;

export function ackEmail(opts: {
  ticketId: number;
  subject: string;
  priority: Priority;
  trackingUrl: string;
  requesterName: string | null;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const policy = SLA_POLICY[opts.priority];
  const greeting = opts.requesterName ? `Hi ${escapeHtml(opts.requesterName.split(' ')[0])},` : 'Hi,';
  const html = `${WRAP_OPEN}
<p>${greeting}</p>
<p>Thanks for reaching out. We've opened a support ticket for you:</p>
<p style="font-size:1.05rem"><strong>${escapeHtml(publicId)}</strong> &middot; ${escapeHtml(opts.subject)}</p>
<p>Priority: <strong>${escapeHtml(PRIORITY_LABEL[opts.priority])}</strong>. Our target is to make first contact
within ${escapeHtml(policy.firstResponseLabel)} and to resolve within ${escapeHtml(policy.resolveLabel)}.
${opts.priority === 'P1' || opts.priority === 'P2' ? "Because you've flagged this as urgent, it's now at the top of our queue." : ''}</p>
<p>You can track progress and reply any time here:<br>
<a href="${opts.trackingUrl}" style="color:#D07B3F">${escapeHtml(opts.trackingUrl)}</a></p>
<p>Or just reply to this email. Either way, it lands in the same place.</p>
<p>One thing worth knowing: the tracking page answers straight away, so if
we already have a fix written up for what you are seeing, you will get it
there in seconds rather than waiting on this mailbox.</p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`;
  return { subject: `[${publicId}] ${opts.subject}`, html };
}

export function agentReplyEmail(opts: {
  ticketId: number;
  subject: string;
  agentName: string;
  message: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const html = `${WRAP_OPEN}
<p>${textToSafeHtml(opts.message)}</p>
${RULE}
<p style="font-size:0.85rem;color:#574A38">${escapeHtml(opts.agentName)}, Hamdam Support (${escapeHtml(publicId)})</p>
${FOOTER}
${WRAP_CLOSE}`;
  return { subject: `[${publicId}] ${opts.subject}`, html };
}

/**
 * Sent to the desk, not to a requester, when someone replies through the
 * portal's tracking page.
 *
 * Without this the reply lands silently: a comment row appears and nothing
 * tells an agent it happened, so the only way to notice is to open the
 * ticket on the off chance. The requester meanwhile has every reason to
 * think they have been heard.
 */
export function requesterReplyNotification(opts: {
  ticketId: number;
  subject: string;
  requesterName: string | null;
  requesterEmail: string;
  message: string;
  adminUrl: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const who = opts.requesterName ? `${opts.requesterName} (${opts.requesterEmail})` : opts.requesterEmail;
  const html = `${WRAP_OPEN}
<p><strong>${escapeHtml(who)}</strong> replied on the portal to
<strong>${escapeHtml(publicId)}</strong> &middot; ${escapeHtml(opts.subject)}</p>
<blockquote style="margin:1rem 0;padding-left:1rem;border-left:3px solid #E8B04B;color:#574A38">
${textToSafeHtml(opts.message)}
</blockquote>
<p><a href="${opts.adminUrl}" style="color:#D07B3F">Open ${escapeHtml(publicId)} in the console</a></p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`;
  return { subject: `[${publicId}] Requester replied: ${opts.subject}`, html };
}

export function resolvedEmail(opts: { ticketId: number; subject: string; trackingUrl: string }): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const html = `${WRAP_OPEN}
<p>We've marked <strong>${escapeHtml(publicId)}</strong> as resolved.</p>
<p>If that's not quite right, just reply to this email (or use the link below) and we'll reopen it.</p>
<p><a href="${opts.trackingUrl}" style="color:#D07B3F">${escapeHtml(opts.trackingUrl)}</a></p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`;
  return { subject: `[${publicId}] Resolved: ${opts.subject}`, html };
}

/**
 * The conversation so far, emailed to the requester.
 *
 * This is the desk's one outbound update per ticket, and it exists because
 * of how the portal and the mailbox differ. The portal answers instantly and
 * the requester is watching it. Email is slower and lands somewhere they
 * will read later, so sending one on every turn produces a pile of
 * half-finished threads describing a problem that has since moved on.
 *
 * So it goes out when the conversation has reached a state worth recording:
 * they said it was solved, a person took the ticket, or they asked for it.
 * The content is the thread they have already read, which is what makes
 * sending it without a human first reading it defensible. Nothing new is
 * being asserted here, and nothing in it has escaped review that was not
 * already on the requester's screen.
 */
export function conversationSummaryEmail(opts: {
  ticketId: number;
  subject: string;
  priority: Priority;
  requesterName: string | null;
  trackingUrl: string;
  status: 'resolved' | 'with_a_person' | 'in_progress';
  turns: readonly { who: 'you' | 'support'; body: string }[];
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const greeting = opts.requesterName ? `Hi ${escapeHtml(opts.requesterName.split(' ')[0])},` : 'Hi,';

  const opening = {
    resolved: 'Glad that sorted it. Here is the whole conversation for your records, in case it comes up again:',
    with_a_person:
      'This one is now with a person on the team rather than the assistant. They can see everything below, so you will not need to repeat any of it. Here is where things got to:',
    in_progress: 'Here is where this has got to so far:',
  }[opts.status];

  const closing = {
    resolved: 'If it comes back, reply to this email and it reopens the same ticket.',
    with_a_person: 'You will hear from them here. Replying to this email adds to the same ticket.',
    in_progress: 'Reply to this email or use the link below to carry on.',
  }[opts.status];

  const thread = opts.turns
    .map(
      (t) => `<div style="margin:0 0 1rem 0;padding:0 0 0 0.85rem;border-left:2px solid ${t.who === 'you' ? '#D07B3F' : '#C9BBA6'}">
  <p style="margin:0 0 0.3rem 0;font-size:0.78rem;letter-spacing:0.04em;text-transform:uppercase;color:#574A38">${t.who === 'you' ? 'You' : 'Hamdam Support'}</p>
  <p style="margin:0">${textToSafeHtml(t.body)}</p>
</div>`,
    )
    .join('\n');

  const html = `${WRAP_OPEN}
<p>${greeting}</p>
<p>${opening}</p>
<p style="font-size:1.05rem"><strong>${escapeHtml(publicId)}</strong> &middot; ${escapeHtml(opts.subject)}</p>
${RULE}
${thread}
${RULE}
<p>${closing}</p>
<p><a href="${opts.trackingUrl}" style="color:#D07B3F">Open ${escapeHtml(publicId)}</a></p>
${FOOTER}
${WRAP_CLOSE}`;

  const prefix = { resolved: 'Resolved', with_a_person: 'Update', in_progress: 'Update' }[opts.status];
  return { subject: `[${publicId}] ${prefix}: ${opts.subject}`, html };
}

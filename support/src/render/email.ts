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

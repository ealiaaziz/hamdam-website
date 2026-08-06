// Outbound email bodies. These render as inline-styled HTML because email
// clients ignore <link>/external stylesheets and most strip <style> blocks
// -- this is the one place in the codebase inline styling is correct, not a
// CSP violation, because it never goes through the Worker's own CSP'd
// response path (Composio/Outlook sends it, not this Worker).

import { PRIORITY_LABEL, SLA_POLICY, type Priority } from '../itil.js';
import { escapeHtml, textToSafeHtml, ticketPublicId } from '../ids.js';
import { direction, strings, type Locale } from '../i18n.js';
import { identity } from '../identity.js';

const WRAP_OPEN = `<div style="font-family:Georgia,'Times New Roman',serif;color:#241E15;max-width:34rem;margin:0 auto;line-height:1.55">`;
const WRAP_CLOSE = `</div>`;
const RULE = `<hr style="border:none;border-top:1px solid #241E15;opacity:0.15;margin:1.25rem 0">`;
const footer = () =>
  `<p style="font-size:0.8rem;color:#574A38">${escapeHtml(identity().brandName)} &middot; ${escapeHtml(identity().mailbox)}</p>`;

export function ackEmail(opts: {
  ticketId: number;
  subject: string;
  priority: Priority;
  trackingUrl: string;
  requesterName: string | null;
  locale?: Locale;
}): { subject: string; html: string } {
  const locale = opts.locale ?? 'en';
  const t = strings(locale);
  const publicId = ticketPublicId(opts.ticketId);
  const policy = SLA_POLICY[opts.priority];
  const dir = direction(locale);
  const html = `<div dir="${dir}">${WRAP_OPEN}
<p>${escapeHtml(t.ackGreeting(opts.requesterName))}</p>
<p>${escapeHtml(t.ackOpened)}</p>
<p style="font-size:1.05rem"><strong>${escapeHtml(publicId)}</strong> &middot; ${escapeHtml(opts.subject)}</p>
<p>${escapeHtml(t.priorityLine(PRIORITY_LABEL[opts.priority], policy.firstResponseLabel, policy.resolveLabel))}</p>
<p>${escapeHtml(t.ackTrack)}<br>
<a href="${opts.trackingUrl}" style="color:#D07B3F">${escapeHtml(opts.trackingUrl)}</a></p>
<p>${escapeHtml(t.ackOrReply)}</p>
<p>${escapeHtml(t.ackPortalFast)}</p>
${RULE}
${footer()}
${WRAP_CLOSE}</div>`;
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
<p style="font-size:0.85rem;color:#574A38">${escapeHtml(opts.agentName)}, ${escapeHtml(identity().brandName)} (${escapeHtml(publicId)})</p>
${footer()}
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
  /** Where the reply came from. Defaults to the portal, which is where this started. */
  via?: 'portal' | 'email';
  /**
   * Set when this is going to the one person who owns the ticket rather than
   * to the desk's shared mailbox.
   *
   * It changes what the email is for. To the mailbox it is a heads-up that
   * somebody should look; to the assignee it is their ticket moving, and the
   * useful thing to tell them is that they can answer by replying here rather
   * than by finding a laptop.
   */
  toAssignee?: boolean;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const who = opts.requesterName ? `${opts.requesterName} (${opts.requesterEmail})` : opts.requesterEmail;
  const where = opts.via === 'email' ? 'by email' : 'on the portal';
  const howToAnswer = opts.toAssignee
    ? `<p style="font-size:0.9rem;color:#574A38">This ticket is allocated to you. Replying to this email answers
${escapeHtml(opts.requesterEmail)} directly, as long as <strong>${escapeHtml(publicId)}</strong> stays in the subject line.</p>`
    : '';
  const html = `${WRAP_OPEN}
<p><strong>${escapeHtml(who)}</strong> replied ${where} to
<strong>${escapeHtml(publicId)}</strong> &middot; ${escapeHtml(opts.subject)}</p>
<blockquote style="margin:1rem 0;padding-left:1rem;border-left:3px solid #E8B04B;color:#574A38">
${textToSafeHtml(opts.message)}
</blockquote>
${howToAnswer}
<p><a href="${opts.adminUrl}" style="color:#D07B3F">Open ${escapeHtml(publicId)} in the console</a></p>
${RULE}
${footer()}
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
${footer()}
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
  <p style="margin:0 0 0.3rem 0;font-size:0.78rem;letter-spacing:0.04em;text-transform:uppercase;color:#574A38">${t.who === 'you' ? 'You' : escapeHtml(identity().brandName)}</p>
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
${footer()}
${WRAP_CLOSE}`;

  const prefix = { resolved: 'Resolved', with_a_person: 'Update', in_progress: 'Update' }[opts.status];
  return { subject: `[${publicId}] ${prefix}: ${opts.subject}`, html };
}

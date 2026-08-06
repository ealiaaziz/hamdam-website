import { escapeHtml, textToSafeHtml, ticketPublicId } from '../ids.js';
import { renderSteps } from './agentSuggestion.js';
import type { KbArticle } from '../kb.js';
import { identity } from '../identity.js';

// Emails the assistant drafts. Inline-styled for the same reason as the
// rest of render/email.ts: mail clients ignore external stylesheets.
//
// Both of these are drafts until a person approves them, so they are signed
// as the desk rather than as a machine -- by the time one is sent, a human
// has read it and chosen to send it. What they must never do is imply more
// review than happened, which is why neither says "I have looked into this"
// or anything else asserting an investigation nobody performed.

const WRAP_OPEN = `<div style="font-family:Georgia,'Times New Roman',serif;color:#241E15;max-width:34rem;margin:0 auto;line-height:1.55">`;
const WRAP_CLOSE = `</div>`;
const RULE = `<hr style="border:none;border-top:1px solid #241E15;opacity:0.15;margin:1.25rem 0">`;
const footer = () =>
  `<p style="font-size:0.8rem;color:#574A38">${escapeHtml(identity().brandName)} &middot; ${escapeHtml(identity().mailbox)}</p>`;

function greeting(name: string | null): string {
  return name ? `Hi ${escapeHtml(name.split(' ')[0])},` : 'Hi,';
}

export function assistantSolutionEmail(opts: {
  ticketId: number;
  subject: string;
  article: KbArticle;
  requesterName: string | null;
  trackingUrl: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const html = `${WRAP_OPEN}
<p>${greeting(opts.requesterName)}</p>
<p>This looks like something we have run into before. Here is what usually sorts it:</p>
<p style="font-weight:bold">${escapeHtml(opts.article.title)}</p>
${renderSteps(opts.article.steps)}
<p>If that does not do it, reply to this email and tell us what happened when
you tried, and we will take it from there.</p>
<p><a href="${opts.trackingUrl}" style="color:#D07B3F">Track ${escapeHtml(publicId)}</a></p>
${RULE}
${footer()}
${WRAP_CLOSE}`;
  return { subject: `[${publicId}] ${opts.subject}`, html };
}

/**
 * An email carrying whatever the assistant wrote in the thread.
 *
 * The two renderers above put the desk's own sentences around a reviewed
 * article. This one exists because the assistant now also answers questions
 * no article covers, and the reply the requester read in the portal is the
 * reply that should reach their inbox. Sending them a differently worded
 * email about the same problem is how a desk starts contradicting itself.
 *
 * The body is escaped, not trusted: it is model output, and it goes out over
 * the desk's name once a person approves it.
 */
export function assistantWrittenEmail(opts: {
  ticketId: number;
  subject: string;
  body: string;
  requesterName: string | null;
  trackingUrl: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const html = `${WRAP_OPEN}
<p>${greeting(opts.requesterName)}</p>
<p>${textToSafeHtml(opts.body)}</p>
<p>If that does not do it, reply to this email and tell us what happened when
you tried, and we will take it from there.</p>
<p><a href="${opts.trackingUrl}" style="color:#D07B3F">Track ${escapeHtml(publicId)}</a></p>
${RULE}
${footer()}
${WRAP_CLOSE}`;
  return { subject: `[${publicId}] ${opts.subject}`, html };
}

export function assistantClarifyingEmail(opts: {
  ticketId: number;
  subject: string;
  question: string;
  requesterName: string | null;
  trackingUrl: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const html = `${WRAP_OPEN}
<p>${greeting(opts.requesterName)}</p>
<p>Thanks for the detail so far. One thing would help us narrow this down:</p>
<p style="font-weight:bold">${textToSafeHtml(opts.question)}</p>
<p>Reply whenever suits and we will pick it up from there.</p>
<p><a href="${opts.trackingUrl}" style="color:#D07B3F">Track ${escapeHtml(publicId)}</a></p>
${RULE}
${footer()}
${WRAP_CLOSE}`;
  return { subject: `[${publicId}] ${opts.subject}`, html };
}

import { page } from './layout.js';
import { escapeHtml } from '../ids.js';

export function submitFormPage(opts: { error?: string; values?: Record<string, string> } = {}): string {
  const v = opts.values ?? {};
  const val = (k: string) => escapeHtml(v[k] ?? '');
  const body = `
<h1>How can we help?</h1>
<p class="lede">Tell us what's going on and we'll open a ticket right away. You'll get an email confirmation
with a link to track it, and everything after this happens by email too. Just reply, or come back here.</p>
${opts.error ? `<div class="notice notice--error">${escapeHtml(opts.error)}</div>` : ''}
<form class="card" method="post" action="/tickets">
  <div class="grid-2">
    <div class="field">
      <label for="name">Your name</label>
      <input type="text" id="name" name="name" value="${val('name')}" required>
    </div>
    <div class="field">
      <label for="email">Your email</label>
      <input type="email" id="email" name="email" value="${val('email')}" required>
    </div>
  </div>
  <div class="field">
    <label for="subject">Subject</label>
    <input type="text" id="subject" name="subject" value="${val('subject')}" required maxlength="200">
  </div>
  <div class="field">
    <label for="description">What's happening?</label>
    <textarea id="description" name="description" required>${val('description')}</textarea>
  </div>
  <div class="grid-2">
    <div class="field">
      <label for="impact">Who's affected?</label>
      <select id="impact" name="impact">
        <option value="low">Just me</option>
        <option value="medium">My whole team</option>
        <option value="high">The whole organisation</option>
      </select>
    </div>
    <div class="field">
      <label for="urgency">How urgent is it?</label>
      <select id="urgency" name="urgency">
        <option value="low">It can wait</option>
        <option value="medium" selected>It's slowing me down</option>
        <option value="high">I'm stuck, I can't work</option>
      </select>
    </div>
  </div>
  <button class="btn" type="submit">Submit ticket</button>
</form>
`;
  return page({ title: 'Submit a ticket', nav: [{ href: '/track', label: 'Track a ticket' }] }, body);
}

export function trackLookupPage(opts: { error?: string } = {}): string {
  const body = `
<h1>Track a ticket</h1>
<p class="lede">Use the link from your confirmation email, or enter your ticket ID and tracking code below.</p>
${opts.error ? `<div class="notice notice--error">${escapeHtml(opts.error)}</div>` : ''}
<form class="card" method="get" action="/tickets/lookup">
  <div class="field">
    <label for="id">Ticket ID</label>
    <input type="text" id="id" name="id" placeholder="HAM-1042" required>
  </div>
  <div class="field">
    <label for="token">Tracking code</label>
    <input type="text" id="token" name="token" placeholder="from your confirmation email" required>
  </div>
  <button class="btn" type="submit">View ticket</button>
</form>
`;
  return page({ title: 'Track a ticket', nav: [{ href: '/', label: 'Submit a ticket' }] }, body);
}

/**
 * What someone outside the served countries gets.
 *
 * Not a bare 403. The person on the other end is usually a customer on
 * holiday, not an attacker, and the one thing they need is the route that
 * still works. Email is not geo-restricted: the cron reads it and opens a
 * ticket exactly as this form would.
 */
export function outOfRegionPage(): string {
  return page(
    { title: 'Support by email' },
    `
<h1>The support portal is not available in your country</h1>
<p class="lede">The portal serves the countries Hamdam is sold in. That is a
deliberate restriction, and it does not mean we cannot help you.</p>
<div class="card">
  <p><strong>Email <a href="mailto:developer@hamdam.com.au">developer@hamdam.com.au</a></strong>
  from anywhere in the world and a ticket opens straight away. You will get a
  reply within a minute, and everything the portal can do happens in that
  thread instead.</p>
  <p class="hint">Include as much detail as you can: what you were doing, what
  you expected, and what happened instead. If it is about the Hamdam app, say
  which iPhone you are on.</p>
</div>
`,
  );
}

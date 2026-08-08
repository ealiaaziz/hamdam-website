import { page } from './layout.js';
import { escapeHtml } from '../ids.js';
import { localePath, strings, type Locale } from '../i18n.js';

export function submitFormPage(
  opts: { error?: string; values?: Record<string, string>; locale?: Locale } = {},
): string {
  const locale = opts.locale ?? 'en';
  const t = strings(locale);
  const v = opts.values ?? {};
  const val = (k: string) => escapeHtml(v[k] ?? '');
  const body = `
<h1>${escapeHtml(t.submitHeading)}</h1>
<p class="lede">${escapeHtml(t.submitLede)}</p>
${opts.error ? `<div class="notice notice--error">${escapeHtml(opts.error)}</div>` : ''}
<form class="card" method="post" action="${localePath(locale, '/tickets')}">
  <div class="grid-2">
    <div class="field">
      <label for="name">${escapeHtml(t.fieldName)}</label>
      <input type="text" id="name" name="name" value="${val('name')}" required>
    </div>
    <div class="field">
      <label for="email">${escapeHtml(t.fieldEmail)}</label>
      <input type="email" id="email" name="email" value="${val('email')}" required>
    </div>
  </div>
  <div class="field">
    <label for="subject">${escapeHtml(t.fieldSubject)}</label>
    <input type="text" id="subject" name="subject" value="${val('subject')}" required maxlength="200">
  </div>
  <div class="field">
    <label for="description">${escapeHtml(t.fieldDescription)}</label>
    <textarea id="description" name="description" required>${val('description')}</textarea>
    <p class="hint">${escapeHtml(t.submitAiNotice)}</p>
  </div>
  <div class="grid-2">
    <div class="field">
      <label for="impact">${escapeHtml(t.fieldImpact)}</label>
      <select id="impact" name="impact">
        <option value="low">${escapeHtml(t.impactLow)}</option>
        <option value="medium">${escapeHtml(t.impactMedium)}</option>
        <option value="high">${escapeHtml(t.impactHigh)}</option>
      </select>
    </div>
    <div class="field">
      <label for="urgency">${escapeHtml(t.fieldUrgency)}</label>
      <select id="urgency" name="urgency">
        <option value="low">${escapeHtml(t.urgencyLow)}</option>
        <option value="medium" selected>${escapeHtml(t.urgencyMedium)}</option>
        <option value="high">${escapeHtml(t.urgencyHigh)}</option>
      </select>
    </div>
  </div>
  <button class="btn" type="submit">${escapeHtml(t.submitButton)}</button>
</form>
`;
  return page(
    { title: t.submitTitle, locale, nav: [{ href: localePath(locale, '/track'), label: t.trackTitle }] },
    body,
  );
}

export function trackLookupPage(opts: { error?: string; locale?: Locale } = {}): string {
  const locale = opts.locale ?? 'en';
  const t = strings(locale);
  const body = `
<h1>${escapeHtml(t.trackHeading)}</h1>
<p class="lede">${escapeHtml(t.trackLede)}</p>
${opts.error ? `<div class="notice notice--error">${escapeHtml(opts.error)}</div>` : ''}
<form class="card" method="get" action="${localePath(locale, '/tickets/lookup')}">
  <div class="field">
    <label for="id">${escapeHtml(t.fieldTicketId)}</label>
    <input type="text" id="id" name="id" placeholder="HAM-1" required>
  </div>
  <div class="field">
    <label for="token">${escapeHtml(t.fieldToken)}</label>
    <input type="text" id="token" name="token" required>
  </div>
  <button class="btn" type="submit">${escapeHtml(t.trackButton)}</button>
</form>
`;
  return page({ title: t.trackTitle, locale, nav: [{ href: localePath(locale, '/'), label: t.submitTitle }] }, body);
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

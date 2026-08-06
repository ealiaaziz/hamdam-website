import type { Priority } from '../itil.js';
import { PRIORITY_LABEL } from '../itil.js';
import type { TicketStatus } from '../types.js';
import { escapeHtml } from '../ids.js';
import { direction, localePath, strings, type Locale, type Strings } from '../i18n.js';
import { identity } from '../identity.js';

export interface LayoutOptions {
  title: string;
  wide?: boolean;
  nav?: Array<{ href: string; label: string }>;
  bodyClass?: string;
  /** Defaults to English. The console is always English; the portal is not. */
  locale?: Locale;
}

/**
 * What to call this desk in the page chrome.
 *
 * A configured deployment uses its own name. Hamdam does not configure one and
 * keeps the bilingual pair it already had, because the Persian chrome is its
 * own string rather than a translation of an English brand: overriding it
 * unconditionally retitled the Persian portal in English.
 */
function brand(t: Strings): string {
  return identity().brandConfigured ? escapeHtml(identity().brandName) : `Hamdam ${escapeHtml(t.brandSupport)}`;
}

export function page(opts: LayoutOptions, bodyHtml: string): string {
  const locale = opts.locale ?? 'en';
  const t = strings(locale);
  const dir = direction(locale);
  const home = localePath(locale, '/');

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)} · ${brand(t)}</title>
<link rel="stylesheet" href="/static/app.css">
<meta name="robots" content="noindex">
</head>
<body${opts.bodyClass ? ` class="${opts.bodyClass}"` : ''}>
<div class="shell${opts.wide ? ' shell--wide' : ''}">
<header class="brand">
  <a class="wordmark" href="${home}">${identity().brandConfigured ? escapeHtml(identity().brandName) : `Hamdam <span>${escapeHtml(t.brandSupport)}</span>`}</a>
  <nav>${(opts.nav ?? []).map((n) => `<a href="${n.href}">${escapeHtml(n.label)}</a>`).join('')}<a href="${t.otherLanguageHref}" lang="${locale === 'fa' ? 'en' : 'fa'}">${escapeHtml(t.otherLanguage)}</a></nav>
</header>
${bodyHtml}
<footer class="meta">
  ${brand(t)} &middot; ${t.footer}
  <a href="mailto:${escapeHtml(identity().mailbox)}">${escapeHtml(identity().mailbox)}</a>
</footer>
</div>
</body>
</html>`;
}

export function priorityBadge(priority: Priority): string {
  return `<span class="badge badge--${priority}">${escapeHtml(PRIORITY_LABEL[priority])}</span>`;
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  new: 'New',
  open: 'Open',
  pending: 'Waiting on you',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function statusBadge(status: TicketStatus, locale: Locale = 'en'): string {
  const cls = status === 'resolved' || status === 'closed' ? 'badge--resolved' : 'badge--status';
  const t = strings(locale);
  const label: Record<TicketStatus, string> = {
    new: locale === 'en' ? STATUS_LABEL.new : t.statusNew,
    open: locale === 'en' ? STATUS_LABEL.open : t.statusOpen,
    pending: locale === 'en' ? STATUS_LABEL.pending : t.statusPending,
    resolved: locale === 'en' ? STATUS_LABEL.resolved : t.statusResolved,
    closed: locale === 'en' ? STATUS_LABEL.closed : t.statusClosed,
  };
  return `<span class="badge ${cls}">${escapeHtml(label[status])}</span>`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney',
  });
}

export function isOverdue(dueIso: string, resolvedAt: string | null): boolean {
  if (resolvedAt) return false;
  return new Date(dueIso).getTime() < Date.now();
}

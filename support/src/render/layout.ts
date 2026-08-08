import type { Priority } from '../itil.js';
import { PRIORITY_LABEL } from '../itil.js';
import type { TicketStatus } from '../types.js';
import { escapeHtml } from '../ids.js';
import { direction, localePath, strings, type Locale } from '../i18n.js';

export interface LayoutOptions {
  title: string;
  wide?: boolean;
  nav?: Array<{ href: string; label: string }>;
  bodyClass?: string;
  /** Defaults to English. The console is always English; the portal is not. */
  locale?: Locale;
}

/**
 * Every interpolated attribute goes through `escapeHtml`, including the two
 * that did not.
 *
 * `opts.bodyClass` and each `nav[].href` were written straight into a
 * double-quoted attribute. Both are supplied by callers in this repository and
 * every current value is a constant, so neither was exploitable the day it was
 * found. That is a fact about the callers and not about this function, and it
 * is exactly the property that stops being true quietly: the first caller to
 * build a nav href out of a query parameter or a ticket subject would close
 * the attribute with a `"` and open an event handler, and nothing in the type
 * signature would object. A renderer is the last place that can still refuse,
 * and it is cheap for it to refuse uniformly rather than case by case.
 *
 * `bodyClass` is unused today and kept rather than deleted because it costs a
 * function call and removes the question.
 */
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
<title>${escapeHtml(opts.title)} · Hamdam ${escapeHtml(t.brandSupport)}</title>
<link rel="stylesheet" href="/static/app.css">
<meta name="robots" content="noindex">
</head>
<body${opts.bodyClass ? ` class="${escapeHtml(opts.bodyClass)}"` : ''}>
<div class="shell${opts.wide ? ' shell--wide' : ''}">
<header class="brand">
  <a class="wordmark" href="${home}">Hamdam <span>${escapeHtml(t.brandSupport)}</span></a>
  <nav>${(opts.nav ?? []).map((n) => `<a href="${escapeHtml(n.href)}">${escapeHtml(n.label)}</a>`).join('')}<a href="${t.otherLanguageHref}" lang="${locale === 'fa' ? 'en' : 'fa'}">${escapeHtml(t.otherLanguage)}</a></nav>
</header>
${bodyHtml}
<footer class="meta">
  ${t.footer} ·
  <a href="https://hamdam.com.au">hamdam.com.au</a>
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

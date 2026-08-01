import type { Priority } from '../itil.js';
import { PRIORITY_LABEL } from '../itil.js';
import type { TicketStatus } from '../types.js';
import { escapeHtml } from '../ids.js';

export interface LayoutOptions {
  title: string;
  wide?: boolean;
  nav?: Array<{ href: string; label: string }>;
  bodyClass?: string;
}

export function page(opts: LayoutOptions, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)} · Hamdam Support</title>
<link rel="stylesheet" href="/static/app.css">
<meta name="robots" content="noindex">
</head>
<body${opts.bodyClass ? ` class="${opts.bodyClass}"` : ''}>
<div class="shell${opts.wide ? ' shell--wide' : ''}">
<header class="brand">
  <a class="wordmark" href="/">Hamdam <span>Support</span></a>
  <nav>${(opts.nav ?? []).map((n) => `<a href="${n.href}">${escapeHtml(n.label)}</a>`).join('')}</nav>
</header>
${bodyHtml}
<footer class="meta">
  Hamdam Support · every ticket is emailed to and from developer@hamdam.com.au ·
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

export function statusBadge(status: TicketStatus): string {
  const cls = status === 'resolved' || status === 'closed' ? 'badge--resolved' : 'badge--status';
  return `<span class="badge ${cls}">${escapeHtml(STATUS_LABEL[status])}</span>`;
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

// Human-facing ticket IDs are derived from the D1 autoincrement key, never
// stored separately (see migrations/0001_init.sql for why).

const PREFIX = 'HAM-';

export function ticketPublicId(id: number): string {
  return `${PREFIX}${id}`;
}

/** Returns null (not a throw) for anything that isn't a well-formed HAM-<n>. */
export function parseTicketPublicId(publicId: string): number | null {
  const match = /^HAM-(\d+)$/.exec(publicId.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Plain-text -> minimal-HTML for rendering user-authored ticket bodies safely. */
export function textToSafeHtml(input: string): string {
  return escapeHtml(input).replaceAll('\n', '<br>');
}

export function generateTrackingToken(): string {
  return crypto.randomUUID().replaceAll('-', '');
}

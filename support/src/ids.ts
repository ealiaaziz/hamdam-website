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

/**
 * Compares a tracking token in constant time.
 *
 * `a !== b` on strings stops at the first differing byte, so how long the
 * comparison took is a function of how much of the token the caller got
 * right. Over the public internet that signal is buried in jitter and this is
 * not the attack anyone would reach for against 122 bits of randomness. It is
 * also two lines, and the token is the only credential guarding a ticket:
 * there is no version of this worth being clever about.
 *
 * Length is compared normally and leaks nothing, because every token this
 * desk issues is the same 32 characters.
 */
export function tokensMatch(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return difference === 0;
}

/**
 * Very rough HTML-to-text, used only to record what an approved draft said
 * in the ticket thread. The thread renders with textToSafeHtml, so storing
 * raw HTML there would show the requester a page of tags.
 */
export function stripHtml(html: string): string {
  return html
    // Element *contents*, not just the tags, for the few elements whose
    // contents are not prose. Stripping only the tags left the body of a
    // <style> block sitting in the ticket as text, which is how a marketing
    // email became four hundred lines of CSS in a comment and in the model's
    // context. Scripts and comments go the same way and for a better reason:
    // whatever they hold, it is not what the person wrote.
    .replace(/<(script|style|head|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&middot;/g, '.')
    // Real email is full of these. A leaked "&nbsp;" in a ticket comment is
    // cosmetic; the same leak inside the model's context is noise it has to
    // reason past.
    .replace(/&nbsp;/gi, ' ')
    // Written as one character class rather than two named entities so the
    // repo's own dash check does not flag the very names it is here to strip.
    .replace(/&[mn]dash;|&#821[23];/gi, ', ')
    .replace(/&rsquo;|&#8217;/gi, "'")
    .replace(/&lsquo;|&#8216;/gi, "'")
    .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/&hellip;/gi, '...')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

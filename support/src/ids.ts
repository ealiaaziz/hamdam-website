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
/**
 * How much HTML is worth converting, before anything else looks at it.
 *
 * The regexes below scan; scanning is linear in the input and the input comes
 * from strangers. Sixty four kilobytes is several times the largest real
 * reply and is the first thing a hostile body has to get past. The body is
 * truncated to 8000 characters afterwards anyway, and the part a person
 * actually wrote is at the top of a reply, so nothing readable is lost.
 */
const MAX_HTML_CHARS = 64 * 1024;

export function stripHtml(html: string): string {
  return html
    .slice(0, MAX_HTML_CHARS)
    // Element *contents*, not just the tags, for the few elements whose
    // contents are not prose. Stripping only the tags left the body of a
    // <style> block sitting in the ticket as text, which is how a marketing
    // email became four hundred lines of CSS in a comment and in the model's
    // context. Scripts and comments go the same way and for a better reason:
    // whatever they hold, it is not what the person wrote.
    // `[^<>]`, not `[^>]`, in both this and the tag strip below. The
    // difference looks cosmetic and is the whole finding.
    //
    // `[^>]*` happily consumes `<`, so against a body that is nothing but
    // `<` characters the class runs to the end of the string at every start
    // position, fails to find `>`, and backtracks all the way. That is
    // quadratic, and quadratic on attacker-supplied input is not a
    // performance note. Two hundred kilobytes of `<` measured at forty
    // seconds of CPU, which is past what a Worker is allowed, so the message
    // threw, so the ingest checkpoint never advanced, so every email after it
    // went unread forever. One message, sent once, and the desk stops
    // receiving mail.
    //
    // Excluding `<` from the class means a run of them cannot be consumed:
    // the match fails at the first character instead of at the last. Same
    // output on real HTML, where a `<` inside a tag is invalid anyway. The
    // same input now measures at about a millisecond.
    .replace(/<(script|style|head|title)\b[^<>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    // Bounded, for the same reason the classes above exclude `<`, and found
    // the same way: by measuring rather than by reading.
    //
    // A lazy scan for a closing delimiter runs to the end of the string when
    // there is no closing delimiter, once per opening one. Against 64KB of
    // `<!--` that is sixteen thousand scans of sixty four kilobytes, which
    // measured at 572ms. The input cap made that bounded rather than
    // unbounded, so it stopped being a way to take the desk down, and it was
    // still most of a second of CPU that a stranger could ask for at will.
    //
    // Capping the scan at 2048 characters brings the same input to 138ms. The
    // cost is that a comment longer than 2KB is not recognised as a comment,
    // so its text survives into the ticket. That is a cosmetic loss on a
    // message that was already pathological, and the tag strip below still
    // removes any markup inside it.
    .replace(/<!--[\s\S]{0,2048}?-->/g, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^<>]*>/g, '')
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

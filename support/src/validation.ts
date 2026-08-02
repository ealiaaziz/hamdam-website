// Shape and size checks for everything a stranger can type into the portal.
//
// Until now the submit form asked one question of its input: is it non-empty.
// That is a smaller check than it looks, because the email field is not
// decoration. It decides where the desk sends an acknowledgement, and the
// subject rides along in that message's Subject line. An unvalidated pair
// turns an open form into a way of having developer@hamdam.com.au deliver
// attacker-chosen text to an attacker-chosen address, over a domain whose
// reputation is the thing that makes the desk's mail arrive at all.
//
// The `maxlength` on the form input is a hint to a browser and nothing at all
// to curl, so the caps live here as well. Without them a single POST can
// write an arbitrary number of megabytes into D1, into the model's context,
// and into an email.

/** Long enough for a real name, short enough to fit a greeting line. */
export const MAX_NAME_CHARS = 120;
/** RFC 5321's maximum reverse-path length. Nothing real is longer. */
export const MAX_EMAIL_CHARS = 254;
/** Matches the form's own maxlength, so the two cannot drift apart. */
export const MAX_SUBJECT_CHARS = 200;
/** The same cap the inbound email path already applies in messageBodyText. */
export const MAX_BODY_CHARS = 8000;

/**
 * A deliberately narrow address shape.
 *
 * Not an attempt at RFC 5322, which permits quoted local parts, comments and
 * bracketed literals that no support requester has ever typed and that every
 * downstream system disagrees about. The question being answered here is not
 * "is this a legal address" but "is this something the desk should hand to
 * Graph and ask it to deliver", and for that a plain local part, an @, and a
 * dotted domain is the right amount of address.
 *
 * The excluded characters matter more than the accepted ones: whitespace,
 * angle brackets, commas, semicolons, colons and quotes are what let one
 * field become two recipients or a display name wrapping a different address.
 */
const EMAIL_SHAPE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_CHARS) return false;
  // A leading, trailing or doubled dot in the local part is invalid and is
  // also the shape a parser disagreement usually hides in.
  const [local] = trimmed.split('@');
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return EMAIL_SHAPE.test(trimmed);
}

/**
 * Control characters that have no business in a ticket.
 *
 * Tab, newline and carriage return survive because a description is prose and
 * people press enter. Everything else in the C0 range, plus DEL, is either a
 * terminal escape or a way of making two strings that render identically
 * compare differently.
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * The invisible characters, which on this desk are not a theoretical problem.
 *
 * U+202E RIGHT-TO-LEFT OVERRIDE and its relatives reorder the text after them
 * without appearing themselves. A subject line can therefore be stored as one
 * string and displayed as a different one, and the display is what a person
 * reads when deciding what a ticket is. The console shows it, the escalation
 * email shows it, and the escalation email is specifically the message that
 * reaches whoever is about to act on it.
 *
 * Escaping does not help. These are not markup, they are text, and
 * `escapeHtml` correctly passes them through untouched. The only fix is to
 * not store them.
 *
 * That this desk renders right-to-left for half its users is the reason to be
 * careful here, not a reason to allow them. Persian, Arabic and Hebrew
 * letters carry their own direction: `dir="rtl"` on the page plus the Unicode
 * bidirectional algorithm lay real Persian out correctly with no explicit
 * override anywhere in the text. The characters removed here are the ones
 * whose whole function is to *contradict* what the letters say, which is
 * something prose never needs and a spoof always does.
 *
 * The zero-width set goes for a related reason: they make two strings that
 * render identically compare differently, which is how one ticket reference
 * or address passes for another.
 *
 * U+200C, the zero-width non-joiner, is deliberately kept. In Persian it is
 * not decoration, it is orthography, and words are misspelled without it.
 * Removing it would corrupt ordinary Persian text to defend against a spoof
 * it cannot perform.
 */
const INVISIBLE_CHARS = /[\u200B\u200D\u200E\u200F\u202A-\u202E\u2066-\u2069\u2060\uFEFF]/g;

/** Trim, strip control and invisible characters, and cap. Multi-line fields. */
export function cleanText(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(CONTROL_CHARS, '')
    .replace(INVISIBLE_CHARS, '')
    .trim()
    .slice(0, max);
}

/**
 * The same, for fields that are a single line.
 *
 * A subject becomes an email Subject header. Graph builds that header itself
 * from JSON, so a newline here cannot inject a second header the way an SMTP
 * string would, but it can still produce a subject that renders as two lines
 * in one client and one line in another. Collapsing is cheaper than reasoning
 * about which.
 */
export function cleanLine(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(CONTROL_CHARS, '')
    .replace(INVISIBLE_CHARS, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Whether a request body is small enough to be worth parsing.
 *
 * Checked from Content-Length before `formData()` reads anything, because the
 * cost being avoided is the read itself. A missing header is not a refusal:
 * chunked uploads have none, and the per-field caps above still apply.
 */
export const MAX_REQUEST_BYTES = 128 * 1024;

export function isOversizedBody(contentLength: string | undefined | null): boolean {
  if (!contentLength) return false;
  const bytes = Number(contentLength);
  return Number.isFinite(bytes) && bytes > MAX_REQUEST_BYTES;
}

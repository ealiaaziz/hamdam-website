/**
 * Reading "yes, do it" out of an email, in Farsi or English.
 *
 * The owner of the channel authorises changes to her bot by replying to the
 * desk. That reply is the only thing standing between a proposed change and a
 * deploy to a live channel, so this file has one job and treats it as a
 * safety interlock rather than a convenience: it says APPROVED only when the
 * text is unambiguous, and says UNCLEAR the rest of the time. Nothing here
 * ever guesses in favour of acting.
 *
 * Three rules, in order:
 *
 *   1. A refusal anywhere in the text wins. "بله ولی نه الان" is not consent,
 *      and neither is "yes, but wait".
 *   2. Approval must be a whole word. This matters far more in Farsi than in
 *      English: `requestedClosure` in agentPolicy.ts uses `includes()`, which
 *      is safe enough for "close this ticket" and would be a disaster here.
 *      "نه" (no) is a substring of خانه, روزنامه, بهانه, شنبه and hundreds of
 *      other ordinary words, and "آره" sits inside اداره and چاره. Substring
 *      matching would read a refusal, or an approval, out of a sentence about
 *      Saturday.
 *   3. Silence, a thank-you, or anything else is UNCLEAR, which means the
 *      change waits and she is asked again. An unanswered email must never
 *      become a deploy.
 */

/**
 * Fold the spellings of the same Persian letter into one.
 *
 * People type Farsi on Arabic keyboards, on iOS, and by pasting from
 * elsewhere, so the same word arrives as different code points: Arabic yeh
 * (ي) for Persian yeh (ی), Arabic kaf (ك) for ک, and a zero-width non-joiner
 * anywhere a word breaks. Without this, "نه" typed on one keyboard and "نه"
 * typed on another are different strings, and a refusal typed the wrong way
 * would read as UNCLEAR, which is safe but wrong.
 */
export function normalisePersian(text: string): string {
  return text
    .replace(/ي/g, 'ی') // Arabic yeh  → Persian yeh
    .replace(/ك/g, 'ک') // Arabic kaf  → Persian keheh
    // ZWNJ and the bidi controls break words. Written as escapes rather than
    // as the characters themselves: check:persian rejects a literal bidi
    // control anywhere in the repo, and it is right to, because a literal one
    // is invisible in review and can reorder the line it sits in.
    .replace(/[\u200B-\u200F\u202A-\u202E]/g, ' ')
    .replace(/[\u064B-\u0652]/g, '') // harakat, typed inconsistently
    .toLowerCase();
}

/**
 * Split into words on anything that is not a letter or a digit.
 *
 * Persian has no casing and does not space compound words the way English
 * does, so this is deliberately blunt: punctuation, spaces, emoji and line
 * breaks are all boundaries. A token is then compared whole, never as a
 * substring of a longer one.
 */
export function words(text: string): string[] {
  return normalisePersian(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Unambiguous consent, as a whole word. */
const APPROVE_WORDS = [
  'بله', 'بلی', 'اره', 'آره', 'اوکی', 'اوکیه', 'باشه', 'موافقم', 'تایید', 'تأیید',
  'yes', 'yep', 'ok', 'okay', 'approved', 'agreed',
];

const APPROVE_PHRASES = [
  'انجام بده', 'انجامش بده', 'اعمال کن', 'اعمالش کن', 'برو جلو', 'تایید می کنم',
  'تایید میکنم', 'مشکلی نیست', 'go ahead', 'do it', 'please do', 'ship it',
  'looks good', 'sounds good',
];

/**
 * Anything that means "not this, or not yet".
 *
 * Held to the same whole-word rule and checked first, because the failure
 * modes are not symmetrical: reading a refusal as consent deploys code to a
 * live channel, and reading consent as a refusal sends one more email.
 */
const REFUSE_WORDS = [
  'نه', 'نخیر', 'خیر', 'نکن', 'نفرست', 'صبر', 'فعلا', 'فعلاً', 'مخالفم',
  'no', 'nope', 'dont', 'stop', 'wait', 'hold', 'not',
];

const REFUSE_PHRASES = [
  'انجام نده', 'اعمال نکن', 'صبر کن', 'هنوز نه', 'الان نه',
  'do not', 'don t', 'not yet', 'hold off', 'back out', 'undo',
];

export type ApprovalVerdict = 'approved' | 'refused' | 'unclear';

function hasWord(tokens: readonly string[], list: readonly string[]): boolean {
  return tokens.some((token) => list.includes(token));
}

function hasPhrase(text: string, list: readonly string[]): boolean {
  // Matched on a space-collapsed copy so "انجام  بده" and "انجام\nبده" both
  // count, and padded so a phrase only ever matches whole words.
  const haystack = ` ${words(text).join(' ')} `;
  return list.some((phrase) => haystack.includes(` ${normalisePersian(phrase)} `));
}

/**
 * What the reply says about the change that was proposed to her.
 *
 * `unclear` is the default and the safe answer: the change is not applied,
 * and the desk asks again rather than assuming.
 */
export function approvalVerdict(text: string): ApprovalVerdict {
  const tokens = words(text);

  if (hasWord(tokens, REFUSE_WORDS) || hasPhrase(text, REFUSE_PHRASES)) return 'refused';
  if (hasWord(tokens, APPROVE_WORDS) || hasPhrase(text, APPROVE_PHRASES)) return 'approved';
  return 'unclear';
}

/** The reference printed in every approval request, e.g. `HAM-12/a3f9c1`. */
export function changeRef(ticketPublicId: string, headSha: string): string {
  return `${ticketPublicId}/${headSha.slice(0, 6)}`;
}

/**
 * Whether this reply approves *this* change.
 *
 * A bare "بله" is not enough on its own, because an email thread carries its
 * whole history: her "بله" to last week's change is quoted underneath every
 * later reply, and a naive read of the thread would find consent that was
 * given for something else. The desk records which change it last proposed,
 * and consent counts only for that one. So if the reply names a reference at
 * all, it has to be this one.
 */
export function approvesChange(text: string, latestRef: string): boolean {
  if (approvalVerdict(text) !== 'approved') return false;

  const referenced = text.match(/HAM-\d+\/[0-9a-f]{6}/gi) ?? [];
  if (referenced.length === 0) return true;
  return referenced.some((ref) => ref.toLowerCase() === latestRef.toLowerCase());
}

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

/**
 * Unambiguous consent, as a whole word.
 *
 * Widened deliberately, and only in one direction. The email asks her to reply
 * "بله", and people answering a yes/no question rarely use the word they were
 * offered: they write خوبه, حتماً, قبوله, or send a thumbs-up. Every one of
 * those used to be UNCLEAR, which is safe and reads to her exactly like the
 * bot ignoring her, which is the complaint that started all of this.
 *
 * What is deliberately NOT here is درسته. It looks like consent and is not:
 * "درسته که مشکل داره" means "it is true that it has a problem", so matching
 * it would read a bug report as permission to deploy. Anything that can open a
 * sentence rather than close one stays out. A false refusal costs one more
 * email; a false approval ships code to a live channel.
 */
const APPROVE_WORDS = [
  'بله', 'بلی', 'اره', 'آره', 'اوکی', 'اوکیه', 'باشه', 'موافقم', 'تایید', 'تأیید',
  'خوبه', 'حتما', 'حتماً', 'قبوله', 'بفرست', 'بفرستید', 'بزن', 'بزنید',
  'yes', 'yep', 'yeah', 'ok', 'okay', 'approve', 'approved', 'agreed',
];

const APPROVE_PHRASES = [
  'انجام بده', 'انجامش بده', 'انجام بدید', 'انجام بدهید', 'اعمال کن', 'اعمالش کن',
  'اعمال کنید', 'برو جلو', 'تایید می کنم', 'تایید میکنم', 'تاییده', 'مشکلی نیست',
  'ایرادی نداره', 'go ahead', 'do it', 'please do', 'ship it',
  'looks good', 'sounds good',
];

/**
 * Consent sent as an emoji, which `words()` cannot see.
 *
 * It splits on everything that is not a letter or a digit, so a reply of
 * nothing but 👍 tokenises to nothing at all and reads as UNCLEAR. Somebody
 * answering "shall I apply this?" with a thumbs-up has answered it, and on a
 * phone it is the most natural way to.
 *
 * Only the three that mean assent and nothing else. 🙏 is absent on purpose:
 * it is thanks or please, it ends most of her messages, and reading it as
 * consent would approve a deploy off the back of someone being polite.
 */
const APPROVE_EMOJI = ['👍', '✅', '👌'];

/**
 * Anything that means "not this, or not yet".
 *
 * Held to the same whole-word rule and checked first, because the failure
 * modes are not symmetrical: reading a refusal as consent deploys code to a
 * live channel, and reading consent as a refusal sends one more email.
 */
const REFUSE_WORDS = [
  'نه', 'نخیر', 'خیر', 'نکن', 'نفرست', 'نزن', 'صبر', 'فعلا', 'فعلاً', 'مخالفم',
  'بعدا', 'بعداً', 'نمیخوام', 'نخواستم',
  'no', 'nope', 'dont', 'stop', 'wait', 'hold', 'not',
];

const REFUSE_PHRASES = [
  'انجام نده', 'انجام ندید', 'اعمال نکن', 'اعمال نکنید', 'صبر کن', 'صبر کنید',
  'نمی خوام', 'هنوز نه', 'الان نه', 'فعلا نه',
  'do not', 'don t', 'not yet', 'hold off', 'back out', 'undo',
];

/** A refusal sent as an emoji, held to the same refusals-first rule. */
const REFUSE_EMOJI = ['👎', '❌', '🛑'];

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
  const normalised = normalisePersian(text);
  const hasEmoji = (list: readonly string[]) => list.some((emoji) => normalised.includes(emoji));

  if (hasWord(tokens, REFUSE_WORDS) || hasPhrase(text, REFUSE_PHRASES) || hasEmoji(REFUSE_EMOJI)) {
    return 'refused';
  }
  const approves = hasWord(tokens, APPROVE_WORDS)
    || hasPhrase(text, APPROVE_PHRASES)
    || hasEmoji(APPROVE_EMOJI);

  // An approval that also asks something is not an approval yet.
  //
  // On HAM-58 she wrote, of a change with three parts, "I agree with 1 and 3
  // and they are approved. About 2, you mean the seller's id is not shown to
  // the buyer and only the admin sees it, right?" This read that as yes and
  // recorded consent for the whole change, item 2 included, which she had
  // asked about rather than agreed to. Only the migration guard stopped it
  // merging.
  //
  // Consent has to name what it consents to, and someone still asking what
  // something does has not named it. So a question mark alongside agreement
  // makes the reply unclear, which relays it to the agent and asks her again
  // once she has the answer. That costs her one extra email; the other way
  // costs her code she did not agree to, on a channel with real sellers.
  //
  // The asymmetry is deliberate and only runs this way: a refusal with a
  // question in it is still a refusal, decided above, because stopping on a
  // maybe is free and shipping on one is not.
  if (approves && asksSomething(text)) return 'unclear';
  if (approves) return 'approved';
  return 'unclear';
}

/**
 * Whether the reply asks anything, in either alphabet's question mark.
 *
 * Persian uses U+061F and Latin keyboards produce U+003F, and she writes with
 * both. Nothing cleverer is attempted: a question mark is the one signal that
 * is unambiguous across the languages this desk reads, and guessing at
 * interrogative phrasing in Farsi is exactly the kind of cleverness that would
 * fail quietly on the messages that matter.
 */
function asksSomething(text: string): boolean {
  return /[?\u061F]/.test(text);
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

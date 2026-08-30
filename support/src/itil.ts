// ITIL-derived priority classification and SLA policy for Hamdam Support.
//
// Priority is impact x urgency, the standard ITIL 4 matrix collapsed to the
// four levels this desk actually needs (P1 Critical .. P4 Low). Portal
// submissions collect impact/urgency directly from the requester. Inbound
// email has neither, so classifyFromText() infers them from keywords -- it
// is a heuristic, not a guarantee, and every auto-classified ticket is
// re-priced by an agent on first read.
//
// SLA targets below are the desk's internal policy, used to compute the due
// timestamps stored on each ticket and to colour the dashboard queue. They
// are wall-clock, not business-hours-aware -- a deliberate MVP
// simplification (see support/README.md), not an oversight.
//
// IMPORTANT constraint this file's callers must respect: the email side of
// this desk is driven by an hourly-polling Routine (Cloudflare Routines'
// minimum cron interval), not a real-time webhook. So while the P1 target
// below is 15 minutes, an email-reported P1 can wait up to ~1 hour for the
// routine to even see it. Auto-reply copy must not promise a response time
// tighter than that reality -- see src/render/email.ts.

export type Impact = 'high' | 'medium' | 'low';
export type Urgency = 'high' | 'medium' | 'low';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export const PRIORITIES: readonly Priority[] = ['P1', 'P2', 'P3', 'P4'];

/**
 * Validate a priority from a query string or form body. See
 * parseTicketStatus in types.ts for why casting untrusted input is not a
 * substitute: an unvalidated priority also reaches SLA_POLICY[priority],
 * where a bogus key would throw on property access.
 */
export function parsePriority(value: string | undefined | null): Priority | undefined {
  return value && (PRIORITIES as readonly string[]).includes(value) ? (value as Priority) : undefined;
}

export const IMPACTS: readonly Impact[] = ['high', 'medium', 'low'];
export const URGENCIES: readonly Urgency[] = ['high', 'medium', 'low'];

/**
 * Validate an impact or urgency from the portal form (added 2026-08-07,
 * security review).
 *
 * These two were the only enums on the desk reaching storage through a bare
 * `as` cast rather than a whitelist, which is precisely what parsePriority's
 * comment above and parseTicketStatus's in types.ts already argue against. The
 * consequence was one frame later: classifyFromMatrix does
 * IMPACT_URGENCY_MATRIX[impact][urgency], so `impact=x` on the public form
 * threw on property access and answered a malformed body with a 500 instead of
 * the 400 it is. `impact=constructor` was worse in a quieter way, resolving to
 * the string "Object" and travelling on as a priority.
 *
 * Unknown values fall back to 'medium' rather than rejecting: this is a
 * severity hint from a picker, not an assertion, and the keyword pass plus the
 * P3 floor for anything about the app do the real classifying anyway.
 */
export function parseImpact(value: unknown): Impact {
  return typeof value === 'string' && (IMPACTS as readonly string[]).includes(value) ? (value as Impact) : 'medium';
}

export function parseUrgency(value: unknown): Urgency {
  return typeof value === 'string' && (URGENCIES as readonly string[]).includes(value) ? (value as Urgency) : 'medium';
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  P1: 'P1 -- Critical',
  P2: 'P2 -- High',
  P3: 'P3 -- Medium',
  P4: 'P4 -- Low',
};

export interface SlaTarget {
  firstResponseMinutes: number;
  resolveMinutes: number;
  firstResponseLabel: string;
  resolveLabel: string;
}

export const SLA_POLICY: Record<Priority, SlaTarget> = {
  P1: { firstResponseMinutes: 15, resolveMinutes: 4 * 60, firstResponseLabel: '15 minutes', resolveLabel: '4 hours' },
  P2: { firstResponseMinutes: 60, resolveMinutes: 24 * 60, firstResponseLabel: '1 hour', resolveLabel: '1 business day' },
  P3: { firstResponseMinutes: 4 * 60, resolveMinutes: 3 * 24 * 60, firstResponseLabel: '4 hours', resolveLabel: '3 business days' },
  P4: { firstResponseMinutes: 8 * 60, resolveMinutes: 5 * 24 * 60, firstResponseLabel: '1 business day', resolveLabel: '5 business days' },
};

const IMPACT_URGENCY_MATRIX: Record<Impact, Record<Urgency, Priority>> = {
  high: { high: 'P1', medium: 'P2', low: 'P3' },
  medium: { high: 'P2', medium: 'P3', low: 'P4' },
  low: { high: 'P3', medium: 'P4', low: 'P4' },
};

export function classifyFromMatrix(impact: Impact, urgency: Urgency): Priority {
  return IMPACT_URGENCY_MATRIX[impact][urgency];
}

/** Compute ISO-8601 SLA due timestamps for a priority, anchored at `createdAt`. */
export function slaDueDates(priority: Priority, createdAt: Date) {
  const policy = SLA_POLICY[priority];
  return {
    firstResponseDue: new Date(createdAt.getTime() + policy.firstResponseMinutes * 60_000).toISOString(),
    resolveDue: new Date(createdAt.getTime() + policy.resolveMinutes * 60_000).toISOString(),
  };
}

// Security wording is deliberately broad here. The list originally held
// 'security breach' and 'breach' but not 'security incident', so a real
// email subject -- "Checking Tim's support for security incidents" -- fell
// through every rule and was classified P3. Under-calling a security report
// is the worst mistake this function can make: a P1 wrongly raised costs an
// agent a minute to re-price, while a genuine incident sitting in a P3
// queue costs considerably more. False positives are the acceptable
// direction of error, so phrases like "no security incidents to report"
// will also land as P1 and be corrected by hand.
const P1_KEYWORDS = [
  'down', 'outage', 'all users', 'everyone', 'entire team', 'production down',
  "can't access anything", 'cannot access anything',
  'security breach', 'security incident', 'breach', 'compromised', 'hacked',
  'phishing', 'malware', 'ransomware', 'unauthorised access', 'unauthorized access',
  'data loss', 'data leak', 'lost data',
];

const P2_KEYWORDS = [
  'broken', 'not working', "doesn't work", 'does not work', 'error',
  'blocked', 'blocking', "can't log in", 'cannot log in', 'locked out',
  'urgent', 'high priority', 'asap',
];

const P4_KEYWORDS = [
  'question', 'how do i', 'how to', 'feature request', 'no rush',
  'when you get a chance', 'whenever', 'suggestion', 'idea',
];

function countHits(haystack: string, keywords: string[]): number {
  return keywords.reduce((n, kw) => (haystack.includes(kw) ? n + 1 : n), 0);
}

/**
 * Infer a priority from free text (email subject + body) when no explicit
 * impact/urgency was collected. Keyword-scored, P1 checked first since a
 * false-negative there is far more costly than a false positive elsewhere.
 */
export function classifyFromText(subject: string, body: string): { priority: Priority; impact: Impact; urgency: Urgency } {
  const text = `${subject}\n${body}`.toLowerCase();

  if (countHits(text, P1_KEYWORDS) > 0) {
    return { priority: 'P1', impact: 'high', urgency: 'high' };
  }
  if (countHits(text, P2_KEYWORDS) > 0) {
    return { priority: 'P2', impact: 'medium', urgency: 'high' };
  }
  if (countHits(text, P4_KEYWORDS) > 0) {
    return { priority: 'P4', impact: 'low', urgency: 'low' };
  }
  return { priority: 'P3', impact: 'medium', urgency: 'medium' };
}

// ---- what the ticket is about ---------------------------------------------
//
// A support desk that serves one product and also answers general computing
// questions has two queues wearing one uniform. Both get answered; they do
// not get answered with the same urgency. A Hamdam problem is a problem with
// the thing the company sells, and someone hitting it may be about to give up
// on the app. "How do I reset a Windows password" is a favour, gladly done.
//
// So topic is detected here rather than left to the model, for the same
// reason priority always has been: it decides an SLA clock, and an SLA that
// depends on how a model felt about a sentence is not a commitment.

export type Topic = 'hamdam' | 'general_it';

/**
 * Words that only appear when someone is talking about the app.
 *
 * Kept narrow on purpose. A false "hamdam" reading only costs a faster clock
 * on a general question, which is survivable; the list avoids bare words like
 * "verse" or "journal" only where they would drag in unrelated tickets, and
 * accepts them where the desk's own vocabulary makes them unambiguous.
 */
const HAMDAM_TERMS = [
  'hamdam', 'hamdan',
  'daily verse', 'the verse', 'verses', 'poem of the day',
  'reflection', 'reflections',
  'hafez', 'rumi', 'saadi', 'khayyam', 'parvin', 'ganjoor',
  'discover tab', 'roots calendar', 'cultural moment',
  'streak', 'journal entry', 'journal entries',
  'hamdam plus', 'lifetime plan', 'founding companion',
  'daily reminder', 'state of mind',
  'cycle awareness', 'mood logging',
  // The same vocabulary in Persian. Without these, a Persian speaker asking
  // about iCloud sync in Hamdam was read as a general computing question and
  // lost the P3 floor: the app's own audience got the slower queue, which is
  // precisely backwards.
  'همدم',
  'پلاس',
  'آیکلاد',
  'شعر',
  'بیت',
  'حافظ',
  'مولانا',
  'مولوی',
  'سعدی',
  'خیام',
  'پروین',
  'گنجور',
  'تأمل',
  'تامل',
  'یادآور',
  'یادداشت',
  'اشتراک',
];

export function detectTopic(text: string): Topic {
  const haystack = text.toLowerCase();
  return HAMDAM_TERMS.some((term) => haystack.includes(term)) ? 'hamdam' : 'general_it';
}

/**
 * The floor a Hamdam ticket cannot fall below.
 *
 * P3 rather than P2: the point is that an app problem is never merely
 * "whenever you get to it", not that every app problem is urgent. A Hamdam
 * ticket that the matrix already rated P1 or P2 keeps that rating, because
 * the floor raises and never lowers.
 */
export const HAMDAM_PRIORITY_FLOOR: Priority = 'P3';

const RANK: Record<Priority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export function applyTopicFloor(priority: Priority, topic: Topic): Priority {
  if (topic !== 'hamdam') return priority;
  return RANK[priority] <= RANK[HAMDAM_PRIORITY_FLOOR] ? priority : HAMDAM_PRIORITY_FLOOR;
}

/**
 * Classification, the topic floor and the platform in one call, which is how
 * callers want it.
 *
 * Platform rides along rather than getting its own call site because both
 * ticket-creating paths -- the portal in index.ts and the mailbox in
 * ingest.ts -- need it at exactly the moment they need the priority, and a
 * second call is a second thing to forget. `detectPlatform` is exported
 * anyway for the places that only have text.
 */
export function classifyTicket(
  impact: Impact,
  urgency: Urgency,
  text: string,
): { priority: Priority; topic: Topic; platform: Platform; floored: boolean } {
  const base = classifyFromMatrix(impact, urgency);
  const topic = detectTopic(text);
  const priority = applyTopicFloor(base, topic);
  return { priority, topic, platform: detectPlatform(text), floored: priority !== base };
}

// ---- which platform the requester is on ------------------------------------
//
// Added 2026-08-30, during Android testing.
//
// Detected in code, before the model, for the third time in this file and
// the same reason as the other two: it decides whether the assistant is
// allowed to answer at all. Everything the knowledge base says about where
// to get the app, what the store looks like and how a purchase is restored
// is written about iOS, because until now iOS was the only thing there was.
// Handed an Android tester's bug report, that library's best match was
// `getting-the-app`, whose first sentence is that there is no Android
// version. So the desk took someone testing the Android build and told
// them, in a reviewed and cited reply, that the thing in their hand did not
// exist.
//
// The fix is not a better answer. It is no automatic answer: an Android
// ticket is filed, tagged, acknowledged honestly and left for a person.

export type Platform = 'android' | 'unspecified';

/**
 * Words that mean the person is on Android.
 *
 * Wide where the topic floor's list is narrow, and the asymmetry is
 * deliberate. Reading an iPhone ticket as Android costs one automatic reply
 * that does not go out, and a person answers it instead -- which is what
 * happens to every escalated ticket anyway. Reading an Android ticket as
 * iPhone costs what this whole change exists to stop: a confident, wrong,
 * automated answer to a tester. So the errors are pushed in the survivable
 * direction, exactly as the P1 keyword list pushes them.
 *
 * Handset makers are in here as bare names because someone reporting a bug
 * writes "my Pixel crashes", not "my Android device running Android 15
 * crashes". 'apk', 'play store' and 'internal testing' are what a tester in
 * a closed track actually types.
 */
const ANDROID_TERMS = [
  'android', 'androide',
  'google play', 'play store', 'playstore', 'play console',
  'apk', 'aab', 'sideload', 'side-load',
  'internal testing', 'closed testing', 'open testing', 'beta track', 'testing track',
  'pixel', 'samsung', 'galaxy', 'xiaomi', 'redmi', 'huawei', 'oppo', 'vivo',
  'oneplus', 'one plus', 'realme', 'motorola', 'nokia', 'sony xperia',
  'lineageos', 'grapheneos',
  // The same words in Persian. A Persian-speaking tester saying "اندروید"
  // and nothing else in Latin script is the exact case the Latin list above
  // cannot see, and the topic floor's own Persian block exists because that
  // oversight had already been made once on this desk.
  'اندروید',
  'آندروید',
  'گوگل پلی',
  'پلی استور',
  'پلی‌استور',
  'سامسونگ',
  'شیائومی',
  'پیکسل',
  'هواوی',
  'نسخه اندروید',
  'نسخه‌ی اندروید',
];

export const PLATFORMS: readonly Platform[] = ['android', 'unspecified'];

/**
 * Validate a platform arriving in a query string, the same way parsePriority
 * does and for the same reason: this one reaches the console's queue filter
 * and a SQL bind. The bind makes injection a non-issue; the whitelist is what
 * stops `?platform=nonsense` returning a silently empty queue that reads as
 * "no Android tickets" to whoever is looking for them.
 */
export function parsePlatform(value: string | undefined | null): Platform | undefined {
  return value && (PLATFORMS as readonly string[]).includes(value) ? (value as Platform) : undefined;
}

export function detectPlatform(text: string): Platform {
  const haystack = text.toLowerCase();
  return ANDROID_TERMS.some((term) => haystack.includes(term)) ? 'android' : 'unspecified';
}

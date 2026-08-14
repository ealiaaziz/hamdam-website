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
 * The topic of a conversation, not of its opening line.
 *
 * `topic` is classified once, from the first message, and stored. That is the
 * right thing for priority, which is set when a ticket is created and should
 * not lurch about as a thread grows. It was the wrong thing for the sourcing
 * rule in assistantReply.ts, which refuses to let the assistant answer a
 * Hamdam question out of general knowledge and keys entirely off this value.
 *
 * A thread opening "my phone app keeps crashing" classifies as general_it,
 * because none of the Hamdam terms are in it. Every later message on that
 * thread inherited the verdict, so "does the app upload my journal to your
 * servers, and can I get a refund?" was answered as a general computing
 * question -- ungated, from whatever the model believed about a product it
 * has never seen. An opening line is not a promise about the rest of the
 * conversation, and treating it as one made the gate opt-out.
 *
 * Raises only. A ticket classified hamdam stays hamdam even if the newest
 * message says nothing about the app, for the same reason the priority floor
 * only raises: the stricter reading of a mixed conversation is the safe one,
 * and a thread does not stop being about Hamdam because someone paused to say
 * thank you.
 */
export function effectiveTopic(stored: Topic, conversationText: string): Topic {
  return stored === 'hamdam' ? 'hamdam' : detectTopic(conversationText);
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

/** Classification and the topic floor in one call, which is how callers want it. */
export function classifyTicket(
  impact: Impact,
  urgency: Urgency,
  text: string,
): { priority: Priority; topic: Topic; floored: boolean } {
  const base = classifyFromMatrix(impact, urgency);
  const topic = detectTopic(text);
  const priority = applyTopicFloor(base, topic);
  return { priority, topic, floored: priority !== base };
}

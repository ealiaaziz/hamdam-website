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

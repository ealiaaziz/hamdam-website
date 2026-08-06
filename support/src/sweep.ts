import type { Env } from './types.js';
import { countUnassignedTickets, getSyncState, listUnassignedTickets, setSyncState } from './db.js';
import { unassignedAlertRecipients } from './assignment.js';
import { unassignedDigestEmail } from './render/unassigned.js';
import { sendMail } from './mailer.js';
import { identity } from './identity.js';

// A scheduled look for work nobody has picked up.
//
// The desk already answers fast and escalates honestly. What it could not do
// was notice its own silence: an escalated ticket with no owner, or an
// emailed one the assistant filed without answering, sits in the queue
// looking exactly like a ticket somebody is dealing with. Nothing surfaced
// the difference unless a person opened the console and counted.
//
// So: every two hours, count what has no assignee and say so. The whole
// design question here is not the query, it is when to send, because a digest
// that arrives twelve times a day with the same three tickets in it is a
// digest that gets filtered to a folder, and then this file has made things
// worse rather than better.

/**
 * The cron expression the Worker matches to run this rather than the inbox
 * pass. Exported so `scheduled` and wrangler.jsonc cannot drift apart
 * silently: the cost of a mismatch is a sweep that never runs, which looks
 * identical to a queue that is always clean.
 */
export const UNASSIGNED_SWEEP_CRON = '0 */2 * * *';

/** Where the last alert's contents live, so a repeat can be recognised. */
export const UNASSIGNED_ALERT_KEY = 'unassigned_alert';

/**
 * How long a standing backlog may go unmentioned.
 *
 * The set-comparison below stops the same list arriving every two hours. Left
 * at only that, a queue that stops changing goes permanently quiet, which is
 * the exact failure mode being fixed: three tickets nobody has touched for a
 * week would produce silence indistinguishable from an empty queue. A day is
 * the floor, so the reminder is a reminder rather than a drumbeat.
 */
export const UNASSIGNED_REMINDER_MS = 24 * 60 * 60 * 1000;

/** How many tickets one email lists before it starts saying "and N more". */
export const UNASSIGNED_LIST_LIMIT = 25;

export interface UnassignedAlertState {
  /** Ticket ids that were unassigned when the sweep last looked. */
  ids: number[];
  /**
   * How many there were in total, which is not always `ids.length`.
   *
   * The id list stops at `UNASSIGNED_LIST_LIMIT`, and it is ordered worst
   * first, so on a queue with more than that outstanding the newest arrivals
   * fall below the cut. Comparing ids alone would then miss exactly the event
   * this sweep exists to report, on exactly the day it matters most. The total
   * is the signal that still moves when the visible list does not.
   */
  total: number;
  /** When an alert was last actually delivered, not when one was considered. */
  sentAt: string | null;
}

const EMPTY_STATE: UnassignedAlertState = { ids: [], total: 0, sentAt: null };

export function readAlertState(raw: string | null): UnassignedAlertState {
  if (!raw) return EMPTY_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<UnassignedAlertState>;
    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((id): id is number => Number.isInteger(id)) : [];
    return {
      ids,
      // Older rows predate this field. Reading a missing total as the number
      // of ids, rather than as zero, keeps the first pass after an upgrade
      // from reporting a jump that did not happen.
      total: Number.isInteger(parsed.total) ? (parsed.total as number) : ids.length,
      sentAt: typeof parsed.sentAt === 'string' ? parsed.sentAt : null,
    };
  } catch {
    // Unparseable reads as "nothing known", which sends. The alternative is a
    // corrupt row silently suppressing every future alert, and of the two ways
    // to be wrong, one extra email is the one to choose.
    return EMPTY_STATE;
  }
}

export type AlertDecision = { send: boolean; reason: string };

/**
 * Whether this pass should put an email in somebody's inbox.
 *
 * Pure, and separated from everything that touches a database or a mailbox,
 * because this is the part with the actual judgement in it and the part worth
 * pinning with tests.
 *
 * Three rules, in order:
 *
 *  - Nothing unassigned means no email. Obvious, and worth stating because a
 *    "nothing to report" heartbeat here would be the fastest possible way to
 *    teach two people to filter this sender.
 *  - A ticket that was not in the last alert means send. New work with no
 *    owner is the event this exists to report.
 *  - So does a total that has grown, even when every visible id is familiar.
 *    That is the case a list capped at `UNASSIGNED_LIST_LIMIT` cannot see: the
 *    digest shows the worst twenty-five, new arrivals queue up underneath, and
 *    an id comparison would go quiet precisely when the backlog is growing
 *    fastest.
 *  - Otherwise send only if the last one was a day ago. A backlog that is not
 *    growing still deserves a mention; it does not deserve twelve.
 */
export function decideAlert(
  state: UnassignedAlertState,
  currentIds: readonly number[],
  nowMs: number,
  total: number = currentIds.length,
): AlertDecision {
  if (total === 0) return { send: false, reason: 'nothing unassigned' };

  const known = new Set(state.ids);
  const fresh = currentIds.filter((id) => !known.has(id));
  if (fresh.length > 0) {
    return { send: true, reason: `${fresh.length} newly unassigned ticket(s)` };
  }

  if (total > state.total) {
    return { send: true, reason: `the backlog grew from ${state.total} to ${total}` };
  }

  if (!state.sentAt) return { send: true, reason: 'no alert has been sent yet' };

  const since = Date.parse(state.sentAt);
  if (!Number.isFinite(since)) return { send: true, reason: 'last alert time unreadable' };
  if (nowMs - since >= UNASSIGNED_REMINDER_MS) {
    return { send: true, reason: 'daily reminder while the list is not empty' };
  }

  return { send: false, reason: 'same tickets as the last alert, and it was recent' };
}

export interface SweepSummary {
  unassigned: number;
  alerted: boolean;
  reason: string;
  /** Addresses the digest actually reached. */
  delivered: string[];
  failed: string[];
}

/**
 * One pass: count, decide, and tell people.
 *
 * The state row is written from what happened rather than from what was
 * planned. `sentAt` moves only when Graph accepted at least one copy, so a
 * mail outage means the next pass tries again in two hours instead of
 * recording an alert nobody received. `ids` is rewritten every pass whether or
 * not anything was sent, which is what makes a ticket that gets assigned and
 * later unassigned count as new again.
 *
 * Never throws. It runs from `scheduled` beside the inbox pass, and a failure
 * to send a digest must not be able to take the mail reading down with it.
 */
export async function sweepUnassigned(env: Env, now: Date = new Date()): Promise<SweepSummary> {
  const summary: SweepSummary = { unassigned: 0, alerted: false, reason: 'not run', delivered: [], failed: [] };

  try {
    const [tickets, total, state] = await Promise.all([
      listUnassignedTickets(env.DB, UNASSIGNED_LIST_LIMIT),
      countUnassignedTickets(env.DB),
      getSyncState(env.DB, UNASSIGNED_ALERT_KEY).then(readAlertState),
    ]);

    summary.unassigned = total;

    // The decision is made on the ids the sweep can actually see. With more
    // than the list limit outstanding the digest is already saying "and N
    // more", and the honest reading of a truncated list is that the newest
    // arrivals below the cut are represented by the count, not by their ids.
    const ids = tickets.map((t) => t.id);
    const decision = decideAlert(state, ids, now.getTime(), total);
    summary.reason = decision.reason;

    if (!decision.send) {
      await setSyncState(env.DB, UNASSIGNED_ALERT_KEY, JSON.stringify({ ids, total, sentAt: state.sentAt }));
      return summary;
    }

    const rendered = unassignedDigestEmail({
      tickets,
      total,
      adminBaseUrl: identity().baseUrl,
      now,
    });

    // One send per recipient, same as the escalation path: they are different
    // people, and a shared failure for one bad address would take the other
    // person's copy with it.
    for (const toEmail of unassignedAlertRecipients(env)) {
      const result = await sendMail(env, { toEmail, subject: rendered.subject, bodyHtml: rendered.html });
      if (result.sent) summary.delivered.push(toEmail);
      else {
        summary.failed.push(toEmail);
        console.error(`unassigned sweep: could not mail ${toEmail}: ${result.reason}`);
      }
    }

    summary.alerted = summary.delivered.length > 0;
    await setSyncState(
      env.DB,
      UNASSIGNED_ALERT_KEY,
      JSON.stringify({ ids, total, sentAt: summary.alerted ? now.toISOString() : state.sentAt }),
    );
    return summary;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error('unassigned sweep failed:', reason);
    summary.reason = `failed: ${reason}`;
    return summary;
  }
}

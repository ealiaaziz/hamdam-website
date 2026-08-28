/**
 * What one scheduled tick should actually do.
 *
 * Pure, and in its own file, for the reason the rest of the decisions here are:
 * the scheduled handler is the one place in this desk with no user waiting on
 * it and no test exercising it in production, so the rule about what runs when
 * belongs somewhere a test can reach.
 *
 * The scarce resource is CPU, not wall clock. Cloudflare's Free plan allows
 * 10 ms of CPU per invocation, and awaiting a fetch costs none of it: what
 * costs is the work either side, and the largest single piece is parsing a
 * hundred issue comments out of a GitHub response. On 2026-08-28 the desk's
 * ticks were measured at 8.655, 8.788, 9.011 and 9.274 ms in the dashboard's
 * cron log, climbing, and then scheduled invocations stopped account-wide and
 * did not come back. The cause of the stop was never proven and may not have
 * been this. Running at 93 per cent of the ceiling every minute is worth
 * fixing either way, because the next feature that adds one API call to this
 * path breaks it, and it breaks silently.
 *
 * So the tick is split by how much latency each job can bear:
 *
 * - Ingest runs every minute. Someone emailing the desk waits for it, and the
 *   acknowledgement inside a minute is the property the whole cron exists for.
 *   It is also cheap on an empty mailbox: one Graph request and a short reply.
 * - The bot follow-up runs every fifth minute. It is expensive exactly when it
 *   matters, because a change in flight means fetching and parsing an issue
 *   thread on every pass, and nothing on the other end is waiting on seconds:
 *   the next step is a person reading an email. Five minutes of latency buys
 *   back four fifths of the cost.
 * - The rate limit sweep runs every fifteenth. The rows it deletes are already
 *   dead and nothing reads them; sweeping is housekeeping, and housekeeping on
 *   the minute was only ever convenience.
 *
 * Aligned to wall clock rather than counted, because epoch minutes divide
 * evenly and a counter would need somewhere to live.
 */

export interface TickWork {
  ingest: boolean;
  followUp: boolean;
  purge: boolean;
}

const FOLLOW_UP_EVERY = 5;
const PURGE_EVERY = 15;

export function tickWork(scheduledTime: number): TickWork {
  // A tick with no usable time on it does everything. Skipping work to save
  // CPU is a trade this file is allowed to make; skipping it because a number
  // arrived malformed is not, and an hour of mail nobody read is the more
  // expensive mistake by a distance.
  if (!Number.isFinite(scheduledTime)) return { ingest: true, followUp: true, purge: true };

  const minute = Math.floor(scheduledTime / 60_000);
  return {
    ingest: true,
    followUp: minute % FOLLOW_UP_EVERY === 0,
    purge: minute % PURGE_EVERY === 0,
  };
}

/**
 * Whether a request may drive a tick by hand.
 *
 * Exists because Cloudflare stopped invoking this account's scheduled Workers
 * at 20:55 UTC on 2026-08-28 while continuing to serve their HTTP traffic
 * perfectly. The desk stopped reading its mailbox for hours and there was no
 * way in: the work was reachable only from a trigger nobody outside
 * Cloudflare controls. This is the way in, and it is worth having permanently,
 * because a scheduler is a dependency like any other and this one failed
 * silently.
 *
 * Fails closed. Unset means nobody, which is the opposite of the console's
 * `ADMIN_EMAILS` and right for the opposite reason: an unset console list
 * admits whoever Access already admits, and an unset secret here would admit
 * the entire internet to a route that spends model calls and sends email.
 *
 * Compared in constant time. The comparison is cheap and the habit is worth
 * more than the microseconds: this is a bearer secret in a header, and the
 * one attack it is actually exposed to is guessing.
 */
export function tickAuthorised(secret: string | undefined, presented: string | null): boolean {
  if (!secret || !presented) return false;
  if (secret.length !== presented.length) return false;

  let differences = 0;
  for (let i = 0; i < secret.length; i += 1) {
    differences |= secret.charCodeAt(i) ^ presented.charCodeAt(i);
  }
  return differences === 0;
}

/**
 * Which jobs a hand-driven tick should run.
 *
 * Selectable, and that is not a convenience. An HTTP invocation is charged the
 * same 10 ms of CPU as a scheduled one, and a tick doing every job was
 * measured at 9.274 ms, so a single call asking for all of it is a call that
 * may be killed halfway. Asking for one job at a time keeps each request well
 * inside the budget, and the caller can make three.
 */
export function requestedJobs(job: string | null): TickWork {
  switch (job) {
    case 'ingest': return { ingest: true, followUp: false, purge: false };
    case 'followup': return { ingest: false, followUp: true, purge: false };
    case 'purge': return { ingest: false, followUp: false, purge: true };
    default: return { ingest: true, followUp: true, purge: true };
  }
}

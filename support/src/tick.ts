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

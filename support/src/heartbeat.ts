// Is the desk still reading its mail?
//
// Nothing could answer that, and the audit that scored detection lowest was
// right about why it mattered. The cron runs every minute, and on an empty
// inbox `ingestInbox` returned before writing anything at all, so a quiet
// mailbox and a dead cron left exactly the same trace: none. The keys that
// looked like health, `last_run_status` and the rest, were written by the
// hourly Routine that was retired on 2026-08-02 and have been frozen since.
//
// That is the same failure the poison-message bug produced, arrived at from a
// different direction: the desk stops receiving email and everything looks
// normal. Fixing the bug without fixing the blindness would leave the second
// instance of it just as invisible as the first.
//
// So: a timestamp written after every successful pass, and two things that
// read it. The console shows a banner, because whoever opens the console is
// the person who can act. And `/health` answers plainly enough for an
// external uptime monitor to watch, which is the only kind of watching that
// survives the Worker itself being the thing that broke.

/** Where the timestamp lives in sync_state. */
export const HEARTBEAT_KEY = 'last_ingest_at';

/**
 * How long a silence has to be before it means something.
 *
 * The cron fires every minute, so ten missed passes is not a slow minute, it
 * is a stopped one. Set from the other direction too: this is roughly how
 * long a customer's email may sit unnoticed before somebody is told, and ten
 * minutes is a delay rather than an incident.
 *
 * Cloudflare does not guarantee a cron fires at the exact minute, and a
 * couple of skipped invocations under load are ordinary. Ten absorbs that
 * without absorbing a genuine outage.
 */
export const HEARTBEAT_STALE_AFTER_MS = 10 * 60 * 1000;

export type Heartbeat =
  | { state: 'ok'; ageMs: number }
  | { state: 'stale'; ageMs: number }
  /** Nothing has ever been recorded: a fresh deploy, or ingest has never run. */
  | { state: 'unknown'; ageMs: null };

/**
 * Reads a stored timestamp as a verdict.
 *
 * Unparseable reads as `unknown` rather than as `ok`. Everything in this file
 * exists because an absence of evidence was being read as evidence of health,
 * and repeating that inside the fix would be its own joke.
 *
 * A timestamp in the future is treated as fresh. Clock skew between D1 and a
 * Worker is real and small, and the alternative, calling it stale, would
 * raise an alarm about the one thing that is definitely not wrong.
 */
export function readHeartbeat(value: string | null, nowMs: number = Date.now()): Heartbeat {
  if (!value) return { state: 'unknown', ageMs: null };
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return { state: 'unknown', ageMs: null };
  const ageMs = Math.max(0, nowMs - at);
  return { state: ageMs > HEARTBEAT_STALE_AFTER_MS ? 'stale' : 'ok', ageMs };
}

/** "4 minutes ago", for a banner a person reads rather than parses. */
export function describeAge(ageMs: number | null): string {
  if (ageMs === null) return 'never';
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'less than a minute ago';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

/**
 * Whether a request that noticed a stale desk should try to restart it.
 *
 * The desk's work was reachable only from Cloudflare's scheduler, and on
 * 2026-08-28 that scheduler stopped invoking every Worker on the account at
 * 20:55 UTC while the same Workers kept serving HTTP without a blip. `/health`
 * reported it correctly for hours and nothing acted on the report, because
 * reporting was all it could do.
 *
 * So the report now does something. `/health` already reads the heartbeat to
 * answer the question, and a stale answer is exactly the condition under which
 * running a pass is both safe and wanted, so the check kicks one. Any traffic
 * at all then keeps the desk alive: an uptime monitor, a mail server fetching
 * the MTA-STS policy, somebody opening the portal. No secret, no scheduler, no
 * configuration.
 *
 * `unknown` counts. It means nothing has ever been recorded, which is a fresh
 * deploy or an ingest that has never run, and both want a pass.
 *
 * Safe to fire concurrently because `ingestInbox` takes an atomic lock and a
 * second caller returns immediately. Bounded too: once a pass succeeds the
 * heartbeat is fresh and this stops answering true until the threshold passes
 * again, so a flood of requests cannot become a flood of passes.
 */
export function shouldSelfHeal(beat: Heartbeat): boolean {
  return beat.state !== 'ok';
}

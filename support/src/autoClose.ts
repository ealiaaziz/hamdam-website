/**
 * Closing tickets she has stopped answering.
 *
 * Ealia asked for this on 2026-09-10, and the state of the desk that day is
 * the argument for it: 28 tickets open, the oldest from 2 August, none ever
 * closed. Nothing here closes a ticket on its own, so the desk carried every
 * conversation it had ever had, forever. That is untidy for her and it was
 * expensive for the desk: the follow-up pass walks the open ones, and it had
 * grown past what one Worker invocation could finish.
 *
 * The rule is deliberately narrow: the desk spoke last, and she has not
 * answered for two days. That is what "she does not follow up any more"
 * means, and the narrowness is the safety. A ticket where *she* spoke last is
 * never closed, whatever its age, because there the ball is the desk's and
 * closing would file away a message nobody answered. Three tickets were in
 * exactly that state when this was written.
 *
 * Nothing is emailed. This is housekeeping, not news: the conversation the
 * ticket holds already ended, in the sense that the last word was ours and
 * she let it go. Fourteen tickets were eligible the moment this shipped, and
 * fourteen emails saying "we tidied up" would be worse than the untidiness,
 * a mistake this desk made in a smaller way the day before. Her reply reopens
 * the ticket, which is the property that makes silence safe rather than final.
 */

import { ticketsGoneQuiet, closeQuietTickets } from './db.js';

/** Two days, in the wording of the request. */
export const STALE_AFTER_MS = 48 * 60 * 60_000;

/**
 * The instant a ticket must have been last spoken to before, to be stale.
 *
 * Returned as the ISO string the columns are stored in, so the comparison is
 * done by the database rather than by parsing rows into JavaScript.
 */
export function staleBefore(now: number): string {
  return new Date(now - STALE_AFTER_MS).toISOString();
}

/**
 * How many tickets one pass may close.
 *
 * The same reasoning as the follow-up batch, and the same file's history
 * behind it: the work is bounded per invocation rather than per backlog, so a
 * pile of eligible tickets drains over several passes instead of trying to
 * finish in one and finishing none. At five a pass on the fifteen-minute
 * housekeeping tick, the backlog this shipped with clears inside an hour.
 */
export const CLOSE_PER_PASS = 5;

/**
 * One housekeeping pass: find the tickets that have gone quiet, and close them.
 *
 * Returns how many actually changed, which is what the tick reports and what a
 * person reads when they want to know whether this is doing anything.
 */
export async function sweepQuietTickets(db: D1Database, now: number = Date.now()): Promise<number> {
  const ids = await ticketsGoneQuiet(db, staleBefore(now), CLOSE_PER_PASS);
  if (ids.length === 0) return 0;
  return closeQuietTickets(db, ids);
}

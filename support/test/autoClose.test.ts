/**
 * Closing tickets she has stopped answering.
 *
 * Asked for on 2026-09-10, when the desk had 28 open tickets going back to
 * 2 August and had never closed one. The whole risk here is closing something
 * that is still the desk's turn, so most of these cases are refusals.
 */

import { describe, it, expect, vi } from 'vitest';
import { STALE_AFTER_MS, staleBefore, CLOSE_PER_PASS } from '../src/autoClose.js';
import { ticketsGoneQuiet, closeQuietTickets } from '../src/db.js';

function capture(rows: { ticket_id: number }[] = []) {
  const calls: { sql: string; binds: unknown[] }[] = [];
  const prepare = vi.fn((sql: string) => ({
    bind: (...binds: unknown[]) => {
      calls.push({ sql, binds });
      return {
        all: async () => ({ results: rows }),
        run: async () => ({ meta: { changes: rows.length } }),
      };
    },
  }));
  return { db: { prepare } as unknown as D1Database, calls };
}

describe('the cutoff', () => {
  it('is two days, as asked', () => {
    expect(STALE_AFTER_MS).toBe(48 * 60 * 60 * 1000);
  });

  it('is expressed in the format the columns are stored in', () => {
    // Compared by the database against sent_at, so it has to be the same
    // shape of string, not a number.
    const now = Date.parse('2026-09-10T19:00:00.000Z');
    expect(staleBefore(now)).toBe('2026-09-08T19:00:00.000Z');
  });
});

describe('what the sweep refuses to close', () => {
  it('leaves a ticket where she spoke last, however old', async () => {
    // The important one. Three tickets were in this state when this shipped,
    // and each is a message of hers the desk still owes an answer to.
    // Closing them would file away the backlog instead of answering it.
    const { db, calls } = capture();
    await ticketsGoneQuiet(db, '2026-09-08T19:00:00.000Z', CLOSE_PER_PASS);

    expect(calls[0]!.sql).toContain("COALESCE(s.last_from_her, '') < s.last_from_desk");
  });

  it('leaves a ticket the desk has never written to', async () => {
    // A ticket she raised that nobody has answered must never be filed away
    // for the crime of nobody answering it.
    const { db, calls } = capture();
    await ticketsGoneQuiet(db, '2026-09-08T19:00:00.000Z', CLOSE_PER_PASS);

    expect(calls[0]!.sql).toContain('s.last_from_desk IS NOT NULL');
  });

  it('leaves a ticket whose approved change has not shipped', async () => {
    // Mid-flight: she said yes and the desk owes her the result.
    const { db, calls } = capture();
    await ticketsGoneQuiet(db, '2026-09-08T19:00:00.000Z', CLOSE_PER_PASS);

    const sql = calls[0]!.sql;
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('b.approved_ref = b.pending_change_ref');
  });

  it('does not protect a ticket whose approved change already shipped', () => {
    // Ticket 47 carried an approval next to a deployed_at, left behind from
    // before markDeployed cleared consent properly. Finished work must not
    // pin a ticket open for good, so the guard is scoped to not-yet-shipped.
    const { db, calls } = capture();
    return ticketsGoneQuiet(db, '2026-09-08T19:00:00.000Z', CLOSE_PER_PASS).then(() => {
      expect(calls[0]!.sql).toContain('b.deployed_at IS NULL');
    });
  });

  it('leaves a ticket that is already closed alone', async () => {
    const { db, calls } = capture();
    await ticketsGoneQuiet(db, '2026-09-08T19:00:00.000Z', CLOSE_PER_PASS);
    expect(calls[0]!.sql).toContain("t.status != 'closed'");
  });
});

describe('the sweep is bounded', () => {
  it('asks for at most a passful', async () => {
    const { db, calls } = capture();
    await ticketsGoneQuiet(db, '2026-09-08T19:00:00.000Z', CLOSE_PER_PASS);
    expect(calls[0]!.binds).toEqual(['2026-09-08T19:00:00.000Z', CLOSE_PER_PASS]);
    expect(CLOSE_PER_PASS).toBeLessThanOrEqual(5);
  });

  it('takes the longest quiet first', async () => {
    const { db, calls } = capture();
    await ticketsGoneQuiet(db, '2026-09-08T19:00:00.000Z', CLOSE_PER_PASS);
    expect(calls[0]!.sql).toContain('ORDER BY s.last_from_desk ASC');
  });

  it('closes the batch in one statement', async () => {
    const { db, calls } = capture([{ ticket_id: 1 }, { ticket_id: 2 }]);
    await closeQuietTickets(db, [37, 40, 41]);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.sql).toContain('id IN (?1, ?2, ?3)');
    expect(calls[0]!.binds).toEqual([37, 40, 41]);
  });

  it('writes nothing for an empty batch', async () => {
    const { db, calls } = capture();
    expect(await closeQuietTickets(db, [])).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('sets closed_at, so a swept ticket is closed and not a third thing', async () => {
    const { db, calls } = capture([{ ticket_id: 1 }]);
    await closeQuietTickets(db, [37]);
    expect(calls[0]!.sql).toContain('closed_at');
    expect(calls[0]!.sql).toContain("status != 'closed'");
  });
});

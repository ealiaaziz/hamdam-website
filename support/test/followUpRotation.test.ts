/**
 * The follow-up pass takes a few tickets at a time and rotates.
 *
 * Until 2026-09-10 it took every open bot-change ticket in one Worker
 * invocation. At twelve tickets the scheduled invocations were being killed
 * with exceededResources, and whatever had not finished was lost: a proposal
 * that reached her 22 minutes late, a question answered on the issue and never
 * sent, five messages relayed only when somebody looked by hand, and the
 * channel owner approving a fix for a broken bot twice with neither approval
 * recorded.
 *
 * Two properties keep that from coming back, and both are load-bearing:
 * a pass is bounded, and the queue actually turns over.
 */

import { describe, it, expect, vi } from 'vitest';
import { ticketsAwaitingBotFollowUp, markBotFollowUpChecked } from '../src/db.js';

function fakeDb(rows: { ticket_id: number }[] = []) {
  const calls: { sql: string; binds: unknown[] }[] = [];
  const prepare = vi.fn((sql: string) => ({
    bind: (...binds: unknown[]) => {
      calls.push({ sql, binds });
      return {
        all: async () => ({ results: rows }),
        run: async () => ({ meta: { changes: binds.length } }),
      };
    },
  }));
  return { db: { prepare } as unknown as D1Database, calls };
}

describe('the queue is ordered so nobody is starved', () => {
  it('serves tickets nobody has looked at before ones that have been', async () => {
    // HAM-69 was the newest ticket and last in line under the old ordering.
    // A bot that is broken right now must not queue behind eleven finished
    // tickets, so NULL sorts first.
    const { db, calls } = fakeDb();
    await ticketsAwaitingBotFollowUp(db, 5);

    const sql = calls[0]!.sql;
    expect(sql).toContain("COALESCE(c.last_checked_at, '') ASC");
    expect(sql.indexOf('last_checked_at')).toBeLessThan(sql.indexOf('c.updated_at ASC'));
  });

  it('still skips closed tickets', async () => {
    const { db, calls } = fakeDb();
    await ticketsAwaitingBotFollowUp(db, 5);
    expect(calls[0]!.sql).toContain("t.status != 'closed'");
  });

  it('asks for only as many as it was given', async () => {
    const { db, calls } = fakeDb();
    await ticketsAwaitingBotFollowUp(db, 5);
    expect(calls[0]!.sql).toContain('LIMIT ?1');
    expect(calls[0]!.binds).toEqual([5]);
  });
});

describe('marking a batch checked', () => {
  it('moves the whole batch in one statement, not one each', async () => {
    // The batch exists to spend less per invocation. Paying it back in writes
    // would defeat it.
    const { db, calls } = fakeDb();
    await markBotFollowUpChecked(db, [46, 55, 47]);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.sql).toContain('ticket_id IN (?1, ?2, ?3)');
    expect(calls[0]!.binds).toEqual([46, 55, 47]);
    expect(calls[0]!.sql).toContain('last_checked_at');
  });

  it('writes nothing when there is nothing to mark', async () => {
    const { db, calls } = fakeDb();
    await markBotFollowUpChecked(db, []);
    expect(calls).toHaveLength(0);
  });

  it('does not touch updated_at, which means something else', async () => {
    // updated_at says the row changed. Looking at a ticket is not a change,
    // and bumping it would make the row lie about its own history.
    const { db, calls } = fakeDb();
    await markBotFollowUpChecked(db, [7]);
    expect(calls[0]!.sql).not.toContain('updated_at');
  });
});

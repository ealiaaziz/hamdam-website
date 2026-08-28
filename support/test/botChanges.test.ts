import { describe, it, expect } from 'vitest';
import { mayDeploy, proposeChange, recordApproval, type BotChangeRow } from '../src/db.js';

const base: BotChangeRow = {
  ticket_id: 12,
  issue_number: 4,
  pr_number: 9,
  branch: 'claude/ham-12',
  head_sha: 'a3f9c1d4',
  pending_change_ref: 'HAM-12/a3f9c1',
  proposed_at: '2026-08-28T10:00:00.000Z',
  approved_ref: 'HAM-12/a3f9c1',
  approved_at: '2026-08-28T10:05:00.000Z',
  refused_at: null,
  deployed_at: null,
  last_outcome: null,
  last_outcome_at: null,
  dispatched_at: '2026-08-28T09:00:00.000Z',
  updated_at: '2026-08-28T10:05:00.000Z',
};

describe('mayDeploy', () => {
  it('allows a change she approved', () => {
    expect(mayDeploy(base)).toBe(true);
  });

  it('refuses a ticket that has never dispatched', () => {
    expect(mayDeploy(null)).toBe(false);
  });

  it('refuses an unanswered proposal', () => {
    expect(mayDeploy({ ...base, approved_ref: null, approved_at: null })).toBe(false);
  });

  it('refuses a refusal', () => {
    expect(mayDeploy({ ...base, refused_at: '2026-08-28T10:06:00.000Z' })).toBe(false);
  });

  /**
   * The case this function exists for. An agent pushes again after she has
   * said yes, to fix a review comment or to make CI pass, and the approval on
   * the row is now consent to code she never saw. The reference has to match
   * the change that is actually pending.
   */
  it('refuses an approval that belongs to a superseded change', () => {
    expect(mayDeploy({ ...base, pending_change_ref: 'HAM-12/ffff00' })).toBe(false);
  });
});

/** A D1 stand-in that records the SQL and bindings it was handed. */
function fakeDb(changes = 1) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => {
        calls.push({ sql, args });
        return { run: async () => ({ meta: { changes } }) };
      },
    }),
  } as unknown as D1Database;
  return { db, calls };
}

describe('proposeChange clears the previous answer', () => {
  it('nulls the approval in the same statement that sets the new proposal', async () => {
    const { db, calls } = fakeDb();
    await proposeChange(db, 12, {
      changeRef: 'HAM-12/bbbb11',
      prNumber: 9,
      branch: 'claude/ham-12',
      headSha: 'bbbb11ff',
    });

    const sql = calls[0]!.sql;
    expect(sql).toContain('approved_ref = NULL');
    expect(sql).toContain('approved_at = NULL');
    expect(sql).toContain('refused_at = NULL');
  });
});

describe('recordApproval is scoped to the pending change', () => {
  it('reports whether it took', async () => {
    const { db, calls } = fakeDb(1);
    await expect(recordApproval(db, 12, 'HAM-12/a3f9c1')).resolves.toBe(true);
    // The WHERE clause, not the caller, is what stops an approval landing on a
    // change it was not given for.
    expect(calls[0]!.sql).toContain('pending_change_ref = ?2');
  });

  it('reports false when it matched nothing', async () => {
    const { db } = fakeDb(0);
    await expect(recordApproval(db, 12, 'HAM-12/000000')).resolves.toBe(false);
  });
});

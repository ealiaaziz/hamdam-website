import { describe, expect, it } from 'vitest';
import { acquireIngestLock, releaseIngestLock, INGEST_LOCK_KEY, INGEST_LOCK_TTL_MS } from '../src/db.js';

// Mutual exclusion on the inbox pass.
//
// The cron fires every sixty seconds and a full batch takes minutes: twenty
// five messages, each one a Graph fetch for headers, several D1 writes, a
// model call and up to two pieces of outbound mail. So passes overlap as a
// matter of routine, and overlapping passes read the same checkpoint, fetch
// the same messages, and race each other through handleMessage, where the
// dedupe ledger is read at the top and written at the bottom with ON CONFLICT
// DO NOTHING. Both see the message as new, both go the whole way, and the
// loser's write silently does nothing. One email, two tickets, two
// acknowledgements, two model calls and two replies.
//
// The stand-in below keeps a real row and applies the same expiry comparison
// the SQL does, so this fails if either half changes without the other.

function fakeDb(rows = new Map<string, string>(), failing = false): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind(...binds: unknown[]) {
          return {
            async first<T>(): Promise<T | null> {
              if (failing) throw new Error('D1_ERROR: no such table');
              if (!sql.includes('sync_state')) throw new Error(`unexpected statement: ${sql}`);
              const [key, value, nowIso] = binds as string[];
              const existing = rows.get(key);
              // The insert branch, and the conflict branch's WHERE clause.
              if (existing !== undefined && !(existing <= nowIso)) return null;
              rows.set(key, value);
              return { value } as T;
            },
            async run() {
              if (failing) throw new Error('D1_ERROR: no such table');
              if (!sql.includes('sync_state')) throw new Error(`unexpected statement: ${sql}`);
              // The compare-and-swap release: three binds, and the row only
              // moves when the second one still matches what is stored. Modelled
              // rather than waved through, because "the release checks the
              // token" is the property under test and a fake that ignores the
              // WHERE would agree with a broken implementation.
              if (sql.includes('UPDATE sync_state')) {
                const [key, expected, replacement] = binds as string[];
                if (rows.get(key) !== expected) return { meta: { changes: 0 } };
                rows.set(key, replacement);
                return { meta: { changes: 1 } };
              }
              const [key, value] = binds as string[];
              rows.set(key, value);
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

const now = new Date('2026-08-08T03:00:00.000Z');

/** The expiry half of a stored lock value, without its fencing token. */
function expiryOf(value: string | undefined): string | undefined {
  return value?.split('#')[0];
}

describe('acquireIngestLock', () => {
  it('lets the first pass in and keeps the second one out', async () => {
    const rows = new Map<string, string>();
    const db = fakeDb(rows);

    expect(await acquireIngestLock(db, INGEST_LOCK_TTL_MS, now)).not.toBeNull();
    // One second later, which is well inside the cron's own interval.
    const overlapping = new Date(now.getTime() + 1000);
    expect(await acquireIngestLock(db, INGEST_LOCK_TTL_MS, overlapping)).toBeNull();
  });

  it('stores an expiry, not a flag', async () => {
    const rows = new Map<string, string>();
    await acquireIngestLock(fakeDb(rows), INGEST_LOCK_TTL_MS, now);
    expect(expiryOf(rows.get(INGEST_LOCK_KEY))).toBe(new Date(now.getTime() + INGEST_LOCK_TTL_MS).toISOString());
  });

  it('gives each pass a different fencing token', async () => {
    // Two passes that both legitimately hold the lock in turn must be
    // distinguishable, or the release cannot tell them apart.
    const rows = new Map<string, string>();
    const db = fakeDb(rows);

    const first = await acquireIngestLock(db, INGEST_LOCK_TTL_MS, now);
    const afterTtl = new Date(now.getTime() + INGEST_LOCK_TTL_MS + 1000);
    const second = await acquireIngestLock(db, INGEST_LOCK_TTL_MS, afterTtl);

    expect(first?.value).not.toBe(second?.value);
  });

  it('hands the lock to the next pass once the holder has expired', async () => {
    // This is the whole reason it is a TTL and not a boolean. A Worker can be
    // evicted between the acquire and the release, and a flag set by a pass
    // that then died is set forever. The failure that produces is the one this
    // desk has already been bitten by twice: the mailbox looks completely
    // normal while no email is being read at all.
    const rows = new Map<string, string>();
    const db = fakeDb(rows);

    expect(await acquireIngestLock(db, INGEST_LOCK_TTL_MS, now)).not.toBeNull();
    const afterTtl = new Date(now.getTime() + INGEST_LOCK_TTL_MS + 1000);
    expect(await acquireIngestLock(db, INGEST_LOCK_TTL_MS, afterTtl)).not.toBeNull();
  });

  it('is available again immediately after a release', async () => {
    const rows = new Map<string, string>();
    const db = fakeDb(rows);

    const holding = await acquireIngestLock(db, INGEST_LOCK_TTL_MS, now);
    await releaseIngestLock(db, holding ?? undefined);

    const oneSecondLater = new Date(now.getTime() + 1000);
    expect(await acquireIngestLock(db, INGEST_LOCK_TTL_MS, oneSecondLater)).not.toBeNull();
  });

  it('fails closed when the database cannot answer', async () => {
    // The opposite of consumeRateLimit's choice, and correct for the opposite
    // reason. A skipped pass costs sixty seconds and the next cron reads the
    // same mail; an unlocked pass during a D1 wobble is the
    // duplicate-everything case running with no brakes.
    expect(await acquireIngestLock(fakeDb(new Map(), true), INGEST_LOCK_TTL_MS, now)).toBeNull();
  });

  it('records an acquisition failure in the database, not only in the log', async () => {
    // Everything else on this path writes its reason to last_ingest_error,
    // because a Worker log needs a websocket to tail and that is unavailable
    // exactly when it is wanted. A gate that can stop ingestion for good is a
    // poor place to make the exception.
    const rows = new Map<string, string>();
    let failing = true;
    const db = {
      prepare() {
        return {
          bind(...binds: unknown[]) {
            return {
              async first() {
                if (failing) throw new Error('D1_ERROR: no such table');
                return null;
              },
              async run() {
                const [key, value] = binds as string[];
                rows.set(key, value);
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    } as unknown as D1Database;

    expect(await acquireIngestLock(db, INGEST_LOCK_TTL_MS, now)).toBeNull();
    expect(rows.get('last_ingest_error')).toContain('could not acquire the ingest lock');
    failing = false;
  });
});

describe('releaseIngestLock', () => {
  it('never throws, because it runs in a finally', async () => {
    await expect(releaseIngestLock(fakeDb(new Map(), true))).resolves.toBeUndefined();
  });

  // The bug this exists to stop, spelled out, because it is the one an
  // unconditional release reintroduces and it looks harmless in a diff.
  //
  // A pass that overruns the five minute TTL has already lost the lock: the
  // next cron took it legitimately and is reading the mailbox. If the slow
  // pass then clears the row on its way out, the cron after that acquires as
  // well, and now two passes really are running over one checkpoint, at
  // exactly the moment the desk is busy enough for a pass to be slow. The
  // lock would be doing nothing in the one case it was written for.
  it('does not release a lock this pass no longer holds', async () => {
    const rows = new Map<string, string>();
    const db = fakeDb(rows);

    const slowPass = await acquireIngestLock(db, INGEST_LOCK_TTL_MS, now);
    const afterTtl = new Date(now.getTime() + INGEST_LOCK_TTL_MS + 1000);
    const nextCron = await acquireIngestLock(db, INGEST_LOCK_TTL_MS, afterTtl);

    // The slow pass finally finishes and tidies up after itself.
    await releaseIngestLock(db, slowPass ?? undefined);

    // The next cron still holds it, and a third pass is still kept out.
    expect(rows.get(INGEST_LOCK_KEY)).toBe(nextCron?.value);
    const thirdPass = new Date(afterTtl.getTime() + 1000);
    expect(await acquireIngestLock(db, INGEST_LOCK_TTL_MS, thirdPass)).toBeNull();
  });

  it('does release the lock this pass does hold', async () => {
    const rows = new Map<string, string>();
    const db = fakeDb(rows);

    const holding = await acquireIngestLock(db, INGEST_LOCK_TTL_MS, now);
    await releaseIngestLock(db, holding ?? undefined);

    expect(rows.get(INGEST_LOCK_KEY)).toBe(new Date(0).toISOString());
  });
});

import { describe, expect, it } from 'vitest';
import { RATE_LIMITS, callerKey, consumeRateLimit, meteringSubject, networkKey } from '../src/rateLimit.js';

// The counter, against a stand-in for D1 that implements exactly the one
// statement it runs. Not a mock that agrees with whatever was asked: it keeps
// real rows and applies the same window-rolled-over rule the SQL does, so a
// change to either half shows up here as a failing count rather than as a
// passing test about nothing.

interface Row {
  count: number;
  windowStart: string;
}

function fakeDb(rows = new Map<string, Row>(), failing = false): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind(...binds: unknown[]) {
          return {
            async first<T>(): Promise<T | null> {
              if (failing) throw new Error('D1_ERROR: no such table');
              if (!sql.includes('rate_limits')) throw new Error(`unexpected statement: ${sql}`);
              const [bucket, subject, nowIso, cutoffIso] = binds as string[];
              const key = `${bucket}|${subject}`;
              const existing = rows.get(key);
              const rolled = !existing || existing.windowStart <= cutoffIso;
              const next: Row = rolled
                ? { count: 1, windowStart: nowIso }
                : { count: existing.count + 1, windowStart: existing.windowStart };
              rows.set(key, next);
              return { count: next.count, window_start: next.windowStart } as T;
            },
            async run() {
              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

const IP = '203.0.113.7';

describe('consumeRateLimit', () => {
  it('serves everything up to the ceiling and refuses the one past it', async () => {
    const db = fakeDb();
    const rule = RATE_LIMITS.ticket_create_ip;
    const now = new Date('2026-08-02T00:00:00.000Z');

    for (let i = 1; i <= rule.limit; i++) {
      const outcome = await consumeRateLimit(db, 'ticket_create_ip', IP, now);
      expect(outcome.allowed, `request ${i}`).toBe(true);
      expect(outcome.count).toBe(i);
    }

    const refused = await consumeRateLimit(db, 'ticket_create_ip', IP, now);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps counting refused attempts, so hammering does not reset the window', async () => {
    const rows = new Map();
    const db = fakeDb(rows);
    const now = new Date('2026-08-02T00:00:00.000Z');
    for (let i = 0; i < 20; i++) await consumeRateLimit(db, 'ticket_create_ip', IP, now);
    const outcome = await consumeRateLimit(db, 'ticket_create_ip', IP, now);
    expect(outcome.allowed).toBe(false);
    expect(outcome.count).toBe(21);
  });

  it('starts fresh once the window has rolled', async () => {
    const db = fakeDb();
    const start = new Date('2026-08-02T00:00:00.000Z');
    for (let i = 0; i < 10; i++) await consumeRateLimit(db, 'ticket_create_ip', IP, start);

    const later = new Date(start.getTime() + (RATE_LIMITS.ticket_create_ip.windowSeconds + 60) * 1000);
    const outcome = await consumeRateLimit(db, 'ticket_create_ip', IP, later);
    expect(outcome.allowed).toBe(true);
    expect(outcome.count).toBe(1);
  });

  it('counts callers and buckets separately', async () => {
    const db = fakeDb();
    const now = new Date('2026-08-02T00:00:00.000Z');
    await consumeRateLimit(db, 'ticket_create_ip', IP, now);
    expect((await consumeRateLimit(db, 'ticket_create_ip', '198.51.100.9', now)).count).toBe(1);
    expect((await consumeRateLimit(db, 'ticket_reply', IP, now)).count).toBe(1);
  });

  it('fails open, because a desk that stops accepting tickets when its counter table is down has the failure the wrong way round', async () => {
    const outcome = await consumeRateLimit(fakeDb(new Map(), true), 'ticket_create_ip', IP);
    expect(outcome.allowed).toBe(true);
  });
});

describe('callerKey', () => {
  it('reads the header Cloudflare overwrites, not one a client can set', () => {
    const headers = new Headers({ 'cf-ray': 'abc-SYD', 'cf-connecting-ip': IP, 'x-forwarded-for': '10.0.0.1' });
    expect(callerKey(headers)).toBe(IP);
  });

  // The gate is CF-Ray, not the address. `wrangler dev` supplies
  // CF-Connecting-IP: 127.0.0.1 of its own accord, so keying on the address
  // alone put every local request in one bucket and refused the sixth ticket
  // of a development session. CF-Ray is the signal the HTTPS redirect and the
  // country check already use to mean "this came through the edge".
  it('does not limit under wrangler dev, which supplies a loopback address but no CF-Ray', () => {
    expect(callerKey(new Headers({ 'cf-connecting-ip': '127.0.0.1' }))).toBeNull();
    expect(callerKey(new Headers())).toBeNull();
  });
});

// ---- key normalisation ---------------------------------------------------
//
// The audit's finding: the counters were correct and the keys were literal,
// so both ceilings could be walked past by anyone who knew how their own email
// provider or their own ISP works. A limit that is trivial to sidestep is
// worse than no limit, because it appears on a diagram as a control.

describe('meteringSubject', () => {
  it('folds plus-tagging, which is how one inbox became unlimited buckets', () => {
    // victim+1@, victim+2@, victim+3@ all arrive in one inbox. Counted
    // literally, the per-recipient ceiling was per *spelling*, and there is
    // an unlimited supply of spellings.
    expect(meteringSubject('victim+1@example.com')).toBe('victim@example.com');
    expect(meteringSubject('victim+anything.at.all@example.com')).toBe('victim@example.com');
    expect(meteringSubject('victim@example.com')).toBe('victim@example.com');
  });

  it('folds dots only where the provider actually ignores them', () => {
    // Google treats them as noise. Nobody else is guaranteed to, and folding
    // dots elsewhere would merge two people who are genuinely different.
    expect(meteringSubject('first.last@gmail.com')).toBe('firstlast@gmail.com');
    expect(meteringSubject('first.last@googlemail.com')).toBe('firstlast@googlemail.com');
    expect(meteringSubject('first.last@example.com')).toBe('first.last@example.com');
  });

  it('is case and whitespace insensitive', () => {
    expect(meteringSubject('  Victim+Tag@Example.COM ')).toBe('victim@example.com');
  });

  it('leaves a leading plus alone rather than producing an empty bucket', () => {
    // '+tag@host' has no local part before the plus. Folding it to '@host'
    // would put every such address into one shared bucket.
    expect(meteringSubject('+tag@example.com')).toBe('+tag@example.com');
  });

  it('does not throw on something that is not an address', () => {
    expect(meteringSubject('nonsense')).toBe('nonsense');
    expect(meteringSubject('')).toBe('');
  });
});

describe('networkKey', () => {
  it('counts an IPv4 address whole', () => {
    expect(networkKey('203.0.113.7')).toBe('203.0.113.7');
  });

  it('folds IPv6 to the /64 its owner was delegated', () => {
    // The finding. A residential IPv6 connection is handed a /64, which is
    // eighteen quintillion source addresses one person can pick from at will.
    // Counting the full address there counted nothing at all.
    const first = networkKey('2001:db8:abcd:1234:1:2:3:4');
    const second = networkKey('2001:db8:abcd:1234:ffff:ffff:ffff:ffff');
    expect(first).toBe(second);
    expect(first).toBe('2001:db8:abcd:1234::/64');
  });

  it('keeps genuinely different networks apart', () => {
    expect(networkKey('2001:db8:abcd:1234::1')).not.toBe(networkKey('2001:db8:abcd:1235::1'));
  });

  it('handles compressed and zero-padded forms as the same network', () => {
    expect(networkKey('2001:0db8:0000:0001::5')).toBe(networkKey('2001:db8:0:1:aaaa::9'));
  });

  it('folds a leading :: without inventing groups', () => {
    expect(networkKey('::1')).toBe('0:0:0:0::/64');
  });

  it('ignores a zone index', () => {
    expect(networkKey('fe80::1%eth0')).toBe(networkKey('fe80::2'));
  });
});

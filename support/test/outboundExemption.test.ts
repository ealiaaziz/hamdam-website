import { describe, expect, it } from 'vitest';
import { RATE_LIMITS, mayEmailRecipient } from '../src/rateLimit.js';
import { adminTicketPage } from '../src/render/admin.js';
import type { TicketWithRequester } from '../src/types.js';
import { listUndeliveredOutboundForTicket, type UndeliveredOutbound } from '../src/db.js';

// Two halves of one fix, from 2026-08-10.
//
// A stranger could spend a named requester's whole per-recipient mail budget,
// and because an agent's console reply went through the same ceiling, every
// reply the desk then typed to that person was marked `failed` and never sent
// while the console showed its usual redirect. The exemption stops the reply
// being blocked; the notice stops a failure being silent.

// A stand-in for D1 that keeps real counts, so an exemption that quietly
// consumed the budget would show up here rather than passing.
function countingDb(rows = new Map<string, number>()): { db: D1Database; rows: Map<string, number> } {
  const db = {
    prepare(sql: string) {
      return {
        bind(...binds: unknown[]) {
          return {
            async first<T>(): Promise<T | null> {
              if (!sql.includes('rate_limits')) throw new Error(`unexpected statement: ${sql}`);
              const [bucket, subject, nowIso] = binds as string[];
              const key = `${bucket}|${subject}`;
              const next = (rows.get(key) ?? 0) + 1;
              rows.set(key, next);
              return { count: next, window_start: nowIso } as T;
            },
            async run() {
              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, rows };
}

describe('the budget a stranger can drain', () => {
  // Pinned as arithmetic rather than described in a comment, because the
  // reachability of the whole finding is a relationship between three numbers
  // that live in different buckets. If someone later raises a ceiling and this
  // stops holding, the attack got cheaper and this test should be the thing
  // that says so.
  it('is exactly reachable from the two portal paths, which is why the exemption exists', () => {
    const fromNewTickets = RATE_LIMITS.ticket_create_email.limit; // 5 acks, per named recipient
    const fromSummaries = RATE_LIMITS.ticket_summary.limit; //       10 presses, metered per IP
    const recipientBudget = RATE_LIMITS.outbound_recipient.limit;

    expect(fromNewTickets + fromSummaries).toBeGreaterThanOrEqual(recipientBudget);
  });

  it('and the summary press is metered per caller, not per recipient, so it does not self-limit', () => {
    // The point of the finding: the attacker's own IP budget is what bounds
    // the summary path, and it is spent on someone else's inbox.
    expect(RATE_LIMITS.ticket_summary.limit).toBeGreaterThanOrEqual(RATE_LIMITS.outbound_recipient.limit - RATE_LIMITS.ticket_create_email.limit);
  });
});

describe('mayEmailRecipient', () => {
  it('meters an ordinary recipient', async () => {
    const { db, rows } = countingDb();
    const outcome = await mayEmailRecipient(db, 'victim@customer.com', []);
    expect(outcome.allowed).toBe(true);
    expect(rows.get('outbound_recipient|victim@customer.com')).toBe(1);
  });

  it('exempts an address without spending its budget', async () => {
    // Neither blocked nor counted. Counting an exempt send would reintroduce
    // the bug through the back door: the reply would go out, and then quietly
    // eat the allowance the next one needs.
    const { db, rows } = countingDb();
    const outcome = await mayEmailRecipient(db, 'victim@customer.com', ['victim@customer.com']);
    expect(outcome.allowed).toBe(true);
    expect(outcome.count).toBe(0);
    expect(rows.size).toBe(0);
  });

  it('refuses once the ceiling is spent, which is the state the agent used to be caught by', async () => {
    const { db } = countingDb();
    let last = await mayEmailRecipient(db, 'victim@customer.com', []);
    for (let i = 1; i < RATE_LIMITS.outbound_recipient.limit + 1; i += 1) {
      last = await mayEmailRecipient(db, 'victim@customer.com', []);
    }
    expect(last.allowed).toBe(false);
  });
});

const TICKET: TicketWithRequester = {
  id: 27,
  requester_id: 1,
  subject: 'Cannot sign in',
  status: 'open',
  priority: 'P3',
  impact: null,
  urgency: null,
  category: null,
  channel: 'portal',
  topic: 'general_it',
  locale: 'en',
  tracking_token: 'x'.repeat(32),
  source_conversation_id: null,
  last_inbound_message_id: null,
  assigned_to: null,
  created_at: '2026-08-10T01:00:00.000Z',
  updated_at: '2026-08-10T01:00:00.000Z',
  sla_first_response_due: '2026-08-10T09:00:00.000Z',
  sla_resolve_due: '2026-08-12T01:00:00.000Z',
  first_response_at: null,
  resolved_at: null,
  closed_at: null,
  requester_email: 'victim@customer.com',
  requester_name: 'A Person',
};

function failedRow(overrides: Partial<UndeliveredOutbound> = {}): UndeliveredOutbound {
  return {
    id: 1,
    kind: 'agent_reply',
    to_email: 'victim@customer.com',
    status: 'failed',
    failure_reason: 'recipient hourly limit reached (11)',
    created_at: '2026-08-10T02:00:00.000Z',
    ...overrides,
  };
}

describe('the admin ticket page', () => {
  const base = { ticket: TICKET, comments: [], agentEmail: 'developer@hamdam.com.au', allowlistConfigured: true };

  it('says nothing when every email went out', () => {
    const html = adminTicketPage({ ...base, undeliveredOutbound: [] });
    expect(html).not.toContain('not been delivered');
  });

  it('is unchanged for callers that do not pass the new field', () => {
    // The route passes it; nothing else should have to. Defaulting to an
    // empty list rather than throwing keeps this additive.
    const html = adminTicketPage(base);
    expect(html).not.toContain('not been delivered');
  });

  it('says so, with the reason, when one did not', () => {
    const html = adminTicketPage({ ...base, undeliveredOutbound: [failedRow()] });
    expect(html).toContain('not been delivered');
    expect(html).toContain('recipient hourly limit reached (11)');
    expect(html).toContain('victim@customer.com');
    // The sentence that matters to whoever is reading: not merely that it
    // failed, but that no machine is going to fix it.
    expect(html).toContain('nothing will retry');
  });

  it('escapes the failure reason', () => {
    // Ours today, but it is a string that reaches a page.
    const html = adminTicketPage({
      ...base,
      undeliveredOutbound: [failedRow({ failure_reason: '<img src=x onerror=alert(1)>' })],
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  it('counts correctly for more than one', () => {
    const html = adminTicketPage({
      ...base,
      undeliveredOutbound: [failedRow(), failedRow({ id: 2, kind: 'ack' })],
    });
    expect(html).toContain('2 emails on this ticket have not been delivered');
  });

  it('calls a stuck pending row never attempted rather than failed', () => {
    // `approveDraft` sets `pending`, and nothing in the Worker reads a
    // pending row, so this is the silent case: no failure reason exists
    // because nothing ever tried.
    const html = adminTicketPage({
      ...base,
      undeliveredOutbound: [failedRow({ status: 'pending', failure_reason: null })],
    });
    expect(html).toContain('never attempted');
    expect(html).not.toContain('no reason recorded');
  });

  it('does not tell the reader who has or has not seen it', () => {
    // The notice covers kinds bound for the desk's own inbox
    // (`requester_reply`) and for the team (an escalation's
    // `status_change`), so a blanket "the requester has not seen this" would
    // be false on those rows, and "resend the reply below" would be the
    // wrong remedy. It names the address and stops.
    const html = adminTicketPage({
      ...base,
      undeliveredOutbound: [failedRow({ kind: 'status_change', to_email: 'team@hamdam.com.au' })],
    });
    expect(html).toContain('team@hamdam.com.au');
    expect(html).not.toContain('The requester has not seen');
    expect(html).not.toContain('posting the reply again');
  });
});

describe('listUndeliveredOutboundForTicket', () => {
  // Asserted against the statement it actually runs, because the whole value
  // of the query is in which rows it does and does not pick up.
  function captureSql(): { db: D1Database; seen: { sql: string; binds: unknown[] } } {
    const seen = { sql: '', binds: [] as unknown[] };
    const db = {
      prepare(sql: string) {
        seen.sql = sql;
        return {
          bind(...binds: unknown[]) {
            seen.binds = binds;
            return { async all<T>() { return { results: [] as T[] }; } };
          },
        };
      },
    } as unknown as D1Database;
    return { db, seen };
  }

  it('binds the ticket id and a staleness cutoff rather than interpolating them', async () => {
    const { db, seen } = captureSql();
    await listUndeliveredOutboundForTicket(db, 27, new Date('2026-08-10T03:00:00.000Z'));
    expect(seen.binds[0]).toBe(27);
    // Five minutes back, so a row queued by the request rendering this page
    // is still in flight and is not reported as stuck.
    expect(seen.binds[1]).toBe('2026-08-10T02:55:00.000Z');
    expect(seen.sql).not.toContain('27');
  });

  it('asks for failed and stale-pending rows, and never for drafts', async () => {
    const { db, seen } = captureSql();
    await listUndeliveredOutboundForTicket(db, 27);
    expect(seen.sql).toContain("status = 'failed'");
    expect(seen.sql).toContain("status = 'pending'");
    // A draft is deliberately unsent and the console shows it on purpose.
    expect(seen.sql).not.toContain("'draft'");
  });

  it('does not select body_html', async () => {
    // A summary email carries the whole conversation. Fetching it to render
    // four fields is how this page stops loading on the ticket that needs it.
    const { db, seen } = captureSql();
    await listUndeliveredOutboundForTicket(db, 27);
    expect(seen.sql).not.toContain('body_html');
    expect(seen.sql).not.toContain('SELECT *');
  });
});

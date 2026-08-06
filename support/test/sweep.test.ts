import { describe, expect, it } from 'vitest';
import { decideAlert, readAlertState, UNASSIGNED_REMINDER_MS, UNASSIGNED_SWEEP_CRON } from '../src/sweep.js';
import { unassignedDigestEmail } from '../src/render/unassigned.js';
import type { TicketWithRequester } from '../src/types.js';

// The query is the easy half. When to send is the half that decides whether
// this feature helps or becomes a filter rule, so it is a pure function and
// this is where it is pinned.

const now = new Date('2026-08-06T08:00:00Z');

describe('decideAlert', () => {
  const quiet = { ids: [] as number[], total: 0, sentAt: null };

  it('says nothing when nothing is unassigned', () => {
    // No "all clear" heartbeat. That is the fastest way to teach somebody to
    // filter this sender, and then the one email that mattered goes with it.
    expect(decideAlert(quiet, [], now.getTime()).send).toBe(false);
  });

  it('sends the first time anything turns up', () => {
    expect(decideAlert(quiet, [7], now.getTime()).send).toBe(true);
  });

  it('sends when a ticket appears that was not in the last alert', () => {
    const state = { ids: [7], total: 1, sentAt: '2026-08-06T07:00:00Z' };
    expect(decideAlert(state, [7, 8], now.getTime())).toMatchObject({ send: true });
  });

  it('stays quiet when the same tickets are still sitting there', () => {
    // Every two hours with the same three tickets in it is a digest nobody
    // reads, and then this file has made things worse rather than better.
    const state = { ids: [7, 8], total: 2, sentAt: '2026-08-06T07:00:00Z' };
    expect(decideAlert(state, [7, 8], now.getTime()).send).toBe(false);
  });

  it('stays quiet when the list only shrank', () => {
    // Somebody assigned one. That is the outcome being asked for, and
    // congratulating them by email is noise.
    const state = { ids: [7, 8], total: 2, sentAt: '2026-08-06T07:00:00Z' };
    expect(decideAlert(state, [7], now.getTime()).send).toBe(false);
  });

  it('reminds once a day while the list is not empty', () => {
    // Without this, a backlog that stops changing goes permanently silent,
    // which is indistinguishable from an empty queue: the exact failure this
    // sweep exists to end.
    const state = { ids: [7], total: 1, sentAt: new Date(now.getTime() - UNASSIGNED_REMINDER_MS - 1000).toISOString() };
    expect(decideAlert(state, [7], now.getTime())).toMatchObject({ send: true });
  });

  it('treats a ticket that was assigned and unassigned again as new', () => {
    // The stored ids are rewritten every pass, whether or not anything was
    // sent, which is what makes this true.
    const state = { ids: [], total: 0, sentAt: '2026-08-06T07:30:00Z' };
    expect(decideAlert(state, [7], now.getTime()).send).toBe(true);
  });


  it('sends when the backlog grew but every visible ticket is familiar', () => {
    // The digest lists the worst twenty-five, oldest first, so on a queue
    // longer than that the new arrivals are underneath the cut. Comparing ids
    // alone would go quiet exactly when the backlog is growing fastest.
    const state = { ids: [1, 2], total: 2, sentAt: '2026-08-06T07:00:00Z' };
    expect(decideAlert(state, [1, 2], now.getTime(), 9)).toMatchObject({ send: true });
  });

  it('stays quiet when the total is unchanged and so are the ids', () => {
    const state = { ids: [1, 2], total: 30, sentAt: '2026-08-06T07:00:00Z' };
    expect(decideAlert(state, [1, 2], now.getTime(), 30).send).toBe(false);
  });

  it('stays quiet when the backlog only shrank behind the cut', () => {
    const state = { ids: [1, 2], total: 30, sentAt: '2026-08-06T07:00:00Z' };
    expect(decideAlert(state, [1, 2], now.getTime(), 28).send).toBe(false);
  });

  it('sends rather than swallowing an unreadable last-sent time', () => {
    expect(decideAlert({ ids: [7], total: 1, sentAt: 'not a date' }, [7], now.getTime()).send).toBe(true);
  });
});

describe('readAlertState', () => {
  it('reads what the sweep wrote', () => {
    expect(readAlertState('{"ids":[1,2],"total":2,"sentAt":"2026-08-06T07:00:00Z"}')).toEqual({
      ids: [1, 2],
      total: 2,
      sentAt: '2026-08-06T07:00:00Z',
    });
  });

  it('treats nonsense as nothing known, which sends', () => {
    // Of the two ways to be wrong about a corrupt row, one extra email beats
    // silently suppressing every future one.
    for (const raw of [null, '', 'not json', '{"ids":"seven"}']) {
      expect(readAlertState(raw).ids, String(raw)).toEqual([]);
    }
  });

  it('drops ids that are not numbers', () => {
    expect(readAlertState('{"ids":[1,"2",null,3]}').ids).toEqual([1, 3]);
  });

  it('reads a row written before the total was recorded as its own length', () => {
    // Not as zero. Zero would make the first pass after an upgrade report a
    // jump from nothing to the whole backlog, which is a false alarm dressed
    // as the exact alarm this sends.
    expect(readAlertState('{"ids":[1,2,3],"sentAt":null}').total).toBe(3);
  });
});

describe('the sweep cron', () => {
  it('is every two hours, matching wrangler.jsonc', () => {
    // The handler picks its job from event.cron, so this string and the one
    // in wrangler.jsonc are one value in two files. A mismatch means the
    // sweep never runs, which looks exactly like a queue that is always clean.
    expect(UNASSIGNED_SWEEP_CRON).toBe('0 */2 * * *');
  });
});

const ticket = (over: Partial<TicketWithRequester> = {}): TicketWithRequester =>
  ({
    id: 41,
    requester_id: 1,
    subject: 'Cannot sign in to iCloud',
    status: 'open',
    priority: 'P2',
    impact: 'high',
    urgency: 'medium',
    category: null,
    channel: 'email',
    topic: 'hamdam',
    locale: 'en',
    tracking_token: 'tok',
    source_conversation_id: null,
    last_inbound_message_id: null,
    assigned_to: null,
    created_at: '2026-08-06T05:00:00Z',
    updated_at: '2026-08-06T05:00:00Z',
    sla_first_response_due: '2026-08-06T06:00:00Z',
    sla_resolve_due: '2026-08-07T05:00:00Z',
    first_response_at: null,
    resolved_at: null,
    closed_at: null,
    requester_email: 'someone@example.com',
    requester_name: 'Someone Waiting',
    ...over,
  }) as TicketWithRequester;

describe('unassignedDigestEmail', () => {
  const { subject, html } = unassignedDigestEmail({
    tickets: [ticket()],
    total: 1,
    adminBaseUrl: 'https://support.hamdam.com.au',
    now,
  });

  it('puts the count in the subject, because that is all a lock screen shows', () => {
    expect(subject).toBe('[Hamdam Support] 1 unassigned ticket');
    expect(unassignedDigestEmail({ tickets: [ticket(), ticket({ id: 42 })], total: 2, adminBaseUrl: 'x', now }).subject).toContain(
      '2 unassigned tickets',
    );
  });

  it('is actionable without opening anything: which, how old, how urgent', () => {
    expect(html).toContain('HAM-41');
    expect(html).toContain('Cannot sign in to iCloud');
    expect(html).toContain('someone@example.com');
    expect(html).toContain('open 3 hours');
    expect(html).toContain('P2');
    expect(html).toContain('https://support.hamdam.com.au/admin/tickets/41');
  });

  it('flags a first response that is already late', () => {
    expect(html).toContain('first response overdue');
  });

  it('reports the real total when the list was cut', () => {
    // Showing the first twenty-five of two hundred without saying so would
    // misreport the size of the problem, which is the one number this email
    // exists to carry.
    const { html: many } = unassignedDigestEmail({ tickets: [ticket()], total: 30, adminBaseUrl: 'x', now });
    expect(many).toContain('30 unassigned tickets');
    expect(many).toContain('And 29 more');
  });

  it('escapes a hostile subject rather than rendering it', () => {
    const { html: nasty } = unassignedDigestEmail({
      tickets: [ticket({ subject: '<img src=x onerror=alert(1)>' })],
      total: 1,
      adminBaseUrl: 'x',
      now,
    });
    expect(nasty).not.toContain('<img src=x');
    expect(nasty).toContain('&lt;img');
  });
});

import { describe, expect, it } from 'vitest';
import { escalationEmail } from '../src/render/escalation.js';
import { DEFAULT_ESCALATION_RECIPIENTS, escalationRecipients } from '../src/escalation.js';
import type { CommentRow, TicketWithRequester } from '../src/types.js';
import type { Env } from '../src/types.js';

// The handover has to be answerable from a phone. The failure being guarded
// against is not "nobody was told"; it is being told on a Saturday that a
// ticket needs attention and having to open a laptop to find out whether it
// can wait.

const now = new Date('2026-08-02T06:00:00Z');

const ticket = (over: Partial<TicketWithRequester> = {}): TicketWithRequester =>
  ({
    id: 31,
    requester_id: 1,
    subject: 'Verse will not load',
    status: 'open',
    priority: 'P2',
    impact: 'high',
    urgency: 'medium',
    category: null,
    channel: 'portal',
    topic: 'hamdam',
    tracking_token: 'tok',
    source_conversation_id: null,
    last_inbound_message_id: null,
    assigned_to: null,
    created_at: '2026-08-02T04:00:00Z',
    updated_at: '2026-08-02T05:00:00Z',
    sla_first_response_due: '2026-08-02T05:00:00Z',
    sla_resolve_due: '2026-08-03T04:00:00Z',
    first_response_at: null,
    resolved_at: null,
    closed_at: null,
    requester_email: 'someone@example.com',
    requester_name: 'Someone Waiting',
    ...over,
  }) as TicketWithRequester;

const comments: CommentRow[] = [
  { id: 1, ticket_id: 31, author_type: 'requester', author_name: 'Someone Waiting', body: 'The verse is blank every morning.', created_at: '2026-08-02T04:00:00Z' },
  { id: 2, ticket_id: 31, author_type: 'agent', author_name: 'Hamdam Assistant (automated)', body: 'Try reopening the app.', created_at: '2026-08-02T04:01:00Z' },
];

const base = {
  ticket: ticket(),
  comments,
  reason: 'priority P2 is handled by a person',
  rejectedArticles: ['verse-not-loading'],
  askedQuestions: ['Does it happen every time?'],
  assistantTurns: 1,
  trackingUrl: 'https://support.hamdam.com.au/tickets/31?token=tok',
  adminUrl: 'https://support.hamdam.com.au/admin/tickets/31',
  now,
};

describe('escalationEmail', () => {
  const { subject, html } = escalationEmail(base);

  it('says which ticket and how urgent, in the subject line', () => {
    // The subject is all you get on a lock screen.
    expect(subject).toContain('HAM-31');
    expect(subject).toContain('P2');
    expect(subject).toContain('needs a person');
    expect(subject).toContain('Verse will not load');
  });

  it('names who is waiting and how to reach them', () => {
    expect(html).toContain('Someone Waiting');
    expect(html).toContain('mailto:someone@example.com');
  });

  it('says why the assistant stopped', () => {
    expect(html).toContain('priority P2 is handled by a person');
  });

  it('carries the whole conversation, so the reply needs no other tab', () => {
    expect(html).toContain('The verse is blank every morning.');
    expect(html).toContain('Try reopening the app.');
  });

  it('reports what was already tried, so nobody repeats it', () => {
    expect(html).toContain('verse-not-loading');
    expect(html).toContain('Does it happen every time?');
    expect(html).toContain('replied 1 time');
  });

  it('turns the SLA into something readable without arithmetic', () => {
    expect(html).toContain('1 hour ago');
    expect(html).toContain('opened 2 hours ago');
  });

  it('shouts when the first response is already overdue', () => {
    expect(html).toContain('First response is overdue');
  });

  it('stays quiet when it is not', () => {
    const { html: fresh } = escalationEmail({
      ...base,
      ticket: ticket({ sla_first_response_due: '2026-08-02T09:00:00Z' }),
    });
    expect(fresh).not.toContain('overdue');
  });

  it('links to both the console and the requester view', () => {
    expect(html).toContain('https://support.hamdam.com.au/admin/tickets/31');
    expect(html).toContain('https://support.hamdam.com.au/tickets/31?token=tok');
  });

  it('says which queue it came from', () => {
    expect(html).toContain('Hamdam app');
    expect(escalationEmail({ ...base, ticket: ticket({ topic: 'general_it' }) }).html).toContain('General IT');
  });

  it('makes clear the requester cannot see it', () => {
    expect(html).toContain('the requester has not seen it');
  });

  it('escapes a hostile subject rather than rendering it', () => {
    const { html: nasty } = escalationEmail({ ...base, ticket: ticket({ subject: '<img src=x onerror=alert(1)>' }) });
    expect(nasty).not.toContain('<img src=x');
    expect(nasty).toContain('&lt;img');
  });
});

describe('escalationRecipients', () => {
  it('tells both of the people who cover the desk', () => {
    expect(escalationRecipients({} as Env)).toEqual(DEFAULT_ESCALATION_RECIPIENTS);
    expect(DEFAULT_ESCALATION_RECIPIENTS).toContain('azizollahi@live.com');
    expect(DEFAULT_ESCALATION_RECIPIENTS).toContain('binesh.fce19@gmail.com');
  });

  it('honours a configured list', () => {
    expect(escalationRecipients({ ESCALATION_RECIPIENTS: 'a@b.com, c@d.com' } as Env)).toEqual(['a@b.com', 'c@d.com']);
  });

  it('falls back rather than telling nobody', () => {
    // An empty or malformed setting must not silently mean "alert no one".
    for (const value of ['', '   ', 'not-an-address']) {
      expect(escalationRecipients({ ESCALATION_RECIPIENTS: value } as Env)).toEqual(DEFAULT_ESCALATION_RECIPIENTS);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { cleanSubject, isFromTheDesk, messageBodyText, planInbound, stripQuotedReply, ticketIdFromSubject } from '../src/inbound.js';
import type { InboundMessage } from '../src/mailer.js';

// Reading the inbox used to be a Claude session with database credentials
// and a mailbox, on an hourly schedule. It is a function now, and these are
// the cases that decide whether it is a safe one.

const message = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  internetMessageId: '<abc@example.com>',
  conversationId: 'conv-1',
  subject: 'Verse will not load',
  fromEmail: 'someone@example.com',
  fromName: 'Someone',
  receivedAt: '2026-08-02T01:00:00Z',
  bodyHtml: '<p>The daily verse is blank today.</p>',
  ...over,
});

const known = (over: Partial<Parameters<typeof planInbound>[1]> = {}) => ({
  alreadyProcessed: false,
  ticketIdForConversation: null,
  ticketExists: () => true,
  ...over,
});

describe('isFromTheDesk', () => {
  it('recognises the desk in any casing', () => {
    for (const address of ['developer@hamdam.com.au', 'Developer@Hamdam.com.au', '  DEVELOPER@HAMDAM.COM.AU  ']) {
      expect(isFromTheDesk(address), address).toBe(true);
    }
  });

  it('does not mistake a requester for it', () => {
    expect(isFromTheDesk('developer@example.com')).toBe(false);
    expect(isFromTheDesk('notdeveloper@hamdam.com.au')).toBe(false);
  });
});

describe('ticketIdFromSubject', () => {
  it('finds the tag wherever a mail client put it', () => {
    expect(ticketIdFromSubject('[HAM-14] Verse will not load')).toBe(14);
    expect(ticketIdFromSubject('RE: [HAM-14] Verse will not load')).toBe(14);
    expect(ticketIdFromSubject('Fwd: RE: [ham-7] something')).toBe(7);
  });

  it('is null when there is no tag', () => {
    expect(ticketIdFromSubject('Verse will not load')).toBeNull();
    expect(ticketIdFromSubject('HAMSTER-1 is not a ticket')).toBeNull();
  });
});

describe('stripQuotedReply', () => {
  it('keeps only what the person typed this time', () => {
    const reply = `That did not work, still blank.

On Sat, 2 Aug 2026 at 11:04, Hamdam Support <developer@hamdam.com.au> wrote:
> Try closing the app fully and reopening it.
> If that does not help, reply here.`;
    expect(stripQuotedReply(reply)).toBe('That did not work, still blank.');
  });

  it('handles the Outlook header block', () => {
    const reply = `Still happening.

From: Hamdam Support
Sent: Saturday, 2 August 2026
To: Someone
Subject: RE: [HAM-1] thing`;
    expect(stripQuotedReply(reply)).toBe('Still happening.');
  });

  it('leaves an unquoted message untouched', () => {
    expect(stripQuotedReply('Just a plain message.')).toBe('Just a plain message.');
  });

  it('keeps the original when stripping would leave nothing', () => {
    // Cutting too much loses what someone wrote, which is the entire point
    // of the message.
    const onlyQuote = '> everything here is quoted';
    expect(stripQuotedReply(onlyQuote)).toBe(onlyQuote);
  });
});

describe('planInbound', () => {
  it('never ingests the desk talking to itself', () => {
    // Unchecked this is an infinite loop: the desk emails a requester, reads
    // its own message, files it as a ticket, and acknowledges it.
    const plan = planInbound(message({ fromEmail: 'developer@hamdam.com.au' }), known());
    expect(plan.action).toBe('skip');
  });

  it('skips a message it has already handled', () => {
    const plan = planInbound(message(), known({ alreadyProcessed: true }));
    expect(plan).toEqual({ action: 'skip', reason: 'already processed' });
  });

  it('skips a message with nothing in it', () => {
    expect(planInbound(message({ bodyHtml: '' }), known()).action).toBe('skip');
  });

  it('appends to the ticket named in the subject', () => {
    const plan = planInbound(message({ subject: 'RE: [HAM-9] Verse will not load' }), known());
    expect(plan).toMatchObject({ action: 'append', ticketId: 9 });
  });

  it('prefers the subject tag over the conversation id', () => {
    // The tag survives forwarding and a change of client. A conversation id
    // does not.
    const plan = planInbound(message({ subject: 'RE: [HAM-9] thing' }), known({ ticketIdForConversation: 3 }));
    expect(plan).toMatchObject({ action: 'append', ticketId: 9 });
  });

  it('falls back to the conversation id when the subject has no tag', () => {
    const plan = planInbound(message(), known({ ticketIdForConversation: 3 }));
    expect(plan).toMatchObject({ action: 'append', ticketId: 3 });
  });

  it('creates a ticket for anything genuinely new', () => {
    const plan = planInbound(message(), known());
    expect(plan).toMatchObject({ action: 'create' });
    if (plan.action === 'create') expect(plan.body).toContain('daily verse is blank');
  });

  it('does not append to a ticket that does not exist', () => {
    const plan = planInbound(message({ subject: 'RE: [HAM-999] thing' }), known({ ticketExists: () => false }));
    expect(plan.action).toBe('create');
  });
});

describe('messageBodyText', () => {
  it('turns HTML into the text a ticket comment should hold', () => {
    const body = messageBodyText(message({ bodyHtml: '<div><p>Line one</p><p>Line two</p></div>' }));
    expect(body).toContain('Line one');
    expect(body).not.toContain('<p>');
  });
});

describe('cleanSubject', () => {
  it('strips the tag and reply prefixes from a new ticket subject', () => {
    expect(cleanSubject('RE: [HAM-14] Verse will not load')).toBe('Verse will not load');
    expect(cleanSubject('Fwd: something')).toBe('something');
  });

  it('never returns an empty subject', () => {
    expect(cleanSubject('[HAM-3]')).toBe('(no subject)');
    expect(cleanSubject('   ')).toBe('(no subject)');
  });
});

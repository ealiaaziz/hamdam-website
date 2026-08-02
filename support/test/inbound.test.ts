import { describe, expect, it } from 'vitest';
import { cleanSubject, isFromTheDesk, messageBodyText, planInbound, stripQuotedReply, ticketIdFromSubject } from '../src/inbound.js';
import type { InboundMessage } from '../src/mailer.js';

// Reading the inbox used to be a Claude session with database credentials
// and a mailbox, on an hourly schedule. It is a function now, and these are
// the cases that decide whether it is a safe one.

const message = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  id: 'AAMkAGabc',
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

describe('stripSignature', () => {
  // Live: a two word test email arrived carrying six lines of job title,
  // certifications and a mobile number, all of it stored on the ticket and
  // fed to the model as though the person had written it.
  it('drops the block a mail client appended', async () => {
    const { stripSignature } = await import('../src/inbound.js');
    const body = `Checking ticketing system

Regards,
Ealia Azizollahi
Senior Systems Engineer
+61-401 290 104`;
    expect(stripSignature(body)).toBe('Checking ticketing system');
  });

  it('handles the other common sign-offs', async () => {
    const { stripSignature } = await import('../src/inbound.js');
    for (const signoff of ['Thanks,', 'Kind regards', 'Cheers', '--', 'Sincerely,']) {
      expect(stripSignature(`The verse is blank.\n\n${signoff}\nSomeone`), signoff).toBe('The verse is blank.');
    }
  });

  it('does not cut on the word inside a sentence', async () => {
    const { stripSignature } = await import('../src/inbound.js');
    const body = 'Thanks for the last fix. Regards to the team, but the verse is still blank.';
    expect(stripSignature(body)).toBe(body);
  });

  it('keeps a message that is nothing but a signature', async () => {
    const { stripSignature } = await import('../src/inbound.js');
    const body = 'Regards,\nSomeone';
    expect(stripSignature(body)).toBe(body);
  });
});

describe('entity decoding', () => {
  it('does not leak &nbsp; into a ticket or the model context', async () => {
    const { messageBodyText } = await import('../src/inbound.js');
    const body = messageBodyText(message({ bodyHtml: '<p>ITIL V3,&nbsp;and&nbsp;more</p>' }));
    expect(body).not.toContain('&nbsp;');
    expect(body).toContain('ITIL V3, and more');
  });
});

describe('isAutomatedMail', () => {
  // This ran in production. An outbound reply to a dead address bounced, the
  // bounce carried "Undeliverable: [HAM-27] ..." so the tag matched, it was
  // filed as a reply, the assistant answered it, that answer bounced, once a
  // minute. The desk-address check could never catch it: the bounce really
  // does come from somewhere else.
  it('recognises the Exchange bounce that caused a live mail loop', async () => {
    const { isAutomatedMail } = await import('../src/inbound.js');
    expect(
      isAutomatedMail(
        'microsoftexchange329e71ec88ae4615bbc36ab6ce41109e@netorgft20885646.onmicrosoft.com',
        'Undeliverable: [HAM-27] Testing workflow',
      ),
    ).toBe(true);
  });

  it('recognises bounces and auto-replies generally', async () => {
    const { isAutomatedMail } = await import('../src/inbound.js');
    const cases: [string, string][] = [
      ['postmaster@example.com', 'Delivery Status Notification (Failure)'],
      ['MAILER-DAEMON@example.com', 'Returned mail: see transcript'],
      ['someone@example.com', 'Automatic reply: [HAM-9] your ticket'],
      ['someone@example.com', 'Out of Office: [HAM-9] your ticket'],
      ['no-reply@example.com', 'Anything at all'],
      ['someone@example.com', 'Undeliverable: [HAM-3] thing'],
    ];
    for (const [from, subject] of cases) {
      expect(isAutomatedMail(from, subject), `${from} / ${subject}`).toBe(true);
    }
  });

  it('does not mistake a person for a machine', async () => {
    const { isAutomatedMail } = await import('../src/inbound.js');
    const cases: [string, string][] = [
      ['azizollahi@live.com', 'RE: [HAM-9] Verse will not load'],
      ['someone@example.com', 'My reply is undeliverable to my colleague, can you help'],
      ['noreplacement@example.com', 'Question about Plus'],
      ['bouncer@example.com', 'The app keeps bouncing me out'],
    ];
    for (const [from, subject] of cases) {
      expect(isAutomatedMail(from, subject), `${from} / ${subject}`).toBe(false);
    }
  });

  it('skips the bounce before the ticket tag can route it', async () => {
    const { planInbound } = await import('../src/inbound.js');
    const plan = planInbound(
      message({
        fromEmail: 'postmaster@example.com',
        subject: 'Undeliverable: [HAM-9] Verse will not load',
      }),
      known({ ticketExists: () => true }),
    );
    expect(plan).toEqual({ action: 'skip', reason: 'automated mail, not a person' });
  });
});

describe('automated senders that are not at the start of the address', () => {
  // Live: microsoft-noreply@microsoft.com sent an admin notification that
  // became a P3 ticket, was acknowledged back to the noreply address, and
  // escalated, putting a "needs a person" alert in front of two people about
  // a Microsoft billing notice. A false escalation is worse than a missed
  // one: it is what teaches people to stop reading the alerts.
  it('catches the vendor notification that got through', async () => {
    const { isAutomatedMail } = await import('../src/inbound.js');
    expect(
      isAutomatedMail('microsoft-noreply@microsoft.com', 'Someone in your organisation ended your Granular admin relationship'),
    ).toBe(true);
  });

  it('catches the token wherever a vendor buried it', async () => {
    const { isAutomatedMail } = await import('../src/inbound.js');
    for (const from of [
      'microsoft-noreply@microsoft.com',
      'github-noreply@github.com',
      'atlassian.no-reply@atlassian.net',
      'billing-notifications@vendor.com',
      'stripe+bounces@stripe.com',
      'acme_donotreply@acme.io',
    ]) {
      expect(isAutomatedMail(from, 'Anything'), from).toBe(true);
    }
  });

  it('still lets people through', async () => {
    const { isAutomatedMail } = await import('../src/inbound.js');
    for (const from of [
      'azizollahi@live.com',
      'noreplacement@example.com',
      'bouncer@example.com',
      'sima.binesh@example.com',
      'notify.me@example.com',
    ]) {
      expect(isAutomatedMail(from, 'The verse will not load'), from).toBe(false);
    }
  });

  it('only reads the local part, so a domain cannot make a person a robot', async () => {
    const { isAutomatedMail } = await import('../src/inbound.js');
    expect(isAutomatedMail('sima@noreply-hosting.com', 'Help please')).toBe(false);
  });
});

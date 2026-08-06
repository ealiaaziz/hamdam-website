import { describe, expect, it } from 'vitest';
import { cleanSubject, isFromTheDesk, messageBodyText, planInbound, stripQuotedReply, ticketIdFromSubject } from '../src/inbound.js';
import type { InboundMessage } from '../src/mailer.js';

// Reading the inbox used to be a Claude session with database credentials
// and a mailbox, on an hourly schedule. It is a function now, and these are
// the cases that decide whether it is a safe one.

const message = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  id: 'AAMkAGabc',
  folder: 'inbox',
  internetMessageId: '<abc@example.com>',
  conversationId: 'conv-1',
  subject: 'Verse will not load',
  fromEmail: 'someone@example.com',
  fromName: 'Someone',
  receivedAt: '2026-08-02T01:00:00Z',
  bodyHtml: '<p>The daily verse is blank today.</p>',
  ...over,
});

// The sender of `message()` above, so the default fixture is a person
// replying on their own ticket rather than a stranger reaching into one.
const OWNER = 'someone@example.com';

// Authenticated by default, so that every pre-existing test still asks the
// question it was written to ask. The tests that care about authentication
// say so explicitly, below.
const known = (over: Partial<Parameters<typeof planInbound>[1]> = {}) => ({
  alreadyProcessed: false,
  taggedTicket: null,
  conversationTicket: null,
  senderAuthenticated: true,
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

  it('appends to the ticket named in the subject when the sender owns it', () => {
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] Verse will not load' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER } }),
    );
    expect(plan).toMatchObject({ action: 'append', ticketId: 9 });
  });

  it('matches the owner regardless of case and stray whitespace', () => {
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing', fromEmail: '  SomeOne@Example.COM ' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER } }),
    );
    expect(plan).toMatchObject({ action: 'append', ticketId: 9 });
  });

  it('prefers the subject tag over the conversation id', () => {
    // The tag survives forwarding and a change of client. A conversation id
    // does not.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER }, conversationTicket: { id: 3, requesterEmail: OWNER } }),
    );
    expect(plan).toMatchObject({ action: 'append', ticketId: 9 });
  });

  it('falls back to the conversation id when the subject has no tag', () => {
    const plan = planInbound(message(), known({ conversationTicket: { id: 3, requesterEmail: OWNER } }));
    expect(plan).toMatchObject({ action: 'append', ticketId: 3 });
  });

  it('creates a ticket for anything genuinely new', () => {
    const plan = planInbound(message(), known());
    expect(plan).toMatchObject({ action: 'create' });
    if (plan.action === 'create') expect(plan.body).toContain('daily verse is blank');
  });

  it('does not append to a ticket that does not exist', () => {
    const plan = planInbound(message({ subject: 'RE: [HAM-999] thing' }), known({ taggedTicket: null }));
    expect(plan.action).toBe('create');
  });

  // The finding this check exists for. Ticket ids are sequential and printed
  // in every email the desk sends, so HAM-41 and HAM-43 are free guesses.
  // Without an owner check the tag *was* the credential: a stranger's message
  // was filed as a requester comment on somebody else's ticket, could close
  // it, and made the desk email that stranger's words onward to the real
  // requester from an address that passes SPF and DKIM for this domain.
  it('refuses to write a stranger onto another person ticket', () => {
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] Verse will not load', fromEmail: 'attacker@evil.example' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER } }),
    );
    expect(plan.action).toBe('create');
  });

  it('will not let a guessed conversation id write onto a ticket either', () => {
    const plan = planInbound(
      message({ fromEmail: 'attacker@evil.example' }),
      known({ conversationTicket: { id: 3, requesterEmail: OWNER } }),
    );
    expect(plan.action).toBe('create');
  });

  it('loses nothing when it refuses: the stranger still gets a ticket', () => {
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing', fromEmail: 'newcomer@example.com' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER } }),
    );
    expect(plan).toMatchObject({ action: 'create' });
    if (plan.action === 'create') expect(plan.body).toContain('daily verse is blank');
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
      ['a.person@example.com', 'RE: [HAM-9] Verse will not load'],
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
      known({ taggedTicket: { id: 9, requesterEmail: OWNER } }),
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
      'a.person@example.com',
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

// The other half of the ownership rule, added after an audit pointed out that
// the first half was resting on nothing.
//
// Matching the sender against the requester reads as an identity check. It is
// one only when something has authenticated the address, and until now nothing
// had: `From:` is a line of text the sending client writes. For a requester
// whose domain publishes an enforcing DMARC policy, Exchange refuses the
// forgery before this code runs and the match is proof. For a requester whose
// domain does not, it was a claim being treated as proof.
describe('planInbound and an unauthenticated sender', () => {
  it('will not write onto a ticket on the strength of an unverified From', () => {
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] Verse will not load' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER }, senderAuthenticated: false }),
    );
    // Not an error and nothing lost: it becomes its own ticket, in front of a
    // person, exactly as a tag from a non-owner already did.
    expect(plan).toMatchObject({ action: 'create' });
  });

  it('applies the same rule to the conversation id path', () => {
    // The conversation id is harder to guess than a ticket tag and is still
    // not proof of who is sending.
    const plan = planInbound(
      message(),
      known({ conversationTicket: { id: 4, requesterEmail: OWNER }, senderAuthenticated: false }),
    );
    expect(plan).toMatchObject({ action: 'create' });
  });

  it('still appends when the address was authenticated and matches', () => {
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER }, senderAuthenticated: true }),
    );
    expect(plan).toMatchObject({ action: 'append', ticketId: 9 });
  });

  it('needs both, not either', () => {
    // An authenticated sender who is not the requester still may not write.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing', fromEmail: 'stranger@elsewhere.example' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER }, senderAuthenticated: true }),
    );
    expect(plan).toMatchObject({ action: 'create' });
  });
});

// The assignee's own reply, which is the other half of allocating a ticket.
//
// Escalation puts one named engineer on a ticket and emails them the whole
// conversation. Without a way to answer from that email, the allocation buys
// nothing: replying meant finding a laptop and signing in through Access, and
// a reply sent anyway would have opened a second ticket with the engineer as
// its requester.
//
// The bar is the same bar as for a requester, not a softer one. Exchange must
// have authenticated the address, and it must match what the desk itself
// wrote into `assigned_to`, which only ever holds an address from the
// configured list in assignment.ts.
describe('planInbound and the ticket assignee', () => {
  const ENGINEER = 'engineer@example.com';

  it('lets the assignee write on the ticket, as an agent', () => {
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] Verse will not load', fromEmail: ENGINEER }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER, assignedTo: ENGINEER }, senderAuthenticated: true }),
    );
    expect(plan).toMatchObject({ action: 'append', ticketId: 9, as: 'agent' });
  });

  it('marks the requester as the requester, not as an agent', () => {
    // The two roles do nearly opposite things downstream: a requester's words
    // are a question the assistant may answer, an agent's are an answer the
    // desk emails onward. Getting this backwards would mail somebody their
    // own message.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER, assignedTo: ENGINEER }, senderAuthenticated: true }),
    );
    expect(plan).toMatchObject({ action: 'append', ticketId: 9, as: 'requester' });
  });

  it('reads an assignee who is also the requester as the requester', () => {
    // Otherwise the desk would email a person their own words back.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER, assignedTo: OWNER }, senderAuthenticated: true }),
    );
    expect(plan).toMatchObject({ as: 'requester' });
  });

  it('refuses that address when Exchange did not authenticate it', () => {
    // The address is printed in every escalation email, so without this the
    // allocation would turn a known address into a password.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing', fromEmail: ENGINEER }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER, assignedTo: ENGINEER }, senderAuthenticated: false }),
    );
    expect(plan).toMatchObject({ action: 'create' });
  });

  it('gives an unassigned ticket no agent to speak for it', () => {
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing', fromEmail: ENGINEER }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER, assignedTo: null }, senderAuthenticated: true }),
    );
    expect(plan).toMatchObject({ action: 'create' });
  });

  it('does not let the engineer on one ticket write on another', () => {
    // Ticket ids are sequential and printed in every email the desk sends, so
    // the tag is a guess, not a credential. Being somebody's engineer is not
    // being everybody's.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-12] someone else', fromEmail: ENGINEER }),
      known({ taggedTicket: { id: 12, requesterEmail: 'other@example.com', assignedTo: 'someone.else@example.com' }, senderAuthenticated: true }),
    );
    expect(plan).toMatchObject({ action: 'create' });
  });

  it('applies the same rule on the conversation id path', () => {
    const plan = planInbound(
      message({ fromEmail: ENGINEER }),
      known({ conversationTicket: { id: 3, requesterEmail: OWNER, assignedTo: ENGINEER }, senderAuthenticated: true }),
    );
    expect(plan).toMatchObject({ action: 'append', ticketId: 3, as: 'agent' });
  });

  it('ignores case and surrounding whitespace in the stored address', () => {
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing', fromEmail: ENGINEER }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER, assignedTo: '  Engineer@Example.com ' }, senderAuthenticated: true }),
    );
    expect(plan).toMatchObject({ action: 'append', as: 'agent' });
  });
});

// The requester allowlist, which is what turns this desk into an internal
// one. Hamdam sets nothing and keeps taking mail from the public; a desk run
// for one business takes mail from that business and files the rest.
describe('planInbound and the requester allowlist', () => {
  it('opens a ticket for anyone when no allowlist is configured', () => {
    // Absent means absent, not empty. Hamdam depends on this.
    expect(planInbound(message({ fromEmail: 'stranger@anywhere.example' }), known())).toMatchObject({ action: 'create' });
  });

  it('opens a ticket for a sender the allowlist permits', () => {
    const plan = planInbound(message({ fromEmail: 'tim@circuitenergy.org' }), known({ requesterAllowed: true }));
    expect(plan).toMatchObject({ action: 'create' });
  });

  it('files and ignores a sender it does not', () => {
    // Skipped rather than refused: the message stays in the mailbox and is
    // recorded, and nothing goes back. Replying would confirm a live mailbox
    // to whoever sent it, which is the one thing an unsolicited sender learns.
    const plan = planInbound(message({ fromEmail: 'stranger@anywhere.example' }), known({ requesterAllowed: false }));
    expect(plan).toMatchObject({ action: 'skip' });
    expect(plan).toMatchObject({ reason: 'sender is not on the requester allowlist' });
  });

  it('still lets the ticket owner reply, allowlist or not', () => {
    // They passed the check when the ticket was created. Re-checking here
    // would orphan the open tickets of somebody who has since left, on a
    // conversation the desk has already been writing to them about.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER }, senderAuthenticated: true, requesterAllowed: false }),
    );
    expect(plan).toMatchObject({ action: 'append', ticketId: 9, as: 'requester' });
  });

  it('still lets the assigned engineer work the ticket from outside the domain', () => {
    // The whole point of allocation: the L3 engineer is not staff at the
    // customer, so the allowlist must not lock them out of their own ticket.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing', fromEmail: 'engineer@elsewhere.example' }),
      known({
        taggedTicket: { id: 9, requesterEmail: OWNER, assignedTo: 'engineer@elsewhere.example' },
        senderAuthenticated: true,
        requesterAllowed: false,
      }),
    );
    expect(plan).toMatchObject({ action: 'append', ticketId: 9, as: 'agent' });
  });

  it('does not let a stranger reach a ticket by quoting its number', () => {
    // The tag is not a credential, and being refused the append must not fall
    // through into creating a ticket either.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing', fromEmail: 'stranger@anywhere.example' }),
      known({ taggedTicket: { id: 9, requesterEmail: OWNER }, senderAuthenticated: true, requesterAllowed: false }),
    );
    expect(plan).toMatchObject({ action: 'skip' });
  });
});

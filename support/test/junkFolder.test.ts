import { describe, expect, it } from 'vitest';
import { planInbound } from '../src/inbound.js';
import type { InboundMessage } from '../src/mailer.js';

// Reading the junk folder, and the asymmetry that makes reading it safe.
//
// Not reading it gave Exchange's spam filter a silent veto over which
// customers get support. A misclassified email was not delayed or flagged, it
// was invisible, permanently, with no trace anywhere in this system.
//
// Reading it and answering normally would be the opposite mistake and a worse
// one: the desk would reply to spam from an address that passes SPF, DKIM and
// DMARC for this domain, confirm the mailbox is live to whoever sent it, and
// spend the day's model budget doing it.
//
// So junk is filed and never answered. `planInbound` is deliberately not
// where that happens, because routing a message and deciding whether to talk
// back are different questions and mixing them is how one of them gets
// changed by accident.

const message = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  id: 'AAMkAGabc',
  folder: 'inbox',
  internetMessageId: '<abc@example.com>',
  conversationId: 'conv-1',
  subject: 'Verse will not load',
  fromEmail: 'someone@example.com',
  fromName: 'Someone',
  receivedAt: '2026-08-04T01:00:00Z',
  bodyHtml: '<p>The daily verse is blank today.</p>',
  ...over,
});

const known = (over = {}) => ({
  alreadyProcessed: false,
  taggedTicket: null,
  conversationTicket: null,
  senderAuthenticated: true,
  ...over,
});

describe('a message found in the junk folder', () => {
  it('is still filed, because that is the entire point', () => {
    // The customer whose email Exchange got wrong is the reason this exists.
    // Their message has to become something a person can see.
    const plan = planInbound(message({ folder: 'junk' }), known());
    expect(plan).toMatchObject({ action: 'create' });
  });

  it('is routed exactly like any other message', () => {
    // Routing and replying are separate decisions. planInbound answers "which
    // ticket does this belong to", and the folder has nothing to say about
    // that: a genuine reply misfiled as junk still belongs on its thread.
    const inbox = planInbound(
      message({ subject: 'RE: [HAM-9] thing' }),
      known({ taggedTicket: { id: 9, requesterEmail: 'someone@example.com' } }),
    );
    const junk = planInbound(
      message({ subject: 'RE: [HAM-9] thing', folder: 'junk' }),
      known({ taggedTicket: { id: 9, requesterEmail: 'someone@example.com' } }),
    );
    expect(junk).toEqual(inbox);
    expect(junk).toMatchObject({ action: 'append', ticketId: 9 });
  });

  it('does not get to skip the checks the inbox goes through', () => {
    // Being in junk is not a reason to trust it less *here*, and not a reason
    // to trust it more either. An unauthenticated sender still cannot write
    // on somebody else's ticket.
    const plan = planInbound(
      message({ subject: 'RE: [HAM-9] thing', folder: 'junk' }),
      known({ taggedTicket: { id: 9, requesterEmail: 'someone@example.com' }, senderAuthenticated: false }),
    );
    expect(plan).toMatchObject({ action: 'create' });
  });

  it('is still skipped when it is a machine talking', () => {
    // Bounces land in junk too, and the loop they cause is the same loop.
    const plan = planInbound(
      message({ folder: 'junk', fromEmail: 'postmaster@elsewhere.example', subject: 'Undeliverable: [HAM-9] thing' }),
      known({ taggedTicket: { id: 9, requesterEmail: 'someone@example.com' } }),
    );
    expect(plan.action).toBe('skip');
  });

  it('is still skipped when it is the desk itself', () => {
    const plan = planInbound(message({ folder: 'junk', fromEmail: 'developer@hamdam.com.au' }), known());
    expect(plan.action).toBe('skip');
  });
});

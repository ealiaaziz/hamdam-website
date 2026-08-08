import { describe, expect, it, vi } from 'vitest';
import { carriesUnapprovedContact, composeAssistantReplyLive, type AssistantReplyInput } from '../src/assistantReply.js';
import type { ModelReply } from '../src/assistantModel.js';

// The rules live in code, not in the prompt. These tests are how that claim
// is kept honest: every one of them checks that a guard fires without the
// model being consulted at all, or that a failed call still leaves the
// requester with an answer.

const base: AssistantReplyInput = {
  priority: 'P4',
  conversationText: 'paid but Hamdam Plus is not working, subscription missing',
  assistantTurns: 0,
  askedQuestions: [],
  rejectedArticles: [],
};

function stub(reply: ModelReply | null) {
  return vi.fn(async () => reply);
}

const opts = (generate: ReturnType<typeof stub>) => ({
  ai: {} as Ai,
  ticketSubject: 'Cannot sign in',
  turns: [{ author: 'requester' as const, body: 'cannot sign in' }],
  generate,
});

describe('composeAssistantReplyLive', () => {
  it('uses the model when the guards allow it', async () => {
    const generate = stub({ action: 'answer', body: 'Reopen the app.', articleId: 'purchase-not-appearing', question: null, referenceId: null });
    const r = await composeAssistantReplyLive(base, opts(generate));
    expect(generate).toHaveBeenCalledOnce();
    expect(r.body).toBe('Reopen the app.');
    expect(r.action).toBe('send_solution');
    expect(r.articleId).toBe('purchase-not-appearing');
    expect(r.escalated).toBe(false);
  });

  it('answers a question the knowledge base does not cover', async () => {
    // The whole reason for the model. The old engine met this with "that is
    // outside what I have written down", which is honest and useless.
    const generate = stub({ action: 'answer', body: 'On Windows 11, open Settings, then Accounts.', articleId: null, question: null, referenceId: null });
    const r = await composeAssistantReplyLive(
      { ...base, conversationText: 'how does windows 11 password reset work?' },
      opts(generate),
    );
    expect(generate).toHaveBeenCalledOnce();
    expect(r.body).toContain('Windows 11');
    expect(r.body, 'general knowledge answers say so').toContain('general advice');
    expect(r.escalated).toBe(false);
  });

  it('never asks the model about a P1 or a P2', async () => {
    for (const priority of ['P1', 'P2'] as const) {
      const generate = stub({ action: 'answer', body: 'here you go', articleId: null, question: null, referenceId: null });
      const r = await composeAssistantReplyLive({ ...base, priority }, opts(generate));
      expect(generate, priority).not.toHaveBeenCalled();
      expect(r.escalated, priority).toBe(true);
      expect(r.body.length).toBeGreaterThan(0);
    }
  });

  it('never asks the model once a person has been requested', async () => {
    const generate = stub({ action: 'answer', body: 'here you go', articleId: null, question: null, referenceId: null });
    const r = await composeAssistantReplyLive({ ...base, conversationText: 'can I speak to a human' }, opts(generate));
    expect(generate).not.toHaveBeenCalled();
    expect(r.escalated).toBe(true);
  });

  it('stops at the turn limit rather than letting the model decide when to stop', async () => {
    const generate = stub({ action: 'answer', body: 'one more idea', articleId: null, question: null, referenceId: null });
    const r = await composeAssistantReplyLive({ ...base, assistantTurns: 3 }, opts(generate));
    expect(generate).not.toHaveBeenCalled();
    expect(r.escalated).toBe(true);
  });

  it('withholds rejected articles from the model entirely', async () => {
    const generate = stub({ action: 'escalate', body: 'A person will pick this up.', articleId: null, question: null, referenceId: null });
    await composeAssistantReplyLive({ ...base, rejectedArticles: ['purchase-not-appearing'] }, opts(generate));
    const [, input] = generate.mock.calls[0] as unknown as [string, { articles: { id: string }[]; rejectedTitles: string[] }];
    expect(input.articles.map((a) => a.id)).not.toContain('purchase-not-appearing');
    expect(input.rejectedTitles).toContain('A purchase or subscription is not showing up');
  });

  it('falls back to the written answer when the call fails', async () => {
    // An outage, a rate limit or a bad key must not read as silence: the
    // requester is on the page waiting.
    const generate = vi.fn(async () => {
      throw new Error('503');
    });
    const r = await composeAssistantReplyLive(base, opts(generate as never));
    expect(r.body).toContain('A purchase or subscription is not showing up');
    expect(r.action).toBe('send_solution');
  });

  it('falls back when the model returns something unusable', async () => {
    const r = await composeAssistantReplyLive(base, opts(stub(null)));
    expect(r.body.length).toBeGreaterThan(0);
    expect(r.body).toContain('A purchase or subscription is not showing up');
  });

  it('works with no API key at all', async () => {
    // Local development and CI have no credential, and the desk still has to
    // answer.
    const r = await composeAssistantReplyLive(base, { ticketSubject: 'Cannot sign in', turns: [] });
    expect(r.body).toContain('A purchase or subscription is not showing up');
  });

  it('marks a model escalation as escalated, and records the question on an ask', async () => {
    const escalated = await composeAssistantReplyLive(
      base,
      opts(stub({ action: 'escalate', body: 'I do not have this one.', articleId: null, question: null, referenceId: null })),
    );
    expect(escalated.escalated).toBe(true);
    expect(escalated.action).toBe('escalate');

    const asked = await composeAssistantReplyLive(
      base,
      opts(stub({ action: 'ask', body: 'Which sign-in method are you using?', articleId: null, question: 'Which sign-in method are you using?', referenceId: null })),
    );
    expect(asked.action).toBe('ask_clarifying');
    expect(asked.question).toBe('Which sign-in method are you using?');
    expect(asked.escalated).toBe(false);
  });

  it('records where the answer came from, so a reviewer can tell', async () => {
    const fromArticle = await composeAssistantReplyLive(
      base,
      opts(stub({ action: 'answer', body: 'Reopen it.', articleId: 'purchase-not-appearing', question: null, referenceId: null })),
    );
    expect(fromArticle.reason).toContain('purchase-not-appearing');

    const fromModel = await composeAssistantReplyLive(
      base,
      opts(stub({ action: 'answer', body: 'Reopen it.', articleId: null, question: null, referenceId: null })),
    );
    expect(fromModel.reason).toContain('general knowledge');
  });

  it('answers from the knowledge base once the day\'s budget is spent', async () => {
    // Running out of budget is a spending outcome, not an outage: the ticket
    // is still taken and still answered, in plainer words.
    const generate = stub({ action: 'answer', body: 'model wrote this', articleId: null, question: null, referenceId: null });
    const r = await composeAssistantReplyLive(base, { ...opts(generate), claim: async () => false });
    expect(generate).not.toHaveBeenCalled();
    expect(r.body).toContain('A purchase or subscription is not showing up');
  });

  it('still answers when the budget check itself fails', async () => {
    const generate = stub({ action: 'answer', body: 'model wrote this', articleId: null, question: null, referenceId: null });
    const r = await composeAssistantReplyLive(base, {
      ...opts(generate),
      claim: async () => {
        throw new Error('D1 unavailable');
      },
    });
    expect(generate).not.toHaveBeenCalled();
    expect(r.body.length).toBeGreaterThan(0);
  });

  it('does not spend budget on a ticket the guards already settled', async () => {
    // A P1 must not cost a call: the answer was decided before the model was
    // ever a candidate.
    const claim = vi.fn(async () => true);
    await composeAssistantReplyLive({ ...base, priority: 'P1' }, { ...opts(stub(null)), claim });
    expect(claim).not.toHaveBeenCalled();
  });
});

// The content policy on what the model writes.
//
// Everything above checks that the desk decides *whether* to use the model.
// This checks what happens when it has used it and the answer contains
// something the desk would never publish. The attack is short: a stranger
// writes a ticket, the model reads it, and the reply that comes back tells
// the requester to reset their password at a domain the attacker owns. That
// message then arrives from developer@hamdam.com.au, DKIM-signed, in a thread
// the requester started, which is about as much credibility as a phishing
// link can be given.
describe('unapproved links and addresses in a model reply', () => {
  const hostile = (body: string) => stub({ action: 'answer', body, articleId: 'purchase-not-appearing', question: null, referenceId: null });

  it('throws away an answer carrying a link the desk does not publish', async () => {
    const generate = hostile('Reset it at https://hamdam-support.example/reset and you are done.');
    const r = await composeAssistantReplyLive(base, opts(generate));
    expect(generate).toHaveBeenCalledOnce();
    expect(r.body).not.toContain('hamdam-support.example');
    expect(r.reason).toContain('does not publish');
  });

  it('throws away an answer carrying an address at another domain', async () => {
    const generate = hostile('Email billing@hamdam-help.example and they will sort it.');
    const r = await composeAssistantReplyLive(base, opts(generate));
    expect(r.body).not.toContain('hamdam-help.example');
    expect(r.reason).toContain('does not publish');
  });

  it('covers ask and escalate, not only answer', async () => {
    // The check sits above the action branches deliberately. A planted link
    // reads at least as convincingly inside "a person is picking this up, in
    // the meantime see ..." as it does inside a set of steps.
    for (const action of ['ask', 'escalate'] as const) {
      const generate = stub({ action, body: 'Meanwhile see https://evil.example/fix', articleId: null, question: 'see the link?', referenceId: null });
      const r = await composeAssistantReplyLive({ ...base, conversationText: 'my wifi drops out' }, opts(generate));
      expect(r.body, action).not.toContain('evil.example');
      expect(r.reason, action).toContain('does not publish');
    }
  });

  it('leaves the links the desk does publish alone', async () => {
    const generate = hostile('Apple explains the restore flow at https://support.apple.com/en-au/HT204088, and you can reach us at developer@hamdam.com.au.');
    const r = await composeAssistantReplyLive(base, opts(generate));
    expect(r.body).toContain('support.apple.com');
    expect(r.body).toContain('developer@hamdam.com.au');
    expect(r.reason).not.toContain('does not publish');
  });

  it('leaves Lifeline reachable, because that is the one link that must never be dropped', async () => {
    const generate = stub({ action: 'escalate', body: 'Australia, Lifeline: 13 11 14, or https://www.lifeline.org.au for their web chat.', articleId: null, question: null, referenceId: null });
    const r = await composeAssistantReplyLive({ ...base, conversationText: 'my wifi drops out' }, opts(generate));
    expect(r.body).toContain('lifeline.org.au');
  });

  it('checks the question field as well as the body', async () => {
    // The question is not a summary of the body. It is a separate field the
    // model fills in, and `assistantClarifyingEmail` puts it in the email on
    // its own line in bold, which makes it the highest-attention text in the
    // whole message. Checking only the body left it wide open.
    const generate = stub({
      action: 'ask',
      body: 'One thing would help us narrow this down.',
      articleId: null,
      question: 'Can you confirm your details at https://hamdam-verify.example/login first?',
      referenceId: null,
    });
    const r = await composeAssistantReplyLive({ ...base, conversationText: 'my wifi drops out' }, opts(generate));
    expect(r.question ?? '').not.toContain('hamdam-verify.example');
    expect(r.reason).toContain('does not publish');
  });
});

// The false positives, which are the half of this control that breaks the
// product rather than protecting it.
//
// A blocked reply is not visible as a failure: the requester gets the
// deterministic answer and nobody finds out the model wrote a better one. So
// the cases below are pinned individually, because the way this control dies
// is by quietly refusing more and more ordinary sentences.
describe('what the content policy must not block', () => {
  const answering = (body: string) =>
    stub({ action: 'answer', body, articleId: 'purchase-not-appearing', question: null, referenceId: null });

  it('lets a version pair through, because a slash between numbers is not a host', () => {
    // "iOS 17.4/17.5" parsed as labels-dot-labels-slash and was read as a
    // hostname, so the entire answer was thrown away over a version number.
    // The pattern insists on an alphabetic last label now.
    for (const body of ['This affects iOS 17.4/17.5 only.', 'Fixed in 2.1/2.2 of the app.', 'The ratio was 3.5/10 in testing.']) {
      expect(carriesUnapprovedContact(body), body).toBe(false);
    }
  });

  it('lets the desk repeat an address the requester already gave it', async () => {
    // The most natural sentence a support desk writes, and it was fatal.
    // Nothing new is being introduced: the address came from the requester,
    // two messages up the same thread.
    const generate = answering('Understood. I will follow up at jane.doe@gmail.com once the receipt comes through.');
    const r = await composeAssistantReplyLive(
      { ...base, conversationText: 'paid but Hamdam Plus is not working. my other address is jane.doe@gmail.com' },
      opts(generate),
    );
    expect(r.body).toContain('jane.doe@gmail.com');
    expect(r.reason).not.toContain('does not publish');
  });

  it('still refuses an address the requester never mentioned', async () => {
    // The other half of the same rule, and the reason the rule is "already in
    // the thread" rather than "any address at all".
    const generate = answering('Email billing@hamdam-help.example and they will sort it.');
    const r = await composeAssistantReplyLive(
      { ...base, conversationText: 'paid but Hamdam Plus is not working. my other address is jane.doe@gmail.com' },
      opts(generate),
    );
    expect(r.body).not.toContain('hamdam-help.example');
    expect(r.reason).toContain('does not publish');
  });

  it('allows an address on a subdomain of the desk, the same as it allows a link to one', () => {
    // Links to support.apple.com were fine while an address at
    // support.hamdam.com.au was a forgery, which is the rule disagreeing with
    // itself about the desk's own domain.
    expect(carriesUnapprovedContact('Write to help@support.hamdam.com.au and we will pick it up.')).toBe(false);
  });
});

// A Hamdam claim needs a source whether or not a handover is attached to it.
describe('the sourcing rule on an escalation', () => {
  it('refuses an unsourced Hamdam escalation, the same as an unsourced answer', async () => {
    // The prompt asks for a full escalation: everything you do know, then the
    // part you do not. That means an escalation body carries product claims,
    // in the same confident register as an answer, and sourcing only 'answer'
    // let every one of them through as long as a handover sentence followed.
    const generate = stub({ action: 'escalate', body: 'Hamdam Plus is bought from the account screen. A person will confirm.', articleId: null, question: null, referenceId: null });
    const r = await composeAssistantReplyLive({ ...base, topic: 'hamdam' }, opts(generate));
    expect(r.body).not.toContain('account screen');
    expect(r.reason).toContain('general knowledge');
    expect(r.escalated).toBe(true);
  });

  it('still lets an unsourced clarifying question through, because a question asserts nothing', async () => {
    const generate = stub({ action: 'ask', body: 'Which iPhone model are you on?', articleId: null, question: 'Which iPhone model are you on?', referenceId: null });
    const r = await composeAssistantReplyLive({ ...base, topic: 'hamdam' }, opts(generate));
    expect(r.body).toBe('Which iPhone model are you on?');
    expect(r.action).toBe('ask_clarifying');
  });

  it('lets a sourced escalation through untouched', async () => {
    const generate = stub({ action: 'escalate', body: 'Here is what the article says. The rest needs a person.', articleId: 'purchase-not-appearing', question: null, referenceId: null });
    const r = await composeAssistantReplyLive({ ...base, topic: 'hamdam' }, opts(generate));
    expect(r.body).toContain('needs a person');
    expect(r.articleId).toBe('purchase-not-appearing');
  });
});

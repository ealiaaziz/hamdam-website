import { describe, expect, it, vi } from 'vitest';
import { composeAssistantReplyLive, type AssistantReplyInput } from '../src/assistantReply.js';
import type { ModelReply } from '../src/assistantModel.js';

// The rules live in code, not in the prompt. These tests are how that claim
// is kept honest: every one of them checks that a guard fires without the
// model being consulted at all, or that a failed call still leaves the
// requester with an answer.

const base: AssistantReplyInput = {
  priority: 'P4',
  conversationText: 'cannot sign in, password not working',
  assistantTurns: 0,
  askedQuestions: [],
  rejectedArticles: [],
};

function stub(reply: ModelReply | null) {
  return vi.fn(async () => reply);
}

const opts = (generate: ReturnType<typeof stub>) => ({
  apiKey: 'test-key',
  ticketSubject: 'Cannot sign in',
  turns: [{ author: 'requester' as const, body: 'cannot sign in' }],
  generate,
});

describe('composeAssistantReplyLive', () => {
  it('uses the model when the guards allow it', async () => {
    const generate = stub({ action: 'answer', body: 'Reopen the app.', articleId: 'cannot-sign-in', question: null });
    const r = await composeAssistantReplyLive(base, opts(generate));
    expect(generate).toHaveBeenCalledOnce();
    expect(r.body).toBe('Reopen the app.');
    expect(r.action).toBe('send_solution');
    expect(r.articleId).toBe('cannot-sign-in');
    expect(r.escalated).toBe(false);
  });

  it('answers a question the knowledge base does not cover', async () => {
    // The whole reason for the model. The old engine met this with "that is
    // outside what I have written down", which is honest and useless.
    const generate = stub({ action: 'answer', body: 'On Windows 11, open Settings, then Accounts.', articleId: null, question: null });
    const r = await composeAssistantReplyLive(
      { ...base, conversationText: 'how does windows 11 password reset work?' },
      opts(generate),
    );
    expect(generate).toHaveBeenCalledOnce();
    expect(r.body).toContain('Windows 11');
    expect(r.escalated).toBe(false);
  });

  it('never asks the model about a P1 or a P2', async () => {
    for (const priority of ['P1', 'P2'] as const) {
      const generate = stub({ action: 'answer', body: 'here you go', articleId: null, question: null });
      const r = await composeAssistantReplyLive({ ...base, priority }, opts(generate));
      expect(generate, priority).not.toHaveBeenCalled();
      expect(r.escalated, priority).toBe(true);
      expect(r.body.length).toBeGreaterThan(0);
    }
  });

  it('never asks the model once a person has been requested', async () => {
    const generate = stub({ action: 'answer', body: 'here you go', articleId: null, question: null });
    const r = await composeAssistantReplyLive({ ...base, conversationText: 'can I speak to a human' }, opts(generate));
    expect(generate).not.toHaveBeenCalled();
    expect(r.escalated).toBe(true);
  });

  it('stops at the turn limit rather than letting the model decide when to stop', async () => {
    const generate = stub({ action: 'answer', body: 'one more idea', articleId: null, question: null });
    const r = await composeAssistantReplyLive({ ...base, assistantTurns: 3 }, opts(generate));
    expect(generate).not.toHaveBeenCalled();
    expect(r.escalated).toBe(true);
  });

  it('withholds rejected articles from the model entirely', async () => {
    const generate = stub({ action: 'escalate', body: 'A person will pick this up.', articleId: null, question: null });
    await composeAssistantReplyLive({ ...base, rejectedArticles: ['cannot-sign-in'] }, opts(generate));
    const [, input] = generate.mock.calls[0] as unknown as [string, { articles: { id: string }[]; rejectedTitles: string[] }];
    expect(input.articles.map((a) => a.id)).not.toContain('cannot-sign-in');
    expect(input.rejectedTitles).toContain('Cannot sign in to the Hamdam app');
  });

  it('falls back to the written answer when the call fails', async () => {
    // An outage, a rate limit or a bad key must not read as silence: the
    // requester is on the page waiting.
    const generate = vi.fn(async () => {
      throw new Error('503');
    });
    const r = await composeAssistantReplyLive(base, opts(generate as never));
    expect(r.body).toContain('Cannot sign in to the Hamdam app');
    expect(r.action).toBe('send_solution');
  });

  it('falls back when the model returns something unusable', async () => {
    const r = await composeAssistantReplyLive(base, opts(stub(null)));
    expect(r.body.length).toBeGreaterThan(0);
    expect(r.body).toContain('Cannot sign in to the Hamdam app');
  });

  it('works with no API key at all', async () => {
    // Local development and CI have no credential, and the desk still has to
    // answer.
    const r = await composeAssistantReplyLive(base, { ticketSubject: 'Cannot sign in', turns: [] });
    expect(r.body).toContain('Cannot sign in to the Hamdam app');
  });

  it('marks a model escalation as escalated, and records the question on an ask', async () => {
    const escalated = await composeAssistantReplyLive(
      base,
      opts(stub({ action: 'escalate', body: 'I do not have this one.', articleId: null, question: null })),
    );
    expect(escalated.escalated).toBe(true);
    expect(escalated.action).toBe('escalate');

    const asked = await composeAssistantReplyLive(
      base,
      opts(stub({ action: 'ask', body: 'Which sign-in method are you using?', articleId: null, question: 'Which sign-in method are you using?' })),
    );
    expect(asked.action).toBe('ask_clarifying');
    expect(asked.question).toBe('Which sign-in method are you using?');
    expect(asked.escalated).toBe(false);
  });

  it('records where the answer came from, so a reviewer can tell', async () => {
    const fromArticle = await composeAssistantReplyLive(
      base,
      opts(stub({ action: 'answer', body: 'Reopen it.', articleId: 'cannot-sign-in', question: null })),
    );
    expect(fromArticle.reason).toContain('cannot-sign-in');

    const fromModel = await composeAssistantReplyLive(
      base,
      opts(stub({ action: 'answer', body: 'Reopen it.', articleId: null, question: null })),
    );
    expect(fromModel.reason).toContain('general knowledge');
  });

  it('answers from the knowledge base once the day\'s budget is spent', async () => {
    // Running out of budget is a spending outcome, not an outage: the ticket
    // is still taken and still answered, in plainer words.
    const generate = stub({ action: 'answer', body: 'model wrote this', articleId: null, question: null });
    const r = await composeAssistantReplyLive(base, { ...opts(generate), claim: async () => false });
    expect(generate).not.toHaveBeenCalled();
    expect(r.body).toContain('Cannot sign in to the Hamdam app');
  });

  it('still answers when the budget check itself fails', async () => {
    const generate = stub({ action: 'answer', body: 'model wrote this', articleId: null, question: null });
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

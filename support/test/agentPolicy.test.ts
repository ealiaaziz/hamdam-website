import { describe, expect, it } from 'vitest';
import { decideAgentAction, requestedAHuman, MAX_ASSISTANT_TURNS, type AgentContext } from '../src/agentPolicy.js';
import { matchArticles, CONFIDENT_HITS } from '../src/kb.js';

// These tests are the specification for what the assistant may do to a
// requester. Each guard gets a case asserting it holds even when everything
// else points the other way, because the dangerous failure is a rule that
// only applies when nothing is pushing against it.

const base: AgentContext = {
  priority: 'P4',
  conversationText: '',
  assistantTurns: 0,
  askedQuestions: [],
};

describe('requestedAHuman', () => {
  it('recognises the ways people ask for a person', () => {
    for (const text of [
      'can I speak to a human please',
      'I want to talk to someone',
      'is this a bot?',
      'STOP REPLYING',
      'get me a real person',
    ]) {
      expect(requestedAHuman(text)).toBe(true);
    }
  });

  it('does not fire on ordinary text', () => {
    expect(requestedAHuman('the app will not load my daily verse')).toBe(false);
  });
});

describe('decideAgentAction', () => {
  it('sends a solution on a confident match', () => {
    const r = decideAgentAction({ ...base, conversationText: "paid but Hamdam Plus is not working, subscription missing" });
    expect(r.action).toBe('send_solution');
    if (r.action === 'send_solution') expect(r.articleId).toBe('purchase-not-appearing');
  });

  it('asks a clarifying question on a partial match', () => {
    const r = decideAgentAction({ ...base, conversationText: 'restore purchase' });
    expect(r.action).toBe('ask_clarifying');
    if (r.action === 'ask_clarifying') expect(r.question.length).toBeGreaterThan(0);
  });

  it('escalates when nothing matches, rather than improvising', () => {
    const r = decideAgentAction({ ...base, conversationText: 'my cat walked across the keyboard' });
    expect(r.action).toBe('escalate');
  });

  // --- the guards, each tested against a case that would otherwise proceed

  it('escalates a request for a human even with a confident match', () => {
    const r = decideAgentAction({
      ...base,
      conversationText: "paid but Hamdam Plus is not working, subscription missing -- can I speak to a human",
    });
    expect(r.action).toBe('escalate');
    if (r.action === 'escalate') expect(r.reason).toContain('asked for a person');
  });

  it('never handles P1, even with a confident match', () => {
    const r = decideAgentAction({
      ...base,
      priority: 'P1',
      conversationText: 'paid but Hamdam Plus is not working, subscription missing',
    });
    expect(r.action).toBe('escalate');
  });

  it('never handles P2, even with a confident match', () => {
    const r = decideAgentAction({
      ...base,
      priority: 'P2',
      conversationText: 'paid but Hamdam Plus is not working, subscription missing',
    });
    expect(r.action).toBe('escalate');
  });

  it('escalates at the turn limit even with a confident match', () => {
    const r = decideAgentAction({
      ...base,
      assistantTurns: MAX_ASSISTANT_TURNS,
      conversationText: 'paid but Hamdam Plus is not working, subscription missing',
    });
    expect(r.action).toBe('escalate');
    if (r.action === 'escalate') expect(r.reason).toContain('turns');
  });

  it('escalates rather than repeating a clarifying question it already asked', () => {
    const first = decideAgentAction({ ...base, conversationText: 'restore purchase' });
    expect(first.action).toBe('ask_clarifying');
    if (first.action !== 'ask_clarifying') return;

    const second = decideAgentAction({
      ...base,
      conversationText: 'restore purchase',
      assistantTurns: 1,
      askedQuestions: [first.question],
    });
    // The article has more than one question, so it asks the next one; the
    // guarantee under test is only that it never repeats itself.
    if (second.action === 'ask_clarifying') {
      expect(second.question).not.toBe(first.question);
    } else {
      expect(second.action).toBe('escalate');
    }
  });

  it('always returns an explicit action, never falls through silently', () => {
    for (const text of ['', 'aaaa', 'cannot sign in', 'verse not loading blank verse']) {
      for (const priority of ['P1', 'P2', 'P3', 'P4'] as const) {
        for (const turns of [0, 1, MAX_ASSISTANT_TURNS]) {
          const r = decideAgentAction({ ...base, priority, conversationText: text, assistantTurns: turns });
          expect(['send_solution', 'ask_clarifying', 'escalate']).toContain(r.action);
        }
      }
    }
  });
});

describe('matchArticles', () => {
  it('treats a tie between two articles as partial, not confident', () => {
    // Knowing it is one of two problems is not knowing which.
    const r = matchArticles('cannot sign in verse not loading');
    expect(r.confidence).not.toBe('confident');
  });

  it('needs more than one symptom before calling a match confident', () => {
    const single = matchArticles('reminder time');
    expect(single.best?.hits).toBeLessThan(CONFIDENT_HITS);
    expect(single.confidence).toBe('partial');
  });

  it('returns none when the text is unrelated to every article', () => {
    expect(matchArticles('the weather is nice today').confidence).toBe('none');
  });
});

import { describe, expect, it } from 'vitest';
import { APP_REFERENCE, KB_ARTICLES } from '../src/kb.js';
import { buildSystemPrompt } from '../src/assistantModel.js';

// The knowledge base this replaced described a sign-in screen the app does
// not have, and told people to check their internet connection for verses
// that are bundled and work offline. Both were offered to real requesters.
// These tests are the guard against that class of mistake coming back.

describe('app reference', () => {
  it('every entry cites where its facts came from', () => {
    expect(APP_REFERENCE.length).toBeGreaterThan(0);
    for (const entry of APP_REFERENCE) {
      expect(entry.source, entry.id).toMatch(/\.(astro|md)/);
      expect(entry.body.length, entry.id).toBeGreaterThan(50);
    }
  });

  it('states the two facts the old knowledge base got backwards', () => {
    const all = APP_REFERENCE.map((r) => r.body).join('\n').toLowerCase();
    expect(all, 'the app has no accounts').toContain('no user accounts');
    expect(all, 'verses are bundled, not fetched').toContain('needs no network');
  });

  it('carries the crisis numbers verbatim from the terms', () => {
    const crisis = APP_REFERENCE.find((r) => r.id === 'wellbeing-boundaries');
    expect(crisis).toBeDefined();
    expect(crisis!.body).toContain('13 11 14');
    expect(crisis!.body).toContain('000');
  });

  it('no article tells someone to sign in to Hamdam', () => {
    // There is nowhere for them to do it.
    for (const article of KB_ARTICLES) {
      expect(article.steps.toLowerCase(), article.id).not.toMatch(/sign in to hamdam|log in to hamdam|your hamdam password/);
    }
  });
});

describe('buildSystemPrompt with reference', () => {
  const prompt = buildSystemPrompt(KB_ARTICLES);

  it('carries every reference entry, so nothing silently drops out', () => {
    for (const entry of APP_REFERENCE) {
      expect(prompt, entry.id).toContain(entry.title);
    }
  });

  it('tells the model to answer product questions from the reference', () => {
    expect(prompt).toContain('<how_hamdam_works>');
    expect(prompt).toContain('how does X work');
  });

  it('warns against the assumptions that would be wrong here', () => {
    expect(prompt).toContain('no accounts and no sign in');
    expect(prompt).toContain('bundled and work offline');
  });

  it('gives the crisis instruction before the action rules', () => {
    // Ordering matters: it has to read as overriding the troubleshooting
    // flow, not as one more consideration among several.
    expect(prompt.indexOf('SOMEONE IN CRISIS')).toBeGreaterThan(-1);
    expect(prompt.indexOf('SOMEONE IN CRISIS')).toBeLessThan(prompt.indexOf('CHOOSING AN ACTION'));
    expect(prompt).toContain('13 11 14');
  });

  it('forbids quoting a price', () => {
    expect(prompt).toContain('Any price.');
  });
});

describe('Hamdam questions are never answered from general knowledge', () => {
  // Live failure: "where do I buy Hamdam Plus" was answered twice from the
  // model's own guesses. First with the App Store restore flow, which buys
  // nothing, then with "go to the app's settings or a similar section where
  // purchases are usually available, however the exact steps may vary",
  // which is the model saying it does not know in a register that reads as
  // though it does.
  it('refuses an answer with no source and hands over instead', async () => {
    const { composeAssistantReplyLive } = await import('../src/assistantReply.js');
    const { vi } = await import('vitest');
    const generate = vi.fn(async () => ({
      action: 'answer' as const,
      body: 'You can probably find it in the app settings somewhere.',
      articleId: null,
      referenceId: null,
      question: null,
    }));

    const r = await composeAssistantReplyLive(
      {
        priority: 'P3',
        conversationText: 'where do I buy Hamdam Plus?',
        assistantTurns: 0,
        askedQuestions: [],
        rejectedArticles: [],
        topic: 'hamdam',
      },
      { ai: {} as Ai, ticketSubject: 'Buying Plus', turns: [], generate },
    );

    expect(r.escalated).toBe(true);
    expect(r.body).toContain('do not have it written down');
    expect(r.body).not.toContain('app settings somewhere');
  });

  it('still allows a general IT ticket to be answered from general knowledge', async () => {
    const { composeAssistantReplyLive } = await import('../src/assistantReply.js');
    const { vi } = await import('vitest');
    const generate = vi.fn(async () => ({
      action: 'answer' as const,
      body: 'On Windows 11, open Settings, then Accounts.',
      articleId: null,
      referenceId: null,
      question: null,
    }));

    const r = await composeAssistantReplyLive(
      {
        priority: 'P4',
        conversationText: 'how does windows 11 password reset work?',
        assistantTurns: 0,
        askedQuestions: [],
        rejectedArticles: [],
        topic: 'general_it',
      },
      { ai: {} as Ai, ticketSubject: 'Windows', turns: [], generate },
    );

    expect(r.escalated).toBe(false);
    expect(r.body).toContain('Windows 11');
  });

  it('still lets it ask a clarifying question, which asserts nothing', async () => {
    const { composeAssistantReplyLive } = await import('../src/assistantReply.js');
    const { vi } = await import('vitest');
    const generate = vi.fn(async () => ({
      action: 'ask' as const,
      body: 'Which iPhone model are you on?',
      articleId: null,
      referenceId: null,
      question: 'Which iPhone model are you on?',
    }));

    const r = await composeAssistantReplyLive(
      {
        priority: 'P3',
        conversationText: 'reflections feel generic',
        assistantTurns: 0,
        askedQuestions: [],
        rejectedArticles: [],
        topic: 'hamdam',
      },
      { ai: {} as Ai, ticketSubject: 'Reflections', turns: [], generate },
    );

    expect(r.action).toBe('ask_clarifying');
    expect(r.escalated).toBe(false);
  });
});

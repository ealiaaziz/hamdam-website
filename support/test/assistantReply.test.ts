import { describe, expect, it } from 'vitest';
import { composeAssistantReply, ASSISTANT_NAME, type AssistantReplyInput } from '../src/assistantReply.js';

// Written against what HAM-3 actually did to a requester: the same article
// offered three times after three rejections, and a real follow-up question
// answered with silence.

const base: AssistantReplyInput = {
  priority: 'P4',
  conversationText: '',
  assistantTurns: 0,
  askedQuestions: [],
  rejectedArticles: [],
};

describe('composeAssistantReply', () => {
  it('always produces a reply, so the requester never gets silence', () => {
    for (const text of ['', 'aaaa', 'cannot sign in', 'does it have a sign in option?']) {
      for (const priority of ['P1', 'P2', 'P3', 'P4'] as const) {
        const r = composeAssistantReply({ ...base, priority, conversationText: text });
        expect(r.body.length, `${priority} / ${text}`).toBeGreaterThan(0);
      }
    }
  });

  it('offers a matching article', () => {
    const r = composeAssistantReply({ ...base, conversationText: 'cannot sign in, password not working' });
    expect(r.action).toBe('send_solution');
    expect(r.body).toContain('Cannot sign in to the Hamdam app');
  });

  it('never re-offers an article the requester rejected', () => {
    // The HAM-3 bug, as an assertion.
    const r = composeAssistantReply({
      ...base,
      conversationText: 'cannot sign in, password not working',
      rejectedArticles: ['cannot-sign-in'],
    });
    expect(r.articleId).not.toBe('cannot-sign-in');
    expect(r.body).not.toContain('Cannot sign in to the Hamdam app');
  });

  it('admits it is out of ideas once everything has been rejected', () => {
    const r = composeAssistantReply({
      ...base,
      conversationText: 'cannot sign in, password not working',
      rejectedArticles: ['cannot-sign-in', 'verse-not-loading', 'change-notification-time'],
    });
    expect(r.action).toBe('escalate');
    expect(r.escalated).toBe(true);
    expect(r.body).toContain('run out of things I know to try');
  });

  it('says it does not know, rather than nothing, when no article matches', () => {
    const r = composeAssistantReply({ ...base, conversationText: 'my cat sat on the keyboard' });
    expect(r.action).toBe('escalate');
    expect(r.body).toContain('outside what I have written down');
    expect(r.body).toContain('passing it to a person');
  });

  it('does not repeat the handover once it has already handed over', () => {
    // Seen live: the identical "handing it to a person" paragraph came back
    // twice in a row, which reads as a stuck machine rather than an honest
    // one.
    const first = composeAssistantReply({ ...base, conversationText: 'unknown topic' });
    const second = composeAssistantReply({ ...base, conversationText: 'another unknown topic', alreadyEscalated: true });
    expect(second.body).not.toBe(first.body);
    expect(second.body).toContain('already with a person');
  });

  it('does not claim to be out of ideas about a topic it never had ideas for', () => {
    // Live failure: a rejection on the sign-in thread made a brand new
    // question -- Windows 11 password reset -- come back as "I have run out
    // of things I know to try", which was true of neither the question nor
    // the assistant.
    const r = composeAssistantReply({
      ...base,
      conversationText: 'do you know how windows 11 password reset works?',
      rejectedArticles: ['cannot-sign-in'],
    });
    expect(r.body).not.toContain('run out of things');
    expect(r.body).toContain('outside what I have written down');
  });

  it('still says it is out of ideas when the topic did match and was rejected', () => {
    const r = composeAssistantReply({
      ...base,
      conversationText: 'cannot sign in, password not working',
      rejectedArticles: ['cannot-sign-in'],
    });
    expect(r.body).toContain('run out of things');
  });

  it('escalates visibly on P1 rather than going quiet', () => {
    const r = composeAssistantReply({ ...base, priority: 'P1', conversationText: 'cannot sign in, password not working' });
    expect(r.escalated).toBe(true);
    expect(r.body.length).toBeGreaterThan(0);
  });

  it('hands over when asked for a person, and says so', () => {
    const r = composeAssistantReply({ ...base, conversationText: 'can I speak to a human' });
    expect(r.escalated).toBe(true);
    expect(r.body).toContain('person');
  });

  it('never claims to be a person', () => {
    expect(ASSISTANT_NAME).toContain('automated');
    for (const text of ['cannot sign in, password not working', 'locked out', 'nonsense']) {
      const r = composeAssistantReply({ ...base, conversationText: text });
      expect(r.body).not.toMatch(/\bI have looked into\b|\bour engineer\b|\bI checked your account\b/i);
    }
  });

  it('only ever quotes steps from the matched article', () => {
    const r = composeAssistantReply({ ...base, conversationText: 'cannot sign in, password not working' });
    expect(r.body).toContain('Close the app fully and reopen it');
    expect(r.body).not.toContain('reinstall');
  });
});

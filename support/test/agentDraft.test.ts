import { describe, expect, it } from 'vitest';
import { proposeDraft, type DraftInput } from '../src/agentDraft.js';
import { stripHtml } from '../src/ids.js';

const base: DraftInput = {
  ticketId: 42,
  ticketSubject: 'Cannot sign in',
  requesterName: 'Jane Doe',
  trackingUrl: 'https://support.hamdam.com.au/tickets/42?token=abc',
  priority: 'P4',
  conversationText: '',
  assistantTurns: 0,
  askedQuestions: [],
};

describe('proposeDraft', () => {
  it('drafts a solution for a confident match', () => {
    const d = proposeDraft({ ...base, conversationText: 'cannot sign in, password not working' });
    expect(d).not.toBeNull();
    expect(d?.action).toBe('send_solution');
    expect(d?.subject).toBe('[HAM-42] Cannot sign in');
    expect(d?.bodyHtml).toContain('Hi Jane,');
  });

  it('drafts a question for a partial match', () => {
    const d = proposeDraft({ ...base, conversationText: 'locked out' });
    expect(d?.action).toBe('ask_clarifying');
    expect(d?.question).toBeTruthy();
  });

  it('returns null rather than drafting when nothing matches', () => {
    expect(proposeDraft({ ...base, conversationText: 'my cat sat on the keyboard' })).toBeNull();
  });

  // The guards matter more here than anywhere else: this output is an email
  // addressed to a real person, and a draft that should not exist is one
  // approval click away from being sent.

  it('never drafts on a P1, even with a confident match', () => {
    expect(proposeDraft({ ...base, priority: 'P1', conversationText: 'cannot sign in, password not working' })).toBeNull();
  });

  it('never drafts on a P2, even with a confident match', () => {
    expect(proposeDraft({ ...base, priority: 'P2', conversationText: 'cannot sign in, password not working' })).toBeNull();
  });

  it('never drafts once the requester has asked for a person', () => {
    expect(
      proposeDraft({ ...base, conversationText: 'cannot sign in, password not working. can I speak to a human' }),
    ).toBeNull();
  });

  it('never drafts past the turn limit', () => {
    expect(
      proposeDraft({ ...base, assistantTurns: 3, conversationText: 'cannot sign in, password not working' }),
    ).toBeNull();
  });

  it('only ever contains steps from the matched article', () => {
    // The core promise of the design: content comes from a reviewed article,
    // never from invention. If the body contains a sentence the article does
    // not, something has started composing rather than quoting.
    const d = proposeDraft({ ...base, conversationText: 'cannot sign in, password not working' });
    expect(d?.bodyHtml).toContain('Close the app fully and reopen it');
    expect(d?.bodyHtml).not.toContain('reinstall');
    expect(d?.bodyHtml).not.toContain('delete');
  });
});

describe('stripHtml', () => {
  it('turns a draft body into readable thread text', () => {
    const text = stripHtml('<p>Hi Jane,</p><ol><li>Close the app</li><li>Reopen it</li></ol>');
    expect(text).toContain('Hi Jane,');
    expect(text).toContain('- Close the app');
    expect(text).not.toContain('<');
  });

  it('decodes the entities the email templates emit', () => {
    expect(stripHtml('<p>a &amp; b &middot; c</p>')).toBe('a & b . c');
  });
});

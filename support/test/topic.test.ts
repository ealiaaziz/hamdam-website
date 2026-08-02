import { describe, expect, it } from 'vitest';
import { applyTopicFloor, classifyTicket, detectTopic, HAMDAM_PRIORITY_FLOOR } from '../src/itil.js';

// The desk answers general computing questions as a courtesy and Hamdam
// questions as its job. Both get answered. Only one of them sets a clock that
// starts before anyone has looked at it.

describe('detectTopic', () => {
  it('reads app questions as Hamdam', () => {
    for (const text of [
      'The Hamdam app crashes on launch',
      'my daily verse is blank',
      'How do I change the daily reminder?',
      'Can I turn off cycle awareness?',
      'my streak reset overnight',
      'Does Hamdam Plus include iCloud sync?',
      'the Rumi translation looks wrong',
    ]) {
      expect(detectTopic(text), text).toBe('hamdam');
    }
  });

  it('reads everything else as general IT', () => {
    for (const text of [
      'How does Windows 11 password reset work?',
      'My printer keeps dropping off the wifi',
      'Outlook will not send attachments',
      'how do I clear cache in Safari',
    ]) {
      expect(detectTopic(text), text).toBe('general_it');
    }
  });
});

describe('applyTopicFloor', () => {
  it('lifts a Hamdam ticket to the floor and no further', () => {
    expect(applyTopicFloor('P4', 'hamdam')).toBe(HAMDAM_PRIORITY_FLOOR);
    expect(applyTopicFloor('P3', 'hamdam')).toBe('P3');
  });

  it('never lowers a ticket that was already rated higher', () => {
    // The floor raises. A P1 Hamdam ticket stays a P1.
    expect(applyTopicFloor('P1', 'hamdam')).toBe('P1');
    expect(applyTopicFloor('P2', 'hamdam')).toBe('P2');
  });

  it('leaves general IT exactly where the matrix put it', () => {
    for (const p of ['P1', 'P2', 'P3', 'P4'] as const) {
      expect(applyTopicFloor(p, 'general_it')).toBe(p);
    }
  });
});

describe('classifyTicket', () => {
  it('floors a mildly described Hamdam problem at P3', () => {
    // Low impact and low urgency is P4 on the matrix. It is still the app.
    const r = classifyTicket('low', 'low', 'My daily verse is blank sometimes, no rush');
    expect(r.topic).toBe('hamdam');
    expect(r.priority).toBe('P3');
    expect(r.floored).toBe(true);
  });

  it('leaves an equally mild general question at P4', () => {
    const r = classifyTicket('low', 'low', 'How does Windows 11 password reset work?');
    expect(r.topic).toBe('general_it');
    expect(r.priority).toBe('P4');
    expect(r.floored).toBe(false);
  });

  it('does not touch a Hamdam ticket the matrix already rated urgent', () => {
    const r = classifyTicket('high', 'high', 'Hamdam is down for everyone');
    expect(r.priority).toBe('P1');
    expect(r.floored).toBe(false);
  });
});

describe('article symptoms do not reach past this desk', () => {
  // A Windows 11 password question matched the Hamdam purchase article on
  // "locked out" and came back asking which Apple ID they bought with. The
  // symptom list was describing a feeling, not this product.
  it('leaves general computing questions unmatched', async () => {
    const { matchArticles } = await import('../src/kb.js');
    for (const text of [
      'How does Windows 11 password reset work? I am locked out of my work laptop.',
      'I cannot sign in to my work email',
      'my printer will not connect',
    ]) {
      expect(matchArticles(text).confidence, text).toBe('none');
    }
  });

  it('still matches the app problem it is for', () => {
    return import('../src/kb.js').then(({ matchArticles }) => {
      const m = matchArticles('I paid but Hamdam Plus is not working after restore purchase');
      expect(m.best?.article.id).toBe('purchase-not-appearing');
    });
  });
});

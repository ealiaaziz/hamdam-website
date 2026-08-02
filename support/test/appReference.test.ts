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

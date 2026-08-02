import { describe, expect, it } from 'vitest';
import { renderSteps, suggestionBlock } from '../src/render/agentSuggestion.js';
import { KB_ARTICLES } from '../src/kb.js';

describe('renderSteps', () => {
  it('keeps a wrapped list item in one <li>', () => {
    // The bug this exists for: articles wrap their steps across lines, and
    // requiring every line to be numbered collapsed the entire list into a
    // paragraph with "2." and "3." buried mid-sentence.
    const html = renderSteps('1. Close the app fully\n   and reopen it.\n2. Check the connection.');
    expect(html).toBe('<ol><li>Close the app fully and reopen it.</li><li>Check the connection.</li></ol>');
  });

  it('renders an ordered list for numbered blocks', () => {
    expect(renderSteps('1. One\n2. Two')).toBe('<ol><li>One</li><li>Two</li></ol>');
  });

  it('renders prose as a paragraph', () => {
    expect(renderSteps('Just some advice.')).toBe('<p>Just some advice.</p>');
  });

  it('handles a list followed by a closing paragraph', () => {
    const html = renderSteps('1. Do this\n2. Then that\n\nIf that fails, reply here.');
    expect(html).toContain('<ol><li>Do this</li><li>Then that</li></ol>');
    expect(html).toContain('<p>If that fails, reply here.</p>');
  });

  it('escapes article text rather than trusting it', () => {
    expect(renderSteps('1. Use <script>alert(1)</script>')).toContain('&lt;script&gt;');
  });

  it('every shipped article renders its steps as a list', () => {
    // Guards against an article being authored in a shape the renderer
    // silently flattens, which is exactly how the original bug reached
    // production unnoticed.
    for (const article of KB_ARTICLES) {
      expect(renderSteps(article.steps), article.id).toContain('<ol>');
    }
  });
});

describe('suggestionBlock', () => {
  const article = KB_ARTICLES[0];

  it('offers rejection alongside acceptance', () => {
    const html = suggestionBlock({ article, ticketId: 1, token: 'tok', confidence: 'confident' });
    expect(html).toContain('value="solved"');
    expect(html).toContain('value="unresolved"');
  });

  it('hedges a partial match more than a confident one', () => {
    const confident = suggestionBlock({ article, ticketId: 1, token: 'tok', confidence: 'confident' });
    const partial = suggestionBlock({ article, ticketId: 1, token: 'tok', confidence: 'partial' });
    expect(confident).toContain('seen before');
    expect(partial).toContain('may or may not be your problem');
  });

  it('encodes the token into the form action', () => {
    const html = suggestionBlock({ article, ticketId: 7, token: 'a+b/c', confidence: 'partial' });
    expect(html).toContain('/tickets/7/feedback?token=a%2Bb%2Fc');
  });
});

import { escapeHtml } from '../ids.js';
import type { KbArticle } from '../kb.js';

// The suggestion shown on the tracking page.
//
// This is the fast half of the solution engine. Matching and policy are pure
// bundled code with no model in them, so a portal request can be answered
// inside the same HTTP response -- the requester reads the answer while they
// are still on the page, rather than in an email an hour later.
//
// It is framed as a suggestion, not an answer, and the "still need help"
// control is given equal weight to "this fixed it". A requester who is shown
// a wrong article and offered only a cheerful dismissal will click it and
// leave, and the desk will record a resolution that never happened.

const NUMBERED = /^\d+\.\s/;

/**
 * Markdown-ish article body to HTML: numbered steps and paragraphs only.
 *
 * A list item may wrap onto continuation lines, which is how the articles
 * are actually written -- an earlier version tested that *every* line in a
 * block began with a number, so any wrapped step collapsed the whole list
 * into a single run-on paragraph. Live, that turned a four-step fix into a
 * wall of text with "2." and "3." buried mid-sentence. A block is a list if
 * its *first* line is numbered; unnumbered lines after that belong to the
 * item above.
 */
export function renderSteps(steps: string): string {
  return steps
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return '';

      if (!NUMBERED.test(lines[0])) {
        return `<p>${escapeHtml(lines.join(' '))}</p>`;
      }

      const items: string[] = [];
      for (const line of lines) {
        if (NUMBERED.test(line)) items.push(line.replace(NUMBERED, ''));
        else if (items.length > 0) items[items.length - 1] += ` ${line}`;
        else items.push(line);
      }
      return `<ol>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ol>`;
    })
    .filter(Boolean)
    .join('\n');
}

export function suggestionBlock(opts: {
  article: KbArticle;
  ticketId: number;
  token: string;
  /** Partial matches are offered more tentatively than confident ones. */
  confidence: 'confident' | 'partial';
}): string {
  const lead =
    opts.confidence === 'confident'
      ? 'This looks like something we have seen before. Try this while you wait:'
      : 'This might be related. It may or may not be your problem, so treat it as a starting point:';

  return `
<div class="card suggest">
  <p class="suggest-lead">${escapeHtml(lead)}</p>
  <h2 class="suggest-title">${escapeHtml(opts.article.title)}</h2>
  <div class="suggest-body">${renderSteps(opts.article.steps)}</div>
  <form class="suggest-actions" method="post" action="/tickets/${opts.ticketId}/feedback?token=${encodeURIComponent(opts.token)}">
    <input type="hidden" name="article" value="${escapeHtml(opts.article.id)}">
    <button class="btn" type="submit" name="outcome" value="solved">This fixed it</button>
    <button class="btn btn--ghost" type="submit" name="outcome" value="unresolved">This did not help</button>
  </form>
  <p class="hint">Either way a person can still pick this up. Saying it did not
  help tells us the suggestion was wrong, which is worth knowing.</p>
</div>`;
}

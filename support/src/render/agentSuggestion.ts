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

/** Markdown-ish article body to HTML: numbered steps and paragraphs only. */
function renderSteps(steps: string): string {
  const blocks = steps.split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const numbered = lines.every((l) => /^\d+\.\s/.test(l));
      if (numbered && lines.length > 0) {
        const items = lines.map((l) => `<li>${escapeHtml(l.replace(/^\d+\.\s*/, ''))}</li>`).join('');
        return `<ol>${items}</ol>`;
      }
      return `<p>${escapeHtml(lines.join(' '))}</p>`;
    })
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
